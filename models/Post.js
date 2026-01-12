const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Computer', 'IT', 'Mechanical', 'Civil', 'Electronics', 'Electrical', 'General']
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  commentCount: {
    type: Number,
    default: 0
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  embedding: {
    type: [Number],
    default: [],
    select: false // Don't include by default in queries for performance
  },
  // AI-generated fields
  summary: {
    type: String,
    default: ''
  },
  sentiment: {
    score: { type: Number, default: 0 },      // -1 (negative) to 1 (positive)
    label: { type: String, default: 'neutral' } // positive, neutral, negative
  },
  tags: {
    type: [String],
    default: []
  },
  postType: {
    type: String,
    enum: ['question', 'discussion', 'announcement'],
    default: 'discussion'
  }
}, {
  timestamps: true
});


const Post = mongoose.model('Post', postSchema);
module.exports = Post;  
