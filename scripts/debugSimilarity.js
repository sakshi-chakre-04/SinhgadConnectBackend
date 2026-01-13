require('dotenv').config();
const mongoose = require('mongoose');
const { generateEmbedding, cosineSimilarity } = require('../services/geminiService');
const Post = require('../models/Post');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);

    const question = "how to code in CPP";
    console.log(`Question: "${question}"\n`);

    const questionEmbedding = await generateEmbedding(question);
    console.log(`Embedding generated: ${questionEmbedding.length} dimensions\n`);

    const posts = await Post.find({ embedding: { $exists: true, $ne: [] } })
        .select('title embedding')
        .lean();

    console.log(`Found ${posts.length} posts with embeddings\n`);

    const postsWithScores = posts.map(post => ({
        title: post.title,
        similarity: cosineSimilarity(questionEmbedding, post.embedding)
    }));

    postsWithScores.sort((a, b) => b.similarity - a.similarity);

    console.log("Similarity scores:");
    postsWithScores.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title.substring(0, 40)}... - ${(p.similarity * 100).toFixed(1)}%`);
    });

    const topSim = postsWithScores[0]?.similarity || 0;
    console.log(`\nTop similarity: ${(topSim * 100).toFixed(1)}%`);
    console.log(`Threshold: 40%`);
    console.log(`Mode: ${topSim > 0.4 ? 'COMMUNITY' : 'GENERAL'}`);

    await mongoose.disconnect();
}

test();
