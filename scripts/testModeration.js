require('dotenv').config();
const { moderateContent } = require('../services/geminiService');

async function test() {
    console.log('Testing moderation...\n');

    const testCases = [
        'fuck you',
        'This is a normal post about programming',
        'I hate everyone here',
        'Can someone help me with my assignment?',
        'You are an idiot and should die'
    ];

    for (const text of testCases) {
        console.log(`\nTesting: "${text}"`);
        const result = await moderateContent(text);
        console.log(`Result: ${JSON.stringify(result)}`);
    }
}

test().catch(console.error);
