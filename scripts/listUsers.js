require('dotenv').config();
const mongoose = require('mongoose');

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const users = await mongoose.connection.db.collection('users').find({}).toArray();

        console.log(`Found ${users.length} users:\n`);
        users.forEach((user, i) => {
            console.log(`${i + 1}. ${user.name} (${user.email}) - ${user.department}`);
            console.log(`   ID: ${user._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listUsers();
