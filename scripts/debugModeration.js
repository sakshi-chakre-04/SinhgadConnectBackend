require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({});

async function test() {
    console.log('Testing direct API call...\n');

    const text = 'fuck you';

    const prompt = `You are a strict content moderator. Is this content appropriate for a college platform?
Content: "${text}"
Respond with JSON: {"isSafe": true/false, "reason": "explanation"}`;

    try {
        const response = await ai.models.generateContent({
            model: 'models/gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('Text:', response.text);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
    }
}

test();
