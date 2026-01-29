const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * GET /api/leaderboard
 * Get leaderboard ranking users by total upvotes received (posts + comments)
 * 
 * Query params:
 * - timeRange: 'month' | 'all' (default: 'all')
 * - limit: number (default: 20)
 */
router.get('/', auth, async (req, res) => {
    try {
        const { timeRange = 'all', limit = 20 } = req.query;
        const currentUserId = req.userId;

        // Calculate date filter
        let dateFilter = {};
        if (timeRange === 'month') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = { createdAt: { $gte: thirtyDaysAgo } };
        }

        // Aggregate post upvotes per user
        const postUpvotes = await Post.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$author',
                    postUpvotes: { $sum: { $size: '$upvotes' } },
                    postCount: { $sum: 1 }
                }
            }
        ]);

        // Aggregate comment upvotes per user
        const commentUpvotes = await Comment.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$author',
                    commentUpvotes: { $sum: { $size: '$upvotes' } },
                    answerCount: { $sum: 1 }
                }
            }
        ]);

        // Combine scores
        const userScores = new Map();

        postUpvotes.forEach(item => {
            if (!item._id) return;
            const id = item._id.toString();
            userScores.set(id, {
                userId: id,
                postUpvotes: item.postUpvotes,
                postCount: item.postCount,
                commentUpvotes: 0,
                answerCount: 0
            });
        });

        commentUpvotes.forEach(item => {
            if (!item._id) return;
            const id = item._id.toString();
            if (userScores.has(id)) {
                userScores.get(id).commentUpvotes = item.commentUpvotes;
                userScores.get(id).answerCount = item.answerCount;
            } else {
                userScores.set(id, {
                    userId: id,
                    postUpvotes: 0,
                    postCount: 0,
                    commentUpvotes: item.commentUpvotes,
                    answerCount: item.answerCount
                });
            }
        });

        // Calculate total score and sort
        const sortedUsers = Array.from(userScores.values())
            .map(user => ({
                ...user,
                totalUpvotes: user.postUpvotes + user.commentUpvotes,
                totalContributions: user.postCount + user.answerCount
            }))
            .sort((a, b) => b.totalUpvotes - a.totalUpvotes);

        // Get user details for ALL users first (needed for department filtering)
        const allUserIds = sortedUsers.map(u => u.userId);
        const users = await User.find({ _id: { $in: allUserIds } })
            .select('name department year')
            .lean();

        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        // Filter by department if specified
        const { department } = req.query;
        let filteredUsers = sortedUsers;
        if (department && department !== 'all') {
            filteredUsers = sortedUsers.filter(score => {
                const user = userMap.get(score.userId);
                return user?.department === department;
            });
        }

        // Build leaderboard with ranks (re-rank after filtering)
        const leaderboard = filteredUsers
            .slice(0, parseInt(limit))
            .map((score, index) => {
                const user = userMap.get(score.userId);
                return {
                    rank: index + 1,
                    userId: score.userId,
                    name: user?.name || 'Unknown User',
                    department: user?.department || 'Unknown',
                    year: user?.year || 'Unknown',
                    totalUpvotes: score.totalUpvotes,
                    postUpvotes: score.postUpvotes,
                    commentUpvotes: score.commentUpvotes,
                    postCount: score.postCount,
                    answerCount: score.answerCount,
                    totalContributions: score.totalContributions
                };
            });

        // Find current user's rank
        let currentUserRank = null;
        const currentUserIndex = sortedUsers.findIndex(u => u.userId === currentUserId);

        if (currentUserIndex !== -1) {
            const currentUserScore = sortedUsers[currentUserIndex];
            const currentUser = await User.findById(currentUserId).select('name department year').lean();

            currentUserRank = {
                rank: currentUserIndex + 1,
                userId: currentUserId,
                name: currentUser?.name || 'You',
                department: currentUser?.department || 'Unknown',
                year: currentUser?.year || 'Unknown',
                totalUpvotes: currentUserScore.totalUpvotes,
                postUpvotes: currentUserScore.postUpvotes,
                commentUpvotes: currentUserScore.commentUpvotes,
                postCount: currentUserScore.postCount,
                answerCount: currentUserScore.answerCount,
                totalContributions: currentUserScore.totalContributions
            };
        } else {
            // User has no contributions yet
            const currentUser = await User.findById(currentUserId).select('name department year').lean();
            currentUserRank = {
                rank: sortedUsers.length + 1,
                userId: currentUserId,
                name: currentUser?.name || 'You',
                department: currentUser?.department || 'Unknown',
                year: currentUser?.year || 'Unknown',
                totalUpvotes: 0,
                postUpvotes: 0,
                commentUpvotes: 0,
                postCount: 0,
                answerCount: 0,
                totalContributions: 0
            };
        }

        res.json({
            leaderboard,
            currentUserRank,
            totalParticipants: sortedUsers.length
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});

module.exports = router;
