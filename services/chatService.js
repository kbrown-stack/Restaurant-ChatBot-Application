// This is chat service file for all services.

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const MenuItem = require('../models/menuItem');
const Order = require('../models/order');

class ChatService {
  constructor() {
    // Store active user sessions
    this.sessions = {};
  }

  // Initialize a new user session or get existing one
  async initOrGetSession(deviceId) {
    if (!this.sessions[deviceId]) {
      this.sessions[deviceId] = {
        currentOrder: null,
        expectingMenuSelection: false,
        expectingSchedule: false
      };

      // Check if there's an existing current order for this device
      const existingOrder = await Order.findOne({ 
        deviceId: deviceId,
        status: 'current'
      }).populate('items.menuItem');

      if (existingOrder) {
        this.sessions[deviceId].currentOrder = existingOrder;
      }
    }
    
    return this.sessions[deviceId];
  }

  // Process user message
  async processMessage(deviceId, message) {
    const session = await this.initOrGetSession(deviceId);
    
    // Check if user is in scheduling mode
    if (session.expectingSchedule) {
      return await this.handleScheduleInput(deviceId, message);
    }

    // Check if user is expecting to select a menu item
    if (session.expectingMenuSelection) {
      return await this.handleMenuSelection(deviceId, message);
    }

    // Normal option selection
    switch (message.trim()) {
      case '1':
        return await this.showMenuItems(deviceId);
      case '99':
        return await this.checkoutOrder(deviceId);
      case '98':
        return await this.getOrderHistory(deviceId);
      case '97':
        return await this.getCurrentOrder(deviceId);
      case '0':
        return await this.cancelOrder(deviceId);
      default:
        return this.getWelcomeMessage();
    }
  }

  // Handle menu item selection
  async handleMenuSelection(deviceId, message) {
    try {
      const session = this.sessions[deviceId];
      session.expectingMenuSelection = false;
      
      const menuItemId = parseInt(message.trim());
      if (isNaN(menuItemId)) {
        return `Invalid selection. ${this.getWelcomeMessage()}`;
      }
      
      const menuItem = await MenuItem.findOne({ id: menuItemId });
      if (!menuItem) {
        return `Item not found. ${this.getWelcomeMessage()}`;
      }
      
      // Check if there's an existing order
      if (!session.currentOrder) {
        // Create a new order
        session.currentOrder = new Order({
          deviceId: deviceId,
          items: [{ menuItem: menuItem._id, quantity: 1 }],
          totalAmount: menuItem.price,
          status: 'current'
        });
        await session.currentOrder.save();
      } else {
        // Add to existing order
        const existingItemIndex = session.currentOrder.items.findIndex(
          item => item?.menuItem?.toString?.() === menuItem._id.toString()
        );
        
        if (existingItemIndex !== -1) {
          // Increment quantity if item already exists
          session.currentOrder.items[existingItemIndex].quantity += 1;
        } else {
          // Add new item
          session.currentOrder.items.push({
            menuItem: menuItem._id,
            quantity: 1
          });
        }
        
        // Update total amount
        session.currentOrder.totalAmount += menuItem.price;
        await session.currentOrder.save();
      }
      
      return `Added ${menuItem.name} to your order. What would you like to do next?
1. Select 1 to Place an order
2. Select 99 to checkout order
3. Select 98 to see order history
4. Select 97 to see current order 
5. Select 0 to cancel order`;
    } catch (error) {
      console.error("Error in handleMenuSelection:", error);
      return "Sorry, there was an error processing your selection. Please try again.";
    }
  }

  // Handle schedule input
  async handleScheduleInput(deviceId, message) {
    try {
      const session = this.sessions[deviceId];
      session.expectingSchedule = false;
      
      // Simple validation - expecting format like "2023-05-20 14:30"
      const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      if (!datePattern.test(message)) {
        return `Invalid date format. Please use YYYY-MM-DD HH:MM format. 
Your order will be processed immediately.
${this.getPaymentOptions(deviceId)}`;
      }
      
      const scheduledDate = new Date(message);
      if (isNaN(scheduledDate.getTime())) {
        return `Invalid date. Please use YYYY-MM-DD HH:MM format.
Your order will be processed immediately.
${this.getPaymentOptions(deviceId)}`;
      }
      
      // Save scheduled date
      session.currentOrder.scheduledFor = scheduledDate;
      await session.currentOrder.save();
      
      return `Your order has been scheduled for ${message}. 
${this.getPaymentOptions(deviceId)}`;
    } catch (error) {
      console.error("Error in handleScheduleInput:", error);
      return "Sorry, there was an error scheduling your order. Please try again.";
    }
  }

  // Show menu items
  async showMenuItems(deviceId) {
    try {
      const session = this.sessions[deviceId];
      session.expectingMenuSelection = true;
      
      const menuItems = await MenuItem.find({ available: true }).sort('id');
      
      if (menuItems.length === 0) {
        session.expectingMenuSelection = false;
        return "Sorry, there are no menu items available. Please try again later.";
      }
      
      let response = "Please select an item by number:\n\n";
      menuItems.forEach(item => {
        response += `${item.id}. ${item.name} - $${item.price.toFixed(2)}\n   ${item.description}\n\n`;
      });
      
      return response;
    } catch (error) {
      console.error("Error in showMenuItems:", error);
      return "Sorry, there was an error retrieving the menu. Please try again.";
    }
  }

