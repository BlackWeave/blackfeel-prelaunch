import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { razorpayService } from '../services/razorpay.js';

const router = express.Router();

// Verify payment and create payment record
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        // Verify signature
        const isValid = await razorpayService.verifySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Find order by Razorpay ID
        const order_found = await db.getOrderByRazorpayId(razorpayOrderId);

        if (!order_found || order_found.user_id !== req.userId) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if payment already processed
        const existingPayment = await db.getPaymentByRazorpayId(razorpayPaymentId);
        if (existingPayment) {
            return res.json({
                success: true,
                message: 'Payment already processed',
                orderId: order_found.id
            });
        }

        // Create payment record
        const payment = await db.createPayment(
            order_found.id,
            razorpayPaymentId,
            razorpaySignature,
            order_found.amount_in_paise
        );

        // Update order status to paid
        await db.updateOrderStatus(order_found.id, 'paid');

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: order_found.id,
            paymentId: payment.id
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed: ' + error.message });
    }
});

// Webhook from Razorpay (for asynchronous processing)
router.post('/webhook', async (req, res) => {
    try {
        const { event, payload } = req.body;
        const razorpayEventId = req.headers['x-razorpay-event-id'];

        if (!razorpayEventId) {
            return res.status(400).json({ error: 'Missing event ID' });
        }

        // Record webhook (idempotent)
        const isNew = await db.recordWebhookEvent(razorpayEventId, event, payload);

        if (!isNew) {
            // Already processed
            return res.json({ success: true });
        }

        // Handle different event types
        if (event === 'payment.authorized') {
            const { razorpay_payment_id, razorpay_order_id } = payload.payment;

            // Find order
            const order = await db.getOrderByRazorpayId(razorpay_order_id);

            if (order) {
                // Verify signature on the server side
                const isValid = await razorpayService.verifySignature(
                    razorpay_order_id,
                    razorpay_payment_id,
                    payload.payment.razorpay_signature
                );

                if (isValid) {
                    // Create payment record
                    await db.createPayment(
                        order.id,
                        razorpay_payment_id,
                        payload.payment.razorpay_signature,
                        order.amount_in_paise
                    );

                    // Update order status
                    await db.updateOrderStatus(order.id, 'paid');

                    // TODO: Trigger email notification
                }
            }
        }

        // Mark as processed
        await db.markWebhookProcessed(razorpayEventId);

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
