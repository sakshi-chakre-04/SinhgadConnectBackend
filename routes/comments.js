const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/comments/post/:postId
// @desc    Get all comments for a specific post
// @access  Public
router.get('/post/:postId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'createdAt'; // createdAt, upvotes
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Check if post exists
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    if (sortBy === 'upvotes') {
      sortObj = { 'upvotes': sortOrder, 'createdAt': -1 };
    } else {
      sortObj = { [sortBy]: sortOrder };
    }

    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name department year')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const totalComments = await Comment.countDocuments({ post: req.params.postId });
    const totalPages = Math.ceil(totalComments / limit);

    // Add vote counts to each comment
    const commentsWithCounts = comments.map(comment => ({
      ...comment.toObject(),
      upvoteCount: comment.upvotes.length,
      downvoteCount: comment.downvotes.length,
      netVotes: comment.upvotes.length - comment.downvotes.length
    }));

    res.json({
      success: true,
      comments: commentsWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/comments/:id
// @desc    Get single comment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('author', 'name department year')
      .populate('post', 'title');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const commentWithCounts = {
      ...comment.toObject(),
      upvoteCount: comment.upvotes.length,
      downvoteCount: comment.downvotes.length,
      netVotes: comment.upvotes.length - comment.downvotes.length
    };

    res.json({
      success: true,
      comment: commentWithCounts
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    console.log('=== COMMENT CREATION REQUEST ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('User:', req.user);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { content, postId } = req.body;
    
    if (!content || !postId) {
      const errorDetails = { 
        message: 'Missing required fields',
        required: ['content', 'postId'],
        received: { 
          content: { 
            exists: !!content, 
            type: typeof content,
            value: content 
          },
          postId: { 
            exists: !!postId, 
            type: typeof postId,
            value: postId 
          }
        }
      };
      
      console.error('Validation error:', errorDetails);
      return res.status(400).json(errorDetails);
    }

    // Find the post and verify it exists
    const post = await Post.findById(postId).populate('author', 'id');
    if (!post) {
      console.error(`Post not found with ID: ${postId}`);
      return res.status(404).json({ message: 'Post not found' });
    }
    
    console.log('Found post:', {
      id: post._id,
      title: post.title,
      commentsCount: post.comments.length
    });

    const comment = new Comment({
      content,
      author: req.user.id,
      post: postId
    });

    const savedComment = await comment.save();
    
    // Populate author details for the response
    await savedComment.populate('author', 'name department year');
    
    // Add comment to post's comments array and update comment count
    try {
      post.comments.push(savedComment._id);
      post.commentCount = post.comments.length;
      await post.save();
      console.log('Updated post with new comment:', {
        postId: post._id,
        commentId: savedComment._id,
        newCommentCount: post.commentCount
      });
    } catch (postSaveError) {
      console.error('Error updating post with new comment:', postSaveError);
      // Attempt to rollback the comment creation
      await Comment.findByIdAndDelete(savedComment._id);
      return res.status(500).json({ 
        message: 'Error updating post with new comment',
        error: postSaveError.message 
      });
    }

    // Create notification for the post author if it's not the same as the commenter
    if (post.author._id.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: post.author._id,
        sender: req.user.id,
        type: 'comment',
        post: postId,
        content: `commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
      });
      await notification.save();
    }

    // Find mentions in the comment content
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let mentionMatch;
    const mentionedUsernames = new Set();
    
    while ((mentionMatch = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.add(mentionMatch[1]);
    }
    
    // Get the updated post with the latest comment count
    const updatedPost = await Post.findById(postId).select('commentCount');
    const commentCount = updatedPost?.commentCount || 0;
    
    console.log('Final comment count after update:', commentCount);
    
    // Prepare the response with the created comment and updated count
    const response = {
      ...savedComment._doc,
      author: {
        id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar
      },
      commentCount // Include the updated comment count in the response
    };

    // Create notifications for mentioned users
    if (mentionedUsernames.size > 0) {
      // In a real app, you would look up users by username and create notifications
      // This is a simplified version
      for (const username of mentionedUsernames) {
        if (username !== req.user.username) { // Don't notify if user mentioned themselves
          // In a real app, you would look up the user by username and create a notification
          // For now, we'll just log it
          console.log(`Mentioned user: ${username}`);
        }
      }
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        ...savedComment.toObject(),
        upvoteCount: 0,
        downvoteCount: 0,
        netVotes: 0
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private (Author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.content = content;
    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate('author', 'name department year')
      .populate('post', 'title');

    res.json({
      success: true,
      comment: {
        ...updatedComment.toObject(),
        upvoteCount: updatedComment.upvotes.length,
        downvoteCount: updatedComment.downvotes.length,
        netVotes: updatedComment.upvotes.length - updatedComment.downvotes.length
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private (Author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    const postId = comment.post;

    // Delete the comment
    await Comment.findByIdAndDelete(req.params.id);

    // Update post comment count
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentCount: -1 }
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/comments/:id/vote
// @desc    Upvote or downvote a comment
// @access  Private
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote', 'downvote', or 'remove'
    const commentId = req.params.id;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Remove user from both arrays first
    comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId.toString());
    comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId.toString());

    // Add user to appropriate array based on vote type
    if (voteType === 'upvote') {
      comment.upvotes.push(userId);
    } else if (voteType === 'downvote') {
      comment.downvotes.push(userId);
    }
    // If voteType is 'remove', user is just removed from both arrays

    await comment.save();

    const updatedComment = await Comment.findById(commentId)
      .populate('author', 'name department year')
      .populate('post', 'title');

    res.json({
      success: true,
      comment: {
        ...updatedComment.toObject(),
        upvoteCount: updatedComment.upvotes.length,
        downvoteCount: updatedComment.downvotes.length,
        netVotes: updatedComment.upvotes.length - updatedComment.downvotes.length,
        userVote: voteType === 'remove' ? null : voteType
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(400).json({ message: error.message });
  }
});

// @route   GET /api/comments/:id/vote-status
// @desc    Get user's vote status for a comment
// @access  Private
router.get('/:id/vote-status', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    let userVote = null;

    if (comment.upvotes.includes(userId)) {
      userVote = 'upvote';
    } else if (comment.downvotes.includes(userId)) {
      userVote = 'downvote';
    }

    res.json({
      success: true,
      userVote,
      upvoteCount: comment.upvotes.length,
      downvoteCount: comment.downvotes.length,
      netVotes: comment.upvotes.length - comment.downvotes.length
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
