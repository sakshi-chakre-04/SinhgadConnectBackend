/**
 * Script to delete all posts, comments, and notifications
 * Run with: node -r dotenv/config scripts/clearAllPosts.js
 */

const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

async function clearAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get counts before deletion
        const postCount = await Post.countDocuments();
        const commentCount = await Comment.countDocuments();
        const notificationCount = await Notification.countDocuments();

        console.log('📊 Current counts:');
        console.log(`   Posts: ${postCount}`);
        console.log(`   Comments: ${commentCount}`);
        console.log(`   Notifications: ${notificationCount}\n`);

        // Delete all
        console.log('🗑️  Deleting all data...');

        const deletedPosts = await Post.deleteMany({});
        console.log(`   ✅ Deleted ${deletedPosts.deletedCount} posts`);

        const deletedComments = await Comment.deleteMany({});
        console.log(`   ✅ Deleted ${deletedComments.deletedCount} comments`);

        const deletedNotifications = await Notification.deleteMany({});
        console.log(`   ✅ Deleted ${deletedNotifications.deletedCount} notifications`);

        console.log('\n🎉 All posts cleared! You can now create fresh posts with AI features.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

clearAll();
