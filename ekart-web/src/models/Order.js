const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items:           [orderItemSchema],
  totalAmount:     { type: Number, required: true },
  status:          { type: String, enum: ['pending','processing','shipped','delivered','cancelled'], default: 'pending' },
  paymentStatus:   { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  paymentMethod:   { type: String, enum: ['card','upi','wallet'] },
  paymentIntentId: { type: String },   // Stripe payment intent ID — not the secret
  shippingAddress: {
    street: String, city: String, state: String, pincode: String,
  },
  createdAt: { type: Date, default: Date.now },
}, { strict: true });

module.exports = mongoose.model('Order', orderSchema);
