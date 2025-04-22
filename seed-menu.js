const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/menuItem');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-chatbot')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const menuItems = [
  {
    id: 1,
    name: 'Jellof Rice',
    description: 'Smoky Jellof rice',
    price: 10.99,
    category: 'main',
    available: true
  },
  {
    id: 2,
    name: 'Chicken Wrap',
    description: 'Spicy wrap',
    price: 8.99,
    category: 'main',
    available: true
  },
  {
    id: 3,
    name: 'Peppered Chicken',
    description: 'Chicken mixed with hot cameroun paper',
    price: 4.99,
    category: 'dessert',
    available: true
  },
  {
    id: 4,
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with parmesan and croutons',
    price: 8.99,
    category: 'appetizer',
    available: true
  },
  {
    id: 5,
    name: 'Hot Choky',
    description: 'Kenco Hot chokky',
    price: 1.99,
    category: 'drink',
    available: true
  }
];

async function seedDatabase() {
  try {
    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');
    
    // Insert new menu items
    await MenuItem.insertMany(menuItems);
    console.log('Added new menu items');
    
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();