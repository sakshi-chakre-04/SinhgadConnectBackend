/**
 * Generate embeddings for existing posts
 * Run this script to add embeddings to posts that don't have them.
 * 
 * Usage: node scripts/generateEmbeddings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const { generatePostEmbedding } = require('../services/geminiService');

const BATCH_SIZE = 5; // Process in small batches to avoid rate limits
const DELAY_MS = 1000; // Delay between batches (1 second)

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateEmbeddings() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find posts without embeddings
        const posts = await Post.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } }
            ]
        }).select('+embedding');

        console.log(`📋 Found ${posts.length} posts without embeddings`);

        if (posts.length === 0) {
            console.log('✨ All posts already have embeddings!');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Process in batches
        for (let i = 0; i < posts.length; i += BATCH_SIZE) {
            const batch = posts.slice(i, i + BATCH_SIZE);
            console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(posts.length / BATCH_SIZE)}`);

            for (const post of batch) {
                try {
                    console.log(`  📝 Generating embedding for: "${post.title.substring(0, 50)}..."`);

                    const embedding = await generatePostEmbedding(post.title, post.content);

                    await Post.updateOne(
                        { _id: post._id },
                        { $set: { embedding } }
                    );

                    successCount++;
                    console.log(`  ✅ Done (${embedding.length} dimensions)`);
                } catch (error) {
                    errorCount++;
                    console.error(`  ❌ Failed: ${error.message}`);
                }
            }

            // Delay between batches to avoid rate limits
            if (i + BATCH_SIZE < posts.length) {
                console.log(`  ⏳ Waiting ${DELAY_MS}ms before next batch...`);
                await sleep(DELAY_MS);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  ✅ Success: ${successCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log('🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
generateEmbeddings();