  // Checkout order
  async checkoutOrder(deviceId) {
    try {
      const session = this.sessions[deviceId];
      
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "No order to place. Select 1 to place an order.";
      }
      
      // Ask if user wants to schedule the order
      session.expectingSchedule = true;
      return "Do you want to schedule this order for later? If yes, please provide date and time in format YYYY-MM-DD HH:MM (e.g., 2023-05-20 14:30). If no, just type 'no'.";
      
    } catch (error) {
      console.error("Error in checkoutOrder:", error);
      return "Sorry, there was an error checking out your order. Please try again.";
    }
  }

  // Get order history
  async getOrderHistory(deviceId) {
    try {
      const orders = await Order.find({
        deviceId: deviceId,
        status: { $in: ['placed', 'paid'] }
      }).populate('items.menuItem').sort('-createdAt');
      
      if (orders.length === 0) {
        return "You don't have any order history yet. Select 1 to place your first order.";
      }
      
      let response = "Your order history:\n\n";
      orders.forEach((order, index) => {
        response += `Order #${index + 1} (${order.status}):\n`;
        order.items.forEach(item => {
          response += `- ${item.quantity}x ${item.menuItem.name}: $${(item.menuItem.price * item.quantity).toFixed(2)}\n`;
        });
        response += `Total: $${order.totalAmount.toFixed(2)}\n`;
        if (order.scheduledFor) {
          response += `Scheduled for: ${order.scheduledFor.toLocaleString()}\n`;
        }
        response += `\n`;
      });
      
      response += this.getWelcomeMessage();
      return response;
    } catch (error) {
      console.error("Error in getOrderHistory:", error);
      return "Sorry, there was an error retrieving your order history. Please try again.";
    }
  }

  // Get current order
  async getCurrentOrder(deviceId) {
    try {
      const session = this.sessions[deviceId];
      
      if (!session.currentOrder || session.currentOrder.items.length === 0) {
        return "You don't have any current order. Select 1 to place an order.";
      }
      
      // Refresh order data from database
      const currentOrder = await Order.findById(session.currentOrder._id).populate('items.menuItem');
      
      let response = "Your current order:\n\n";
      currentOrder.items.forEach(item => {
        response += `- ${item.quantity}x ${item.menuItem.name}: $${(item.menuItem.price * item.quantity).toFixed(2)}\n`;
      });
      response += `\nTotal: $${currentOrder.totalAmount.toFixed(2)}\n\n`;
      
      if (currentOrder.scheduledFor) {
        response += `Scheduled for: ${currentOrder.scheduledFor.toLocaleString()}\n\n`;
      }
      
      response += this.getWelcomeMessage();
      return response;
    } catch (error) {
      console.error("Error in getCurrentOrder:", error);
      return "Sorry, there was an error retrieving your current order. Please try again.";
    }
  }

  // Cancel order
  async cancelOrder(deviceId) {
    try {
      const session = this.sessions[deviceId];
      
      if (!session.currentOrder) {
        return "You don't have any order to cancel. Select 1 to place an order.";
      }
      
      // Update order status
      session.currentOrder.status = 'cancelled';
      await session.currentOrder.save();
      
      // Clear current order from session
      session.currentOrder = null;
      
      return "Your order has been cancelled. " + this.getWelcomeMessage();
    } catch (error) {
      console.error("Error in cancelOrder:", error);
      return "Sorry, there was an error cancelling your order. Please try again.";
    }
  }

  // Get payment options
  getPaymentOptions(deviceId) {
    return `Please select a payment option:
1. Pay with Paystack (Credit/Debit Card)
2. Cancel payment and go back

Type 'pay' to proceed with payment or 'cancel' to go back.`;
  }

  // Process payment
  async processPayment(deviceId, paymentReference) {
    try {
      const session = this.sessions[deviceId];
      
      if (!session.currentOrder) {
        return "No order to pay for. Select 1 to place an order.";
      }
      
      // Update order status and payment reference
      session.currentOrder.status = 'paid';
      session.currentOrder.paymentReference = paymentReference;
      await session.currentOrder.save();
      
      // Clear current order from session
      session.currentOrder = null;
      
      return `Payment successful! Your order has been confirmed. 
Thank you for your purchase.

${this.getWelcomeMessage()}`;
    } catch (error) {
      console.error("Error in processPayment:", error);
      return "Sorry, there was an error processing your payment. Please try again.";
    }
  }

  // Initialize Paystack transaction
  async initializePayment(deviceId) {
    try {
      const session = this.sessions[deviceId];
      
      if (!session.currentOrder) {
        return { success: false, message: "No order to pay for" };
      }
      
      // Generate a unique reference
      const reference = `order_${session.currentOrder._id}_${Date.now()}`;
      const email = `customer${deviceId.substring(0,8)}browndev@gmail.com`;
      const amount = Math.round(session.currentOrder.totalAmount * 100); // this ensures that the amount passed is an integer.

      // log payload

      console.log("Initialising payment with", {
        amount,
        reference,
        email
      });
      
      // Initialize Paystack transaction
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        amount,
        reference,
        email, 
        metadata: {
          order_id: session.currentOrder._id.toString(),
          device_id: deviceId
        },
        callback_url: 'https://815d-208-127-49-39.ngrok-free.app'

      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status) {
        return {
          success: true,
          authorizationUrl: response.data.data.authorization_url,
          reference: reference
        };

      } else {
        return { success: false, message: "Failed to initialize payment" };
      }
    } catch (error) {
      console.error("Error in initializePayment:", error.message);

      if (error.response) {
        console.error("Paystack Response Error:", error.response.data);
      } else {
        console.error("Axios General Error:", error.message);
      }
      
      return { success: false, message: "Error initializing payment" };
    }
  }

  // Welcome message with options

  getWelcomeMessage() {
    return `What would you like to do?
1. Select 1 to Place an order
2. Select 99 to checkout order
3. Select 98 to see order history
4. Select 97 to see current order
5. Select 0 to cancel order`;
  }
}

module.exports = new ChatService();
