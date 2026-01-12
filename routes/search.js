const express = require('express');
const Post = require('../models/Post');
const { generateEmbedding, cosineSimilarity } = require('../services/geminiService');

const router = express.Router();

// Helper to get vote counts
const getVoteCounts = (post) => ({
    upvoteCount: post.upvotes?.length || 0,
    downvoteCount: post.downvotes?.length || 0,
    netVotes: (post.upvotes?.length || 0) - (post.downvotes?.length || 0),
});

// ------------------------------
// @route   GET /api/search
// @desc    Semantic search for posts
// @access  Public
// ------------------------------
router.get('/', async (req, res) => {
    try {
        const { q: query, limit = 10, department } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);

        // Build filter for department if specified
        const filter = { embedding: { $exists: true, $ne: [] } };
        if (department && department !== 'General') {
            filter.department = department;
        }

        // Fetch all posts with embeddings
        const posts = await Post.find(filter)
            .select('+embedding')
            .populate('author', 'name department year')
            .lean();

        if (posts.length === 0) {
            return res.json({
                success: true,
                query,
                results: [],
                message: 'No posts with embeddings found. Run the migration script to generate embeddings.'
            });
        }

        // Calculate similarity scores
        const scoredPosts = posts
            .filter(post => post.embedding && post.embedding.length > 0)
            .map(post => ({
                ...post,
                similarity: cosineSimilarity(queryEmbedding, post.embedding),
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, parseInt(limit));

        // Remove embedding from response and add vote counts
        const results = scoredPosts.map(({ embedding, ...post }) => ({
            ...post,
            ...getVoteCounts(post),
            similarity: Math.round(post.similarity * 100) / 100, // Round to 2 decimal places
        }));

        res.json({
            success: true,
            query,
            resultsCount: results.length,
            results,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
});

module.exports = router;
