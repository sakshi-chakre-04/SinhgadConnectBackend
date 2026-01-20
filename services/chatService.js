const Post = require('../models/Post');
const { generateEmbedding, cosineSimilarity } = require('./geminiService');
const { GoogleGenAI } = require('@google/genai');

/**
 * Professional student guidance prompt
 */
const SMART_PROMPT = `You are an AI academic and placement guidance assistant for SinhgadConnect, a college community platform.

RESPONSE FORMAT RULES:
1. Use proper Markdown headers (## for sections, ### for subsections)
2. Use bullet points (- or •) for lists
3. Keep tips short and actionable
4. DO NOT use conversational phrases like "Hey there", "I found", "Let me help", "Great question"
5. DO NOT use raw ** for bold - use proper Markdown formatting
6. Maintain a professional placement-guidance tone throughout

CONTENT INSTRUCTIONS:
1. First, check if the answer exists in the provided community posts context.
2. If the answer IS in the context:
   - Cite the information professionally
   - Use "According to community discussions..." or "Students have shared..."
3. If the answer is NOT in the context:
   - Start with: "📌 General Guidance"
   - Provide structured, helpful advice

EXAMPLE FORMAT:
## Topic Overview
Brief explanation here.

### Key Points
- Point 1
- Point 2

### Actionable Steps
1. First step
2. Second step

### Resources
- Relevant links or suggestions`;


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
 * @param {Array} history - Previous conversation history
 * @returns {Promise<{answer: string, sources: Array, mode: string}>}
 */
async function generateRAGAnswer(question, history = []) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Step 1: Retrieve top posts (AI will judge relevance)
        const relevantPosts = await retrieveRelevantPosts(question);

        // Step 2: Build context from posts
        const context = buildContextFromPosts(relevantPosts);

        // Step 3: Build system prompt with context
        const systemPrompt = `${SMART_PROMPT}

Context from community posts:
${context}`;

        // Step 4: Build conversation contents with history
        const contents = [];

        // Add system instruction as first user message if no history
        if (history.length === 0) {
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt + '\n\nUser Question: ' + question }]
            });
        } else {
            // Add system prompt as first message
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'Understood. I will provide helpful, structured responses based on the community posts and my knowledge.' }]
            });

            // Add conversation history
            for (const msg of history) {
                if (msg.role && msg.parts && msg.parts.length > 0) {
                    contents.push({
                        role: msg.role === 'model' ? 'model' : 'user',
                        parts: [{ text: msg.parts[0].text || '' }]
                    });
                }
            }

            // Add current question
            contents.push({
                role: 'user',
                parts: [{ text: question }]
            });
        }

        // Step 5: Generate answer with Gemini
        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: contents
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
