require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const {
    generatePostEmbedding,
    generateSummary,
    analyzeSentiment,
    generateTags
} = require('../services/geminiService');

// Sample posts data - realistic college community content
const samplePosts = [
    {
        title: "How to prepare for TCS NQT exam?",
        content: "I have TCS NQT exam coming up next month. Can seniors share their experience and preparation strategy? What topics should I focus on? Any recommended resources or mock tests?",
        postType: "question",
        department: "Computer"
    },
    {
        title: "Best laptop for engineering students under 60k?",
        content: "Looking to buy a new laptop for coding, CAD software, and general use. Should have good RAM and SSD. Any recommendations from fellow students who recently purchased one?",
        postType: "question",
        department: "Computer"
    },
    {
        title: "Workshop on Machine Learning - This Saturday!",
        content: "The Computer Society is organizing a hands-on workshop on Machine Learning using Python. Topics covered: NumPy, Pandas, Scikit-learn, and building your first ML model. Register by Friday!",
        postType: "announcement",
        department: "Computer",
        attachments: [
            {
                url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
                type: "image",
                filename: "ml_workshop_poster.jpg",
                size: 245000
            }
        ]
    },
    {
        title: "GATE 2025 Preparation Group",
        content: "Starting a GATE preparation group for CS students. We'll have weekly problem-solving sessions and doubt clearing. DM if interested. Let's crack GATE together!",
        postType: "discussion",
        department: "Computer"
    },
    {
        title: "Final Year Project Ideas - AI/ML Domain",
        content: "Looking for innovative project ideas in AI/ML domain. Already explored chatbots and image classification. Want something unique that solves a real problem. Any suggestions?",
        postType: "question",
        department: "Computer",
        attachments: [
            {
                url: "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg",
                type: "image",
                filename: "project_ideas_mindmap.png",
                size: 156000
            }
        ]
    },
    {
        title: "Placement Drive - Infosys (Pool Campus)",
        content: "Infosys is conducting pool campus drive next week. Eligible branches: CS, IT, E&TC. Package: 3.6 LPA + variable. Bring updated resume and ID proof. Reporting time: 9 AM sharp.",
        postType: "announcement",
        department: "General"
    },
    {
        title: "Data Structures Notes - Complete PDF",
        content: "Sharing my complete Data Structures notes covering Arrays, Linked Lists, Trees, Graphs, and Sorting algorithms. Includes diagrams and code examples in C++. Hope it helps!",
        postType: "resource",
        department: "Computer",
        attachments: [
            {
                url: "https://www.africau.edu/images/default/sample.pdf",
                type: "pdf",
                filename: "DS_Complete_Notes.pdf",
                size: 2500000
            }
        ]
    },
    {
        title: "How is the new curriculum change?",
        content: "They've updated the syllabus for 3rd year. Removed some old subjects and added Cloud Computing and DevOps. What do you all think? Is it better for placements?",
        postType: "discussion",
        department: "Computer"
    },
    {
        title: "Hackathon Team Needed - Smart India Hackathon",
        content: "Looking for 2 more team members for SIH 2025. We have 4 members (2 backend, 2 frontend). Need someone with ML/AI experience and one designer. Theme: Healthcare.",
        postType: "question",
        department: "Computer"
    },
    {
        title: "Internship Experience at Microsoft",
        content: "Just completed my 2-month internship at Microsoft IDC Hyderabad. Worked on Azure DevOps team. Amazing experience! Happy to answer questions about the interview process and work culture.",
        postType: "discussion",
        department: "Computer",
        attachments: [
            {
                url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
                type: "image",
                filename: "microsoft_office.jpg",
                size: 320000
            }
        ]
    },
    {
        title: "Electronics Lab Manual - Updated Version",
        content: "Uploading the updated Electronics lab manual with new experiments added this semester. Includes circuit diagrams and expected observations. Please verify with your faculty.",
        postType: "resource",
        department: "Electronics"
    },
    {
        title: "Best approach for DSA preparation?",
        content: "Should I follow Striver's SDE sheet or NeetCode 150? I have 3 months before placements start. Also, is LeetCode premium worth it? Any seniors who cracked FAANG please guide.",
        postType: "question",
        department: "Computer"
    },
    {
        title: "Cultural Fest Volunteers Needed!",
        content: "Sinhgad's annual cultural fest is around the corner! We need volunteers for event management, decoration, and technical support. Great opportunity to network and have fun!",
        postType: "announcement",
        department: "General"
    },
    {
        title: "Resume Template for Freshers",
        content: "Sharing an ATS-friendly resume template that helped me get shortlisted for 5+ companies. Clean, professional format. Customize it according to your profile.",
        postType: "resource",
        department: "General",
        attachments: [
            {
                url: "https://www.africau.edu/images/default/sample.pdf",
                type: "pdf",
                filename: "ATS_Resume_Template.pdf",
                size: 150000
            }
        ]
    },
    {
        title: "Doubts in Operating Systems - Deadlock",
        content: "Can someone explain the Banker's algorithm with a detailed example? I understand the concept but getting confused in the calculations. Exam is in 2 days!",
        postType: "question",
        department: "Computer"
    }
];

