import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { razorpayService } from '../services/razorpay.js';

const router = express.Router();

// Manual order endpoint (QR-code payment flow)
router.post('/manual', authMiddleware, async (req, res) => {
    try {
        const { designId, size, name, email, address, finalizedImageUrl } = req.body;

        if (!designId || !size || !name || !email || !address || !finalizedImageUrl) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await db.createManualOrder({
            userId: req.userId,
            designId,
            name,
            email,
            address,
            size,
            finalizedUrl: finalizedImageUrl,
            amount: 199500 // Flat ₹1995 in paise
        });

        res.json({ success: true, orderId: result.orderId, amountInPaise: result.amountInPaise });
    } catch (error) {
        console.error('Manual order error:', error);
        res.status(500).json({ error: 'Failed to save order: ' + error.message });
    }
});


// Quick buy-now endpoint (simplified checkout)
router.post('/buy-now', authMiddleware, async (req, res) => {
    try {
        const { designId, tshirtSize, quantity = 1, customText } = req.body;

        if (!designId) {
            return res.status(400).json({ error: 'Design ID is required' });
        }

        // Verify design belongs to user and is finalized
        const design = await db.getDesignById(designId, req.userId);
        if (!design) {
            return res.status(404).json({ error: 'Design not found' });
        }

        if (!design.is_finalized) {
            return res.status(400).json({ error: 'Design must be finalized before purchase' });
        }

        // Create order
        const order = await db.createOrder(
            req.userId,
            designId,
            tshirtSize,
            quantity,
            customText
        );

        res.json({
            success: true,
            orderId: order.id,
            amountInPaise: order.amount_in_paise,
            amountInRupees: (order.amount_in_paise / 100).toFixed(2)
        });
    } catch (error) {
        console.error('Buy now error:', error);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Create order (before payment)
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { designId, tshirtSize, quantity = 1, customText } = req.body;

        if (!designId) {
            return res.status(400).json({ error: 'Design ID is required' });
        }

        // Verify design belongs to user
        const design = await db.getDesignById(designId, req.userId);
        if (!design || !design.is_finalized) {
            return res.status(400).json({ error: 'Design not finalized' });
        }

        // Get user
        const user = await db.getUserById(req.userId);

        // Create order
        const order = await db.createOrder(
            req.userId,
            designId,
            tshirtSize,
            quantity,
            customText
        );

        res.json({
            success: true,
            orderId: order.id,
            amountInPaise: order.amount_in_paise,
            amountInRupees: (order.amount_in_paise / 100).toFixed(2)
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Initiate Razorpay payment
router.post('/initiate-payment', authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Get order
        const order = await db.getOrderById(orderId, req.userId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.razorpay_order_id) {
            return res.status(400).json({ error: 'Payment already initiated' });
        }

        // Get user
        const user = await db.getUserById(req.userId);

        // Create Razorpay order
        const razorpayOrder = await razorpayService.createOrder(
            order.amount_in_paise,
            orderId,
            user.email,
            user.name
        );

        // Save Razorpay order ID
        await db.updateOrderRazorpayId(orderId, razorpayOrder.id);

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment: ' + error.message });
    }
});

// Get order details
router.get('/:orderId', authMiddleware, async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.orderId, req.userId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get user orders list
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await db.getOrdersByUserId(req.userId);
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

export default router;
