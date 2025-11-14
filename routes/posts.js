const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// ------------------------------
// Helper functions
// ------------------------------
const AUTHOR_FIELDS = 'name department year';

const getVoteCounts = (post) => ({
  upvoteCount: post.upvotes.length,
  downvoteCount: post.downvotes.length,
  netVotes: post.upvotes.length - post.downvotes.length,
});

const handleCastError = (error, res, message = 'Post not found') => {
  if (error.name === 'CastError') {
    return res.status(404).json({ message });
  }
};

// ------------------------------
// @route   GET /api/posts
// @desc    Get all posts with pagination and filtering
// @access  Public
// ------------------------------
router.get('/', async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const department = req.query.department;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};
    if (department && department !== 'General') filter.department = department;

    const skip = (page - 1) * limit;

    const sortObj =
      sortBy === 'upvotes'
        ? { upvotes: sortOrder, createdAt: -1 }
        : sortBy === 'comments'
        ? { commentCount: sortOrder, createdAt: -1 }
        : { [sortBy]: sortOrder };

    const posts = await Post.find(filter)
      .populate('author', AUTHOR_FIELDS)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    const postsWithCounts = posts.map((post) => ({
      ...post.toObject(),
      ...getVoteCounts(post),
    }));

    res.json({
      success: true,
      posts: postsWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ------------------------------
// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
// ------------------------------
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.json({
      success: true,
      post: { ...post.toObject(), ...getVoteCounts(post) },
    });
  } catch (error) {
    handleCastError(error, res);
  }
});

// ------------------------------
// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
// ------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, department } = req.body;
    if (!title || !content || !department) {
      return res.status(400).json({ message: 'Title, content, and department are required' });
    }

    const post = await Post.create({
      title,
      content,
      department,
      author: req.user._id,
    });

    const populatedPost = await Post.findById(post._id).populate('author', AUTHOR_FIELDS);

    res.status(201).json({
      success: true,
      post: { ...populatedPost.toObject(), ...getVoteCounts(post) },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ------------------------------
// @route   PUT /api/posts/:id
// @desc    Update a post (Author only)
// @access  Private
// ------------------------------
router.put('/:id', auth, async (req, res) => { //not used yet
  try {
    const { title, content, department } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (department) post.department = department;

    await post.save();

    const updatedPost = await Post.findById(post._id).populate('author', AUTHOR_FIELDS);
    res.json({
      success: true,
      post: { ...updatedPost.toObject(), ...getVoteCounts(updatedPost) },
    });
  } catch (error) {
    handleCastError(error, res);
  }
});

// ------------------------------
// @route   DELETE /api/posts/:id
// @desc    Delete a post (Author only)
// @access  Private
// ------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({ success: true, message: 'Post and associated comments deleted successfully' });
  } catch (error) {
    handleCastError(error, res);
  }
});

// ------------------------------
// @route   POST /api/posts/:id/vote
// @desc    Vote on a post (upvote/downvote/remove)
// @access  Private
// ------------------------------
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId).populate('author', 'id');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot vote on your own post' });
    }

    const hasUpvoted = post.upvotes.includes(userId);
    const hasDownvoted = post.downvotes.includes(userId);
    let message = '';

    if (voteType === 'upvote') {
      if (hasUpvoted) {
        post.upvotes.pull(userId);
        message = 'Upvote removed';
      } else {
        post.upvotes.addToSet(userId);
        post.downvotes.pull(userId);
        message = 'Post upvoted';

        const existingNotification = await Notification.findOne({
          recipient: post.author._id,
          sender: userId,
          type: 'like',
          post: postId,
        });
        if (!existingNotification) {
          await Notification.create({
            recipient: post.author._id,
            sender: userId,
            type: 'like',
            post: postId,
            content: 'liked your post',
          });
        }
      }
    } else if (voteType === 'downvote') {
      if (hasDownvoted) {
        post.downvotes.pull(userId);
        message = 'Downvote removed';
      } else {
        post.downvotes.addToSet(userId);
        post.upvotes.pull(userId);
        message = 'Post downvoted';
      }
    } else if (voteType === 'remove') {
      post.upvotes.pull(userId);
      post.downvotes.pull(userId);
      message = 'Vote removed';
    } else {
      return res.status(400).json({ message: 'Invalid vote type' });
    }

    await post.save();
    await post.populate('author', AUTHOR_FIELDS);

    res.json({
      message,
      post: { ...post.toObject(), ...getVoteCounts(post) },
    });
  } catch (error) {
    console.error('Error voting on post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ------------------------------
// @route   GET /api/posts/:id/vote-status
// @desc    Get user's vote status for a post
// @access  Private
// ------------------------------
router.get('/:id/vote-status', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id.toString();
    let userVote = null;

    if (post.upvotes.includes(userId)) userVote = 'upvote';
    else if (post.downvotes.includes(userId)) userVote = 'downvote';

    res.json({
      success: true,
      userVote,
      ...getVoteCounts(post),
    });
  } catch (error) {
    handleCastError(error, res);
  }
});

module.exports = router;
