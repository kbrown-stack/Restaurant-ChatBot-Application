// The intial file of the project that renders the app.

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const mongoose = require('mongoose');
// console.log('MONGO URI:', process.env.MONGODB_URI)

const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const apiRoutes = require('./routes/api');
const chatService = require('./services/chatService');

const app = express();




const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-chatbot', {
//   // useNewUrlParser: true,
//   // useUnifiedTopology: true
// })
// .then(() => console.log('Connected to MongoDB'))
// .catch(err => console.error('MongoDB connection error:', err));


mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kbrownonuigbo:83JANEbrown@cluster0.trx316a.mongodb.net/restaurantChatBot')
console.log(process.env.MONGODB_URI)

  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error(' MongoDB connection error:', err.message);
    console.error(err.stack);
  });


// API Routes
app.use('/api', apiRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Get or generate device ID
  let deviceId = socket.handshake.query.deviceId;
  if (!deviceId) {
    deviceId = uuidv4();
    socket.emit('set_device_id', deviceId);
  }
  
  // Send welcome message
  socket.emit('bot_message', chatService.getWelcomeMessage());
  
  // Handle incoming messages
  socket.on('user_message', async (message) => {
    try {
      if (message.toLowerCase() === 'pay') {

        // Initialize payment
        const paymentData = await chatService.initializePayment(deviceId);
        if (paymentData.success) {
          socket.emit('payment_redirect', paymentData.authorizationUrl);
        } else {
          socket.emit('bot_message', paymentData.message);
        }
      } else if (message.toLowerCase() === 'cancel') {
        socket.emit('bot_message', chatService.getWelcomeMessage());
      } else {
        const response = await chatService.processMessage(deviceId, message);
        socket.emit('bot_message', response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('bot_message', 'Sorry, I encountered an error. Please try again.');
    }
  });
  
  socket.on('payment_success', async (reference) => {
    try {
      const message = await chatService.processPayment(deviceId, reference);
      socket.emit('bot_message', message);
    } catch (error) {
      console.error('Error processing payment success:', error);
      socket.emit('bot_message', 'There was an issue confirming your payment. Please contact support.');
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Starting the Application
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});