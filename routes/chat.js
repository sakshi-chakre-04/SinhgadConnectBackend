const express = require('express');
const { generateRAGAnswer } = require('../services/chatService');

const router = express.Router();

// ------------------------------
// @route   POST /api/chat
// @desc    Get AI response using RAG
// @access  Public (can be made private with auth middleware)
// ------------------------------
router.post('/', async (req, res) => {
    try {
        const { message, history } = req.body;

        // Validate input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Message is required and must be a string'
            });
        }

        // Trim and limit message length
        const trimmedMessage = message.trim().substring(0, 500);

        if (trimmedMessage.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Generate RAG answer
        const result = await generateRAGAnswer(trimmedMessage, history || []);

        res.json({
            success: true,
            answer: result.answer,
            sources: result.sources,
            postsUsed: result.postsUsed
        });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate response. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ------------------------------
// @route   GET /api/chat/health
// @desc    Health check for chat service
// @access  Public
// ------------------------------
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Chat service is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
