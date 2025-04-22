// This is the Mongoose Model set up.

//MenuItems
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main', 'dessert', 'drink']
  },
  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
