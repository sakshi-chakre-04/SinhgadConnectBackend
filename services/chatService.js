const Post = require('../models/Post');
const { generateEmbedding, cosineSimilarity } = require('./geminiService');
const { GoogleGenAI } = require('@google/genai');

/**
 * Smart hybrid prompt - AI decides when to use general knowledge
 */
const SMART_PROMPT = `You are a helpful AI assistant for SinhgadConnect, a college community platform.

INSTRUCTIONS:
1. First, try to answer the question using ONLY the provided community posts context.
2. If the answer IS in the context, answer directly from the posts.
3. If the answer is NOT in the context, you MUST:
   - Start your response with: "📌 I couldn't find this in our community posts, but here's what I know:"
   - Then provide helpful general information about the topic.

Be conversational, helpful, and concise. Format your response with markdown if helpful.`;

/**
 * Build readable context from posts for the AI
 * @param {Array} posts - Array of post objects
 * @returns {string} - Formatted context string
 */
function buildContextFromPosts(posts) {
    if (!posts || posts.length === 0) {
        return "No relevant posts found in the community.";
    }

    return posts.map((post, index) => {
        const date = new Date(post.createdAt).toLocaleDateString();
        return `[Post ${index + 1}] "${post.title}" (${date})
${post.content}
---`;
    }).join('\n\n');
}

/**
 * Search for posts similar to the question using vector similarity
 * @param {string} question - User's question
 * @param {number} limit - Number of posts to retrieve
 * @returns {Promise<Array>} - Array of relevant posts
 */
async function retrieveRelevantPosts(question, limit = 5) {
    try {
        const questionEmbedding = await generateEmbedding(question);

        const posts = await Post.find({ embedding: { $exists: true, $ne: [] } })
            .select('title content createdAt author embedding')
            .populate('author', 'name')
            .lean();

        if (posts.length === 0) {
            return [];
        }

        const postsWithScores = posts.map(post => ({
            ...post,
            similarity: cosineSimilarity(questionEmbedding, post.embedding)
        }));

        postsWithScores.sort((a, b) => b.similarity - a.similarity);

        // Return top posts (AI will decide relevance)
        return postsWithScores.slice(0, limit);
    } catch (error) {
        console.error('Error retrieving posts:', error.message);
        return [];
    }
}

/**
 * Generate an answer using smart RAG - AI decides when to use general knowledge
 * @param {string} question - User's question
 * @returns {Promise<{answer: string, sources: Array, mode: string}>}
 */
async function generateRAGAnswer(question) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Step 1: Retrieve top posts (AI will judge relevance)
        const relevantPosts = await retrieveRelevantPosts(question);

        // Step 2: Build context from posts
        const context = buildContextFromPosts(relevantPosts);

        // Step 3: Build prompt with smart instructions
        const prompt = `${SMART_PROMPT}

Context from community posts:
${context}

User Question: ${question}

Answer:`;

        // Step 4: Generate answer with Gemini
        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ]
        });

        const answer = response.text.trim();

        // Detect if AI used general knowledge (by checking for the indicator)
        const isGeneral = answer.includes("📌 I couldn't find this");
        const mode = isGeneral ? 'general' : 'community';

        // Build sources based on mode
        const sources = isGeneral
            ? [{ title: 'General Knowledge', author: 'AI Assistant', similarity: 0 }]
            : relevantPosts.map(post => ({
                id: post._id,
                title: post.title,
                author: post.author?.name || 'Unknown',
                similarity: Math.round(post.similarity * 100)
            }));

        return {
            answer,
            sources,
            mode,
            postsUsed: relevantPosts.length
        };
    } catch (error) {
        console.error('Error generating RAG answer:', error.message);
        throw error;
    }
}

module.exports = {
    generateRAGAnswer,
    retrieveRelevantPosts,
    buildContextFromPosts
};
