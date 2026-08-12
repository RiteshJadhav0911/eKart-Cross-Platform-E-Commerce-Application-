const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 100, index: true },
  price:       { type: Number, required: true, min: 0, max: 999999 },
  description: { type: String, maxlength: 2000, default: '' },
  category:    { type: String, required: true, enum: ['electronics','clothing','food','books','home','sports','other'], index: true },
  stock:       { type: Number, required: true, integer: true, min: 0, default: 0 },
  image:       { type: String, default: '' },
  ratings:     { average: { type: Number, default: 0, min: 0, max: 5 }, count: { type: Number, default: 0 } },
  createdAt:   { type: Date, default: Date.now },
}, { strict: true });

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
