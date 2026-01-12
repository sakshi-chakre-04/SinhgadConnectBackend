/**
 * Migration Script: Add AI Content to Existing Posts
 * 
 * This script generates summary, sentiment, and tags for posts that don't have them.
 * Run with: node -r dotenv/config scripts/addAIContent.js
 */

const mongoose = require('mongoose');
const Post = require('../models/Post');
const { generateSummary, analyzeSentiment, generateTags } = require('../services/geminiService');

// Configuration
const BATCH_SIZE = 3; // Smaller batch due to more API calls per post
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds to respect rate limits

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processPost(post) {
    console.log(`  📝 Processing: "${post.title.substring(0, 50)}..."`);

    try {
        // Generate AI content in parallel
        const [summary, sentiment, tags] = await Promise.all([
            generateSummary(post.title, post.content),
            analyzeSentiment(post.content),
            generateTags(post.title, post.content)
        ]);

        // Update post
        await Post.findByIdAndUpdate(post._id, {
            summary,
            sentiment,
            tags
        });

        console.log(`    ✅ Done - Tags: [${tags.join(', ')}], Sentiment: ${sentiment.label}`);
        return { success: true };
    } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function migrate() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find posts without AI content
        const postsToProcess = await Post.find({
            $or: [
                { summary: { $exists: false } },
                { summary: '' },
                { tags: { $exists: false } },
                { tags: { $size: 0 } }
            ]
        }).select('title content');

        console.log(`📋 Found ${postsToProcess.length} posts needing AI content\n`);

        if (postsToProcess.length === 0) {
            console.log('🎉 All posts already have AI content!');
            return;
        }

        // Process in batches
        let successCount = 0;
        let errorCount = 0;
        const totalBatches = Math.ceil(postsToProcess.length / BATCH_SIZE);

        for (let i = 0; i < postsToProcess.length; i += BATCH_SIZE) {
            const batch = postsToProcess.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            console.log(`🔄 Processing batch ${batchNum}/${totalBatches}`);

            // Process batch sequentially to avoid rate limits
            for (const post of batch) {
                const result = await processPost(post);
                if (result.success) successCount++;
                else errorCount++;
            }

            // Delay before next batch
            if (i + BATCH_SIZE < postsToProcess.length) {
                console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
                await delay(DELAY_BETWEEN_BATCHES);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  ✅ Success: ${successCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log('🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run migration
migrate();
