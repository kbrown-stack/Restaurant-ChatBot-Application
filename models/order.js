// The order Models for the mongoose

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['current', 'placed', 'paid', 'cancelled'],
    default: 'current'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  scheduledFor: {
    type: Date
  },
  paymentReference: {
    type: String
  }
});

module.exports = mongoose.model('Order', orderSchema);