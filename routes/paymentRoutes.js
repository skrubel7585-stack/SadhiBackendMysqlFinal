// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const RAZORPAY_KEY_ID = 'rzp_live_Sq2UAea55vLHvb';
const RAZORPAY_KEY_SECRET = 'IYrDZtKR6MhnIfPmp5FfBCnC';

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Create order endpoint
router.post('/create-order', async (req, res) => {
  console.log('📝 Create order request:', req.body);
  
  try {
    const { amount, currency } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }
    
    const options = {
      amount: amount * 100,
      currency: currency || 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    console.log('✅ Order created:', order.id);
    
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create payment link endpoint - FIXED (without order_id)
router.post('/create-payment-link', async (req, res) => {
  console.log('🔗 Create payment link request:', req.body);
  
  try {
    const { amount, currency, description, customer, callback_url } = req.body;
    
    // Validation
    if (!amount) {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }
    
    if (!customer || !customer.name || !customer.email || !customer.contact) {
      return res.status(400).json({ 
        success: false, 
        error: 'customer name, email and contact are required' 
      });
    }
    
    // Payment Link data without order_id
    const paymentLinkData = {
      amount: amount * 100,
      currency: currency || 'INR',
      description: description || 'Payment for SR Matrimony',
      customer: {
        name: customer.name,
        email: customer.email,
        contact: customer.contact
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      callback_url: callback_url || 'https://your-app.com/callback',
      callback_method: 'get'
    };
    
    console.log('Sending to Razorpay:', JSON.stringify(paymentLinkData, null, 2));
    
    const paymentLink = await razorpayInstance.paymentLink.create(paymentLinkData);
    
    console.log('✅ Payment link created:', paymentLink.short_url);
    
    res.json({
      success: true,
      payment_url: paymentLink.short_url,
      payment_link_id: paymentLink.id
    });
  } catch (error) {
    console.error('❌ Payment link error:', error.error || error);
    res.status(500).json({ 
      success: false, 
      error: error.error?.description || error.message 
    });
  }
});

// Verify payment endpoint
router.post('/verify-payment', async (req, res) => {
  console.log('🔐 Verify payment request:', req.body);
  
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', razorpay_signature);
    
    if (expectedSignature === razorpay_signature) {
      console.log('✅ Payment verified successfully');
      
      const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
      
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        payment_status: payment.status
      });
    } else {
      console.log('❌ Invalid signature');
      res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get payment details endpoint
router.get('/payment-details/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpayInstance.payments.fetch(paymentId);
    
    res.json({
      success: true,
      payment: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test connection endpoint
router.get('/test-connection', async (req, res) => {
  res.json({ success: true, message: 'Backend is connected!' });
});

module.exports = router;