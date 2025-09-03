const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/posts/department/:department
// @desc    Get posts by department with pagination and sorting
// @access  Public
router.get('/department/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = { department };

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    if (sortBy === 'upvotes') {
      sortObj = { 'upvotes': sortOrder, 'createdAt': -1 };
    } else if (sortBy === 'comments') {
      sortObj = { 'commentCount': sortOrder, 'createdAt': -1 };
    } else {
      sortObj = { [sortBy]: sortOrder };
    }

    const posts = await Post.find(filter)
      .populate('author', 'name department year')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    // Calculate upvote/downvote counts for each post
    const postsWithCounts = posts.map(post => ({
      ...post.toObject(),
      upvoteCount: post.upvotes.length,
      downvoteCount: post.downvotes.length,
      userVote: post.upvotes.includes(req.user?.id) ? 1 : (post.downvotes.includes(req.user?.id) ? -1 : 0)
    }));

    res.json({
      posts: postsWithCounts,
      currentPage: page,
      totalPages,
      totalPosts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts
// @desc    Get all posts with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const department = req.query.department;
    const sortBy = req.query.sortBy || 'createdAt'; // createdAt, upvotes, comments
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};
    if (department && department !== 'General') {
      filter.department = department;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    if (sortBy === 'upvotes') {
      sortObj = { 'upvotes': sortOrder, 'createdAt': -1 };
    } else if (sortBy === 'comments') {
      sortObj = { 'commentCount': sortOrder, 'createdAt': -1 };
    } else {
      sortObj = { [sortBy]: sortOrder };
    }

    const posts = await Post.find(filter)
      .populate('author', 'name department year')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    // Calculate upvote/downvote counts for each post
    const postsWithCounts = posts.map(post => ({
      ...post.toObject(),
      upvoteCount: post.upvotes.length,
      downvoteCount: post.downvotes.length,
      netVotes: post.upvotes.length - post.downvotes.length
    }));

    res.json({
      success: true,
      posts: postsWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name department year');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postWithCounts = {
      ...post.toObject(),
      upvoteCount: post.upvotes.length,
      downvoteCount: post.downvotes.length,
      netVotes: post.upvotes.length - post.downvotes.length
    };

    res.json({
      success: true,
      post: postWithCounts
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, department } = req.body;

    // Validation
    if (!title || !content || !department) {
      return res.status(400).json({ 
        message: 'Title, content, and department are required' 
      });
    }

    const post = await Post.create({
      title,
      content,
      department,
      author: req.user._id
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name department year');

    res.status(201).json({
      success: true,
      post: {
        ...populatedPost.toObject(),
        upvoteCount: 0,
        downvoteCount: 0,
        netVotes: 0
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private (Author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, department } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (department) post.department = department;

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'name department year');

    res.json({
      success: true,
      post: {
        ...updatedPost.toObject(),
        upvoteCount: updatedPost.upvotes.length,
        downvoteCount: updatedPost.downvotes.length,
        netVotes: updatedPost.upvotes.length - updatedPost.downvotes.length
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private (Author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete all comments associated with this post
    await Comment.deleteMany({ post: req.params.id });

    // Delete the post
    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post and associated comments deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/posts/:id/vote
// @desc    Upvote or downvote a post
// @access  Private
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote', 'downvote', or 'remove'
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove user from both arrays first
    post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());
    post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());

    // Add user to appropriate array based on vote type
    if (voteType === 'upvote') {
      post.upvotes.push(userId);
    } else if (voteType === 'downvote') {
      post.downvotes.push(userId);
    }
    // If voteType is 'remove', user is just removed from both arrays

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate('author', 'name department year');

    res.json({
      success: true,
      post: {
        ...updatedPost.toObject(),
        upvoteCount: updatedPost.upvotes.length,
        downvoteCount: updatedPost.downvotes.length,
        netVotes: updatedPost.upvotes.length - updatedPost.downvotes.length,
        userVote: voteType === 'remove' ? null : voteType
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @route   GET /api/posts/:id/vote-status
// @desc    Get user's vote status for a post
// @access  Private
router.get('/:id/vote-status', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    let userVote = null;

    if (post.upvotes.includes(userId)) {
      userVote = 'upvote';
    } else if (post.downvotes.includes(userId)) {
      userVote = 'downvote';
    }

    res.json({
      success: true,
      userVote,
      upvoteCount: post.upvotes.length,
      downvoteCount: post.downvotes.length,
      netVotes: post.upvotes.length - post.downvotes.length
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
