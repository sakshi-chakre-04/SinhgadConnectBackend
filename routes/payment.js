const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Pro plan price in paise (₹99 = 9900 paise)
const PRO_PRICE_PAISE = 9900;
const PRO_DURATION_DAYS = 30;

// ------------------------------
// @route   POST /api/payment/create-order
// @desc    Create a Razorpay order for Pro membership
// @access  Private
// ------------------------------
router.post('/create-order', auth, async (req, res) => {
    try {
        const options = {
            amount: PRO_PRICE_PAISE,
            currency: 'INR',
            receipt: `pro_${req.user._id}_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                plan: 'pro_monthly'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
});

// ------------------------------
// @route   POST /api/payment/verify
// @desc    Verify Razorpay payment and upgrade user to Pro
// @access  Private
// ------------------------------
router.post('/verify', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        // Upgrade user to Pro for 30 days
        const proExpiresAt = new Date();
        proExpiresAt.setDate(proExpiresAt.getDate() + PRO_DURATION_DAYS);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { isPro: true, proExpiresAt },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: '🎉 You are now a Pro member!',
            user: {
                isPro: user.isPro,
                proExpiresAt: user.proExpiresAt
            }
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
});

// ------------------------------
// @route   GET /api/payment/status
// @desc    Get current user's Pro status
// @access  Private
// ------------------------------
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('isPro proExpiresAt');

        // Check if Pro has expired
        if (user.isPro && user.proExpiresAt && new Date() > user.proExpiresAt) {
            await User.findByIdAndUpdate(req.user._id, { isPro: false, proExpiresAt: null });
            return res.json({ success: true, isPro: false, proExpiresAt: null });
        }

        res.json({
            success: true,
            isPro: user.isPro,
            proExpiresAt: user.proExpiresAt
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get Pro status' });
    }
});

module.exports = router;
