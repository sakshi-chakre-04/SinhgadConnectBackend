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

module.exports = {
    generateEmbedding,
    generatePostEmbedding,
    cosineSimilarity,
};
