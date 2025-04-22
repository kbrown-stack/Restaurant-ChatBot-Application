const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/menuItem');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-chatbot')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkMenuItems() {
  try {
    // Find all menu items
    const items = await MenuItem.find({});
    console.log(`Found ${items.length} menu items:`);
    console.log(JSON.stringify(items, null, 2));
    
    // Check specifically for available items
    const availableItems = await MenuItem.find({ available: true });
    console.log(`Found ${availableItems.length} available menu items`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error checking menu items:', error);
  }
}

checkMenuItems();