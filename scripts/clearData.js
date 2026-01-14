require('dotenv').config();
const mongoose = require('mongoose');

async function clearData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all posts
        const postsResult = await mongoose.connection.db.collection('posts').deleteMany({});
        console.log(`Deleted ${postsResult.deletedCount} posts`);

        // Delete all comments
        const commentsResult = await mongoose.connection.db.collection('comments').deleteMany({});
        console.log(`Deleted ${commentsResult.deletedCount} comments`);

        // Delete all notifications
        const notificationsResult = await mongoose.connection.db.collection('notifications').deleteMany({});
        console.log(`Deleted ${notificationsResult.deletedCount} notifications`);

        console.log('\n✅ All posts, comments, and notifications deleted!');
        console.log('You can now add fresh content for UI testing.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

clearData();
