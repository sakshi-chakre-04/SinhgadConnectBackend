/**
 * Custom per-user daily rate limiter.
 * Tracks usage by user ID (from JWT), resets daily at midnight.
 * Falls back to IP-based limiting for unauthenticated routes.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory store: { userId: { count, resetAt } }
const dailyCounts = {};

const getResetTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
};

const getUserIdFromReq = (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch {
        return null;
    }
};

/**
 * Creates a per-user daily rate limiter middleware.
 * @param {Object} options
 * @param {number} options.normalLimit - Max requests/day for normal users
 * @param {number} options.proLimit - Max requests/day for Pro users
 * @param {string} options.message - Error message shown when limit is hit
 */
const createUserDailyLimiter = ({ normalLimit, proLimit, message }) => {
    return async (req, res, next) => {
        const userId = getUserIdFromReq(req);

        if (!userId) {
            // No token — reject unauthenticated calls
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const now = new Date();
        const entry = dailyCounts[userId];

        // Reset if past reset time
        if (entry && now >= entry.resetAt) {
            delete dailyCounts[userId];
        }

        if (!dailyCounts[userId]) {
            dailyCounts[userId] = { count: 0, resetAt: getResetTime(), isPro: false };
        }

        // Check isPro from DB once per day (cached in entry)
        if (!dailyCounts[userId]._proChecked) {
            try {
                const user = await User.findById(userId).select('isPro proExpiresAt');
                const isProActive = user?.isPro && (!user.proExpiresAt || new Date() < user.proExpiresAt);
                dailyCounts[userId].isPro = isProActive || false;
                dailyCounts[userId]._proChecked = true;
            } catch {
                dailyCounts[userId].isPro = false;
            }
        }

        const limit = dailyCounts[userId].isPro ? proLimit : normalLimit;
        const remaining = limit - dailyCounts[userId].count;

        if (remaining <= 0) {
            const resetAt = dailyCounts[userId].resetAt;
            return res.status(429).json({
                success: false,
                message: message || `Daily limit reached. Resets at midnight.`,
                limit,
                remaining: 0,
                resetAt,
                isPro: dailyCounts[userId].isPro
            });
        }

        dailyCounts[userId].count += 1;

        // Attach remaining info to response headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining - 1);

        next();
    };
};

module.exports = { createUserDailyLimiter };
