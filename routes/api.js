// This is the Route for the express.

const express = require('express');
const router = express.Router();
const MenuItem = require('../models/menuItem');
const Order = require('../models/order');
const chatService = require('../services/chatService');

// Endpoint to handle chat messages
router.post('/chat', async (req, res) => {
  try {
    const { deviceId, message } = req.body;
    
    if (!deviceId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and message are required'
      });
    }
    
    const response = await chatService.processMessage(deviceId, message);
    
    res.json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message'
    });
  }
});

// Initialize payment
router.post('/payment/initialize', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }
    
    const result = await chatService.initializePayment(deviceId);
    res.json(result);
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while initializing payment'
    });
  }
});

// Payment verification webhook
router.post('/payment/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    
    // Verify signature (in a real app)
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    //   .update(JSON.stringify(req.body))
    //   .digest('hex');
    
    // if (hash !== req.headers['x-paystack-signature']) {
    //   return res.status(400).json({ status: false });
    // }
    
    // Extract device ID from reference
    const parts = reference.split('_');
    if (parts.length < 3) {
      return res.status(400).json({ status: false });
    }
    
    const orderId = parts[1];
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ status: false });
    }
    
    // Process the payment
    await chatService.processPayment(order.deviceId, reference);
    
    res.json({ status: true });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ status: false });
  }
});

// Payment callback endpoint
router.get('/payment/callback', async (req, res) => {
  const { reference } = req.query;
  
  try {
    // Verify the payment with Paystack API
    const verificationResponse = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    
    const paymentData = verificationResponse.data.data;
    
    if (paymentData.status === 'success') {
      // Extract metadata
      const deviceId = paymentData.metadata.device_id;
      const orderId = paymentData.metadata.order_id;
      
      // Update order status
      await chatService.processPayment(deviceId, reference);
      
      // Redirect to success page
      res.redirect(`/?success=true&reference=${reference}`);
    } else {
      res.redirect('/?success=false');
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect('/?success=false');
  }
});

// Endpoint to seed initial menu items
router.post('/seed-menu', async (req, res) => {
  try {
    // Define sample menu items
    const menuItems = [
      {
        id: 1,
        name: 'Chicken Burger',
        description: 'Juicy chicken patty with lettuce and special sauce',
        price: 8.99,
        category: 'main',
        available: true
      },
      {
        id: 2,
        name: 'Vegetable Salad',
        description: 'Fresh vegetables with olive oil dressing',
        price: 5.99,
        category: 'appetizer',
        available: true
      },
      {
        id: 3,
        name: 'French Fries',
        description: 'Crispy potato fries with ketchup',
        price: 3.99,
        category: 'appetizer',
        available: true
      },
      {
        id: 4,
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with cream',
        price: 4.99,
        category: 'dessert',
        available: true
      },
      {
        id: 5,
        name: 'Soda',
        description: 'Refreshing carbonated drink',
        price: 1.99,
        category: 'drink',
        available: true
      },
      {
        id: 6,
        name: 'Pizza',
        description: 'Cheese pizza with tomato sauce',
        price: 10.99,
        category: 'main',
        available: true
      },
      {
        id: 7,
        name: 'Ice Cream',
        description: 'Vanilla ice cream with chocolate sauce',
        price: 3.99,
        category: 'dessert',
        available: true
      },
      {
        id: 8,
        name: 'Lemonade',
        description: 'Fresh lemonade with mint',
        price: 2.99,
        category: 'drink',
        available: true
      }
    ];

    // Clear existing menu items
    await MenuItem.deleteMany({});
    
    // Insert new menu items
    await MenuItem.insertMany(menuItems);
    
    res.json({
      success: true,
      message: 'Menu items seeded successfully',
      data: menuItems
    });
  } catch (error) {
    console.error('Seed menu error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while seeding menu items'
    });
  }
});

module.exports = router;