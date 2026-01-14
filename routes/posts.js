const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const {
  generatePostEmbedding,
  generateSummary,
  analyzeSentiment,
  generateTags,
  moderateContent
} = require('../services/geminiService');
const { sendNotificationToUser } = require('../socket');

const router = express.Router();

// Milestone thresholds for upvote notifications
const UPVOTE_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

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
        ? { 'upvotes.length': sortOrder, createdAt: -1 }
        : { [sortBy]: sortOrder };

    const posts = await Post.find(filter)
      .populate('author', AUTHOR_FIELDS)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      success: true,
      posts: posts.map((post) => ({ ...post.toObject(), ...getVoteCounts(post) })),
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
// @route   GET /api/posts/user/:userId
// @desc    Get all posts by a specific user
// @access  Public
// ------------------------------
router.get('/user/:userId', async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.userId })
      .populate('author', AUTHOR_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ author: req.params.userId });
    const totalPages = Math.ceil(totalPosts / limit);

    // Calculate total upvotes received across all posts
    const allUserPosts = await Post.find({ author: req.params.userId });
    const totalUpvotes = allUserPosts.reduce((sum, post) => sum + post.upvotes.length, 0);

    res.json({
      success: true,
      posts: posts.map((post) => ({ ...post.toObject(), ...getVoteCounts(post) })),
      stats: {
        totalPosts,
        totalUpvotes
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
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
// @desc    Create a new post with AI-generated content
// @access  Private
// ------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, department, postType, attachments } = req.body;
    if (!title || !content || !department) {
      return res.status(400).json({ message: 'Title, content, and department are required' });
    }

    // 🛡️ AI Content Moderation - Check BEFORE publishing
    const moderation = await moderateContent(`${title}\n\n${content}`);
    if (!moderation.isSafe) {
      return res.status(400).json({
        message: 'Your post contains inappropriate content and cannot be published.',
        reason: moderation.reason,
        blocked: true
      });
    }

    // Generate AI content in parallel for speed
    const [embedding, summary, sentiment, tags] = await Promise.all([
      generatePostEmbedding(title, content).catch(err => {
        console.error('Embedding error:', err.message);
        return [];
      }),
      generateSummary(title, content).catch(err => {
        console.error('Summary error:', err.message);
        return content.substring(0, 150);
      }),
      analyzeSentiment(content).catch(err => {
        console.error('Sentiment error:', err.message);
        return { score: 0, label: 'neutral' };
      }),
      generateTags(title, content).catch(err => {
        console.error('Tags error:', err.message);
        return [];
      })
    ]);

    const post = await Post.create({
      title,
      content,
      department,
      postType: postType || 'discussion',
      author: req.user._id,
      attachments: attachments || [],
      embedding,
      summary,
      sentiment,
      tags,
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
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, department } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    const contentChanged = (title && title !== post.title) || (content && content !== post.content);

    if (title) post.title = title;
    if (content) post.content = content;
    if (department) post.department = department;

    // Regenerate embedding if content changed
    if (contentChanged) {
      try {
        post.embedding = await generatePostEmbedding(post.title, post.content);
      } catch (embeddingError) {
        console.error('Failed to regenerate embedding:', embeddingError.message);
      }
    }

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

        // Check for upvote milestones (5, 10, 25, 50, 100, etc.)
        const newUpvoteCount = post.upvotes.length;
        if (UPVOTE_MILESTONES.includes(newUpvoteCount)) {
          const notification = await Notification.create({
            recipient: post.author._id,
            sender: userId,
            type: 'milestone',
            post: postId,
            content: `🎉 Your post reached ${newUpvoteCount} upvotes!`,
          });

          // Populate and send via socket
          await notification.populate('sender', 'name');
          await notification.populate('post', 'title');
          sendNotificationToUser(post.author._id, notification);
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
