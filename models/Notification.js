const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'reply', 'mention'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: false
  },
  read: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Index for faster querying
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });//creates index 1 for ascending and -1 for descending

module.exports = mongoose.model('Notification', notificationSchema);
