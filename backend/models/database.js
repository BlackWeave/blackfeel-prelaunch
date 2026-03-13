import pool from '../config/db.js';
import { v4 as uuid } from 'uuid';

export const db = {
    // Users
    async createUser(email, passwordHash, name) {
        const result = await pool.query(
            `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id, email, name, generations_used, is_finalized`,
            [uuid(), email, passwordHash, name]
        );
        return result.rows[0];
    },

    async getUserByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },

    async getUserById(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    },

    async updateUserGenerationCount(userId) {
        const result = await pool.query(
            `UPDATE users SET generations_used = generations_used + 1,
             last_generation_date = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING generations_used`,
            [userId]
        );
        return result.rows[0];
    },

    async resetUserDailyLimit(userId) {
        await pool.query(
            `UPDATE users SET generations_used = 0, is_finalized = false, updated_at = NOW()
             WHERE id = $1 AND last_generation_date < CURRENT_DATE`,
            [userId]
        );
    },

    async finalizeUserDesign(userId) {
        await pool.query(
            `UPDATE users SET is_finalized = true, updated_at = NOW() WHERE id = $1`,
            [userId]
        );
    },

    // Designs
    async createDesign(userId, prompt, originalImageUrl, processedImageUrl, tshirtColor) {
        const result = await pool.query(
            `INSERT INTO designs
             (id, user_id, prompt, original_image_url, processed_image_url, tshirt_color, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, prompt, processed_image_url, tshirt_color`,
            [uuid(), userId, prompt, originalImageUrl, processedImageUrl, tshirtColor]
        );
        return result.rows[0];
    },

    async getDesignsByUserId(userId, limit = 20) {
        const result = await pool.query(
            `SELECT id, prompt, processed_image_url, tshirt_color, is_finalized, created_at
             FROM designs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    },

    async getDesignById(designId, userId = null) {
        const query = userId
            ? 'SELECT * FROM designs WHERE id = $1 AND user_id = $2'
            : 'SELECT * FROM designs WHERE id = $1';
        const params = userId ? [designId, userId] : [designId];
        const result = await pool.query(query, params);
        return result.rows[0];
    },

    async updateDesignPosition(designId, userId, x, y, scale) {
        const result = await pool.query(
            `UPDATE designs SET design_position = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING design_position`,
            [JSON.stringify({ x, y, scale }), designId, userId]
        );
        return result.rows[0];
    },

    async finalizeDesign(designId, userId, finalizedImageUrl) {
        const result = await pool.query(
            `UPDATE designs SET finalized_image_url = $1, is_finalized = true, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, finalized_image_url`,
            [finalizedImageUrl, designId, userId]
        );
        return result.rows[0];
    },

    // Orders
    async createOrder(userId, designId, tshirtSize, quantity, customText) {
        // Pricing: Base ₹1995, +₹299 per size tier, +₹100 custom text
        let basePrice = 199500; // ₹1995 in paise
        if (tshirtSize && ['L', 'XL', 'XXL'].includes(tshirtSize)) basePrice += 29900;
        if (customText) basePrice += 10000;
        const totalPrice = basePrice * quantity;

        const result = await pool.query(
            `INSERT INTO orders (id, user_id, design_id, amount_in_paise, tshirt_size, tshirt_quantity, custom_text, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             RETURNING id, amount_in_paise, status`,
            [uuid(), userId, designId, totalPrice, tshirtSize, quantity, customText]
        );
        return result.rows[0];
    },

    async getOrderById(orderId, userId = null) {
        const query = userId
            ? 'SELECT * FROM orders WHERE id = $1 AND user_id = $2'
            : 'SELECT * FROM orders WHERE id = $1';
        const params = userId ? [orderId, userId] : [orderId];
        const result = await pool.query(query, params);
        return result.rows[0];
    },

    async updateOrderStatus(orderId, status) {
        const result = await pool.query(
            `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, status`,
            [status, orderId]
        );
        return result.rows[0];
    },

    async updateOrderRazorpayId(orderId, razorpayOrderId) {
        await pool.query(
            `UPDATE orders SET razorpay_order_id = $1, status = 'payment_pending', updated_at = NOW()
             WHERE id = $2`,
            [razorpayOrderId, orderId]
        );
    },

    async getOrderByRazorpayId(razorpayOrderId) {
        const result = await pool.query(
            'SELECT * FROM orders WHERE razorpay_order_id = $1',
            [razorpayOrderId]
        );
        return result.rows[0];
    },

    // Payments
    async createPayment(orderId, razorpayPaymentId, razorpaySignature, amountInPaise) {
        const result = await pool.query(
            `INSERT INTO payments (id, order_id, razorpay_payment_id, razorpay_signature, amount_in_paise, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'authorized', NOW(), NOW())
             RETURNING id, status`,
            [uuid(), orderId, razorpayPaymentId, razorpaySignature, amountInPaise]
        );
        return result.rows[0];
    },

    async getPaymentByRazorpayId(razorpayPaymentId) {
        const result = await pool.query(
            'SELECT * FROM payments WHERE razorpay_payment_id = $1',
            [razorpayPaymentId]
        );
        return result.rows[0];
    },

    // Webhook Events (idempotency)
    async recordWebhookEvent(razorpayEventId, eventType, payload) {
        const result = await pool.query(
            `INSERT INTO webhook_events (id, razorpay_event_id, event_type, payload, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (razorpay_event_id) DO NOTHING
             RETURNING id`,
            [uuid(), razorpayEventId, eventType, JSON.stringify(payload)]
        );
        return result.rows.length > 0;
    },

    // Add to the 'db' object in backend/models/database.js
async createFulfillmentJob(orderId) {
    // 1. Fetch full details of the paid order
    // Note: processed_image_url is the transparent design (after bg removal)
    // finalized_image_url is the baked composite (t-shirt + design)
    const orderQuery = `
        SELECT o.id as order_id, o.tshirt_size, d.id as design_id,
               d.tshirt_color, d.finalized_image_url, d.processed_image_url
        FROM orders o
        JOIN designs d ON o.design_id = d.id
        WHERE o.id = $1
    `;
    const orderRes = await pool.query(orderQuery, [orderId]);
    const details = orderRes.rows[0];

    // 2. Insert into the Fulfillment Queue
    // raw_design_url = transparent PNG (processed_image_url) for printer
    // print_mockup_url = baked composite (finalized_image_url) for reference
    return await pool.query(
        `INSERT INTO fulfillment_queue
         (order_id, design_id, tshirt_color, tshirt_size, print_mockup_url, raw_design_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
            details.order_id,
            details.design_id,
            details.tshirt_color,
            details.tshirt_size,
            details.finalized_image_url,
            details.processed_image_url  // This is the transparent design
        ]
    );
},

    async createManualOrder({ userId, designId, name, email, address, size, finalizedUrl, amount }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get the original design details for the fulfillment queue
            const designRes = await client.query('SELECT * FROM designs WHERE id = $1', [designId]);
            const design = designRes.rows[0];
            if (!design) throw new Error('Design not found');

            // 2. Insert into the orders table
            const orderQuery = `
                INSERT INTO orders (
                    user_id, design_id, amount_in_paise, status, 
                    tshirt_size, shipping_address, customer_name, customer_email
                ) VALUES ($1, $2, $3, 'payment_pending', $4, $5, $6, $7)
                RETURNING id, amount_in_paise, status
            `;
            const orderValues = [userId, designId, amount, size, JSON.stringify({ text: address }), name, email];
            const orderRes = await client.query(orderQuery, orderValues);
            const orderId = orderRes.rows[0].id;

            // 3. Insert into fulfillment_queue for the printer
            const fulfillmentQuery = `
                INSERT INTO fulfillment_queue (
                    order_id, design_id, tshirt_color, tshirt_size, 
                    print_mockup_url, raw_design_url
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `;
            const fulfillmentValues = [
                orderId, designId, design.tshirt_color, size, 
                finalizedUrl, design.processed_image_url
            ];
            await client.query(fulfillmentQuery, fulfillmentValues);

            await client.query('COMMIT');
            return { orderId, amountInPaise: orderRes.rows[0].amount_in_paise };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    async markWebhookProcessed(razorpayEventId) {
        await pool.query(
            `UPDATE webhook_events SET processed = true WHERE razorpay_event_id = $1`,
            [razorpayEventId]
        );
    },

    async getOrdersByUserId(userId) {
        const result = await pool.query(
            `SELECT
                o.id,
                o.amount_in_paise,
                o.status,
                o.tshirt_size,
                o.tshirt_quantity,
                o.created_at,
                d.processed_image_url,
                d.finalized_image_url,
                d.tshirt_color,
                d.prompt
             FROM orders o
             JOIN designs d ON o.design_id = d.id
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [userId]
        );
        
        // Debug: Log image URLs for each order
        result.rows.forEach((order, idx) => {
            console.log(`Order ${idx + 1} (${order.id}): finalized_image_url=${order.finalized_image_url ? '✓' : 'NULL'}, processed_image_url=${order.processed_image_url ? '✓' : 'NULL'}`);
        });
        
        return result.rows;
    }
};
