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

        // Use text-embedding-004 model for embeddings
        const response = await ai.models.embedContent({
            model: 'models/text-embedding-004',
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
            model: 'models/gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `Summarize this post in 1-2 concise sentences (max 150 characters). Focus on the main point.\n\nTitle: ${title}\nContent: ${content}\n\nSummary:` }
                    ]
                }
            ]
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
            model: 'models/gemini-2.5-flash',
            config: { responseMimeType: 'application/json' },
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `Analyze the sentiment of this text. Respond with ONLY a JSON object with "score" (number from -1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive) and "label" (one of: "positive", "neutral", "negative").\n\nText: ${content}` }
                    ]
                }
            ]
        });

        const result = JSON.parse(response.text);
        return result || { score: 0, label: 'neutral' };
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
            model: 'models/gemini-2.5-flash',
            config: { responseMimeType: 'application/json' },
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `Generate 3-5 relevant tags for this college community post. Tags should be lowercase, single words or short phrases. Respond with ONLY a JSON array of strings.\n\nTitle: ${title}\nContent: ${content}` }
                    ]
                }
            ]
        });

        console.log("Raw Tags Response:", response.text); // Debug log
        try {
            const tags = JSON.parse(response.text);
            if (Array.isArray(tags)) {
                return tags.slice(0, 5).map(tag => tag.toLowerCase().trim());
            }
        } catch (e) {
            console.log("Tag Parsing Error:", e.message);
        }
        return [];
    } catch (error) {
        console.error('Error generating tags:', error.message);
        return [];
    }
}

/**
 * Moderate content for inappropriate material
 * Uses keyword filter + AI for comprehensive moderation
 * @param {string} text - Content to moderate (title, content, or comment)
 * @returns {Promise<{isSafe: boolean, reason: string}>}
 */
async function moderateContent(text) {
    try {
        if (!text || text.trim().length === 0) {
            return { isSafe: true, reason: 'Empty content' };
        }

        const lowerText = text.toLowerCase();

        // First-pass: Keyword-based filter (always works, no API needed)
        const profanityWords = [
            'fuck', 'shit', 'bitch', 'ass', 'damn', 'crap', 'bastard',
            'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
            'retard', 'cunt', 'motherfucker', 'bullshit', 'asshole'
        ];

        const hateSpeechWords = [
            'kill yourself', 'kys', 'die', 'murder', 'rape', 'terrorist',
            'kill you', 'i will kill', 'gonna kill', 'going to kill',
            'i\'ll kill', 'beat you up', 'hurt you', 'attack you',
            'shoot you', 'stab you', 'bomb', 'threat', 'hang yourself'
        ];

        // Check profanity
        for (const word of profanityWords) {
            if (lowerText.includes(word)) {
                return { isSafe: false, reason: 'Contains inappropriate language' };
            }
        }

        // Check hate speech
        for (const phrase of hateSpeechWords) {
            if (lowerText.includes(phrase)) {
                return { isSafe: false, reason: 'Contains harmful or threatening content' };
            }
        }

        // Second-pass: AI moderation for nuanced cases (optional, may fail due to rate limits)
        try {
            const prompt = `Is this content appropriate for a college platform? Respond with JSON {"isSafe": true/false, "reason": "brief reason"}
Content: "${text}"`;

            const response = await ai.models.generateContent({
                model: 'models/gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text);
            if (result.isSafe === false) {
                return { isSafe: false, reason: result.reason || 'Content flagged by AI' };
            }
        } catch (aiError) {
            // AI check failed, but keyword check passed - allow content
            console.log('⚠️ AI moderation failed:', aiError.message);
            console.log('   Falling back to keyword filter only');
        }

        return { isSafe: true, reason: 'Content is appropriate' };
    } catch (error) {
        console.error('Error in moderation:', error.message);
        return { isSafe: false, reason: 'Moderation error. Please try again.' };
    }
}

module.exports = {
    generateEmbedding,
    generatePostEmbedding,
    cosineSimilarity,
    generateSummary,
    analyzeSentiment,
    generateTags,
    moderateContent,
};

