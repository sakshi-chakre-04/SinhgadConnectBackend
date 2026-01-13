require('dotenv').config();
const { generateTags } = require('../services/geminiService');

async function debug() {
    console.log("🔍 Debugging generateTags...");
    const title = "TechTonic 2025: Annual Technical Symposium";
    const content = "Join us for the biggest hackathon of the year. Prizes worth 50k!";

    try {
        const tags = await generateTags(title, content);
        console.log("✅ Final Tags:", tags);
    } catch (e) {
        console.log("❌ Error:", e);
    }
}

debug();