// Sample comments
const sampleComments = [
    "Great question! I had the same doubt.",
    "Thanks for sharing this resource, very helpful!",
    "I think Striver's sheet is great for beginners. Start with it.",
    "Check out freeCodeCamp's tutorials, they're amazing.",
    "I'm interested! DMing you now.",
    "This is exactly what I was looking for. Thanks!",
    "Can you share more details about the interview rounds?",
    "Good luck with your preparation! You've got this.",
    "The workshop was amazing, learned so much!",
    "I'd recommend focusing on aptitude first for TCS.",
    "LeetCode premium is worth it if you're targeting FAANG.",
    "Thanks for the notes, saved me hours of work!",
    "Anyone else facing issues with the registration link?",
    "Great initiative! Count me in for the study group.",
    "The syllabus change is definitely better for industry relevance."
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all users
        const users = await User.find({});
        if (users.length === 0) {
            console.log('❌ No users found. Please create users first.');
            process.exit(1);
        }
        console.log(`Found ${users.length} users\n`);

        // Create posts
        console.log('Creating posts with AI features...\n');
        const createdPosts = [];

        for (let i = 0; i < samplePosts.length; i++) {
            const postData = samplePosts[i];
            const author = users[i % users.length]; // Distribute across users

            console.log(`[${i + 1}/${samplePosts.length}] Creating: "${postData.title.substring(0, 40)}..."`);

            try {
                // Generate AI features
                const [embedding, summary, sentiment, tags] = await Promise.all([
                    generatePostEmbedding(postData.title, postData.content).catch(() => []),
                    generateSummary(postData.title, postData.content).catch(() => postData.content.substring(0, 100)),
                    analyzeSentiment(postData.content).catch(() => ({ score: 0, label: 'neutral' })),
                    generateTags(postData.title, postData.content).catch(() => [])
                ]);

                const post = await Post.create({
                    title: postData.title,
                    content: postData.content,
                    author: author._id,
                    department: postData.department,
                    postType: postData.postType,
                    attachments: postData.attachments || [],
                    embedding,
                    summary,
                    sentiment,
                    tags
                });

                createdPosts.push(post);
                console.log(`   ✓ Tags: ${tags.join(', ') || 'none'}`);
                console.log(`   ✓ Sentiment: ${sentiment.label}`);

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`   ✗ Error: ${error.message}`);
            }
        }

        console.log(`\n✅ Created ${createdPosts.length} posts\n`);

        // Create comments
        console.log('Creating comments...\n');
        let commentCount = 0;

        for (const post of createdPosts) {
            // Add 2-3 random comments per post
            const numComments = Math.floor(Math.random() * 2) + 2;

            for (let i = 0; i < numComments; i++) {
                const commenter = users[Math.floor(Math.random() * users.length)];
                const content = sampleComments[Math.floor(Math.random() * sampleComments.length)];

                try {
                    const comment = await Comment.create({
                        content,
                        author: commenter._id,
                        post: post._id
                    });

                    // Add comment to post
                    post.comments.push(comment._id);
                    post.commentCount = post.comments.length;
                    await post.save();

                    commentCount++;
                } catch (error) {
                    // Skip if error
                }
            }
        }

        console.log(`✅ Created ${commentCount} comments\n`);
        console.log('🎉 Database seeded successfully!');
        console.log('\nRefresh your frontend to see the new content.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedDatabase();
