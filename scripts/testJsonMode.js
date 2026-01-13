require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function verifyJsonMode() {
    process.env.GEMINI_MODEL = 'models/gemini-2.5-flash';
    console.log("🔍 Testing JSON Mode with 'models/gemini-2.5-flash'...\n");

    try {
        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            config: { responseMimeType: 'application/json' }, // New SDK syntax might be 'config' or 'generationConfig'
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `Generate 3 tags for a post about 'Hackathon'. Return a JSON array.` }
                    ]
                }
            ]
        });
        console.log("✅ Raw Response:", response.text);
        console.log("✅ Parsed:", JSON.parse(response.text));
    } catch (e) {
        console.log("❌ JSON Mode Failed:", e.message || e);
    }
}

verifyJsonMode();
