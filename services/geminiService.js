const { GoogleGenAI } = require('@google/genai');

// Initialize the Gemini client - auto-reads GEMINI_API_KEY from env
const ai = new GoogleGenAI({});

/**
 * Generate an embedding vector for the given text using Gemini
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<number[]>} - embedding vector
 */
async function generateEmbedding(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Text cannot be empty');
        }

        // Use gemini-embedding-001 model for embeddings
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text,
        });

        // Handle different response structures
        if (response.embeddings && response.embeddings.length > 0) {
            return response.embeddings[0].values;
        }
        if (response.embedding && response.embedding.values) {
            return response.embedding.values;
        }

        // Debug: log the response structure
        console.log('Embedding response:', JSON.stringify(response, null, 2));
        throw new Error('Unexpected response structure');
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw error;
    }
}

/**
 * Generate embedding for a post (title + content)
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @returns {Promise<number[]>} - 768-dimensional embedding vector
 */
async function generatePostEmbedding(title, content) {
    const text = `${title}\n\n${content}`;
    return generateEmbedding(text);
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

/**
 * Generate a concise summary of the post content
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @returns {Promise<string>} - Summary (max 2 sentences)
 */
async function generateSummary(title, content) {
    try {
        if (!content || content.trim().length < 50) {
            // Content too short for summarization
            return content.trim();
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: `Summarize this post in 1-2 concise sentences (max 150 characters). Focus on the main point.

Title: ${title}
Content: ${content}

Summary:`,
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating summary:', error.message);
        // Return truncated content as fallback
        return content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }
}

/**
 * Analyze the sentiment of post content
 * @param {string} content - Post content
 * @returns {Promise<{score: number, label: string}>} - Sentiment score (-1 to 1) and label
 */
async function analyzeSentiment(content) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: `Analyze the sentiment of this text. Respond with ONLY a JSON object with "score" (number from -1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive) and "label" (one of: "positive", "neutral", "negative").

Text: ${content}

JSON:`,
        });

        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { score: 0, label: 'neutral' };
    } catch (error) {
        console.error('Error analyzing sentiment:', error.message);
        return { score: 0, label: 'neutral' };
    }
}

/**
 * Generate relevant tags for a post
 * @param {string} title - Post title
 * @param {string} content - Post content
 * @returns {Promise<string[]>} - Array of tags (max 5)
 */
async function generateTags(title, content) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: `Generate 3-5 relevant tags for this college community post. Tags should be lowercase, single words or short phrases. Respond with ONLY a JSON array of strings.

Title: ${title}
Content: ${content}

Tags:`,
        });

        const jsonMatch = response.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const tags = JSON.parse(jsonMatch[0]);
            return tags.slice(0, 5).map(tag => tag.toLowerCase().trim());
        }
        return [];
    } catch (error) {
        console.error('Error generating tags:', error.message);
        return [];
    }
}

module.exports = {
    generateEmbedding,
    generatePostEmbedding,
    cosineSimilarity,
    generateSummary,
    analyzeSentiment,
    generateTags,
};
