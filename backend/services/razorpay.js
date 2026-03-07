import RazorpayModule from 'razorpay';
import crypto from 'crypto';

let razorpay;

function getRazorpay() {
    if (!razorpay) {
        razorpay = new RazorpayModule({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpay;
}

export const razorpayService = {
    async createOrder(amountInPaise, orderId, customerEmail, customerName) {
        try {
            const order = await getRazorpay().orders.create({
                amount: amountInPaise, // in paise
                currency: 'INR',
                receipt: orderId,
                customer_notify: 1,
                notes: {
                    order_id: orderId,
                    email: customerEmail,
                    name: customerName
                }
            });

            return order;
        } catch (error) {
            console.error('Razorpay order creation error:', error.message);
            throw new Error('Failed to create Razorpay order: ' + error.message);
        }
    },

    async verifySignature(orderId, paymentId, signature) {
        try {
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return generatedSignature === signature;
        } catch (error) {
            console.error('Signature verification error:', error.message);
            return false;
        }
    },

    async capturePayment(paymentId, amountInPaise) {
        try {
            const payment = await getRazorpay().payments.capture(paymentId, amountInPaise);
            return payment;
        } catch (error) {
            console.error('Payment capture error:', error.message);
            throw new Error('Failed to capture payment: ' + error.message);
        }
    },

    async refundPayment(paymentId, amountInPaise = null) {
        try {
            const refund = await getRazorpay().payments.refund(paymentId, {
                amount: amountInPaise
            });
            return refund;
        } catch (error) {
            console.error('Refund error:', error.message);
            throw new Error('Failed to refund payment: ' + error.message);
        }
    }
};
