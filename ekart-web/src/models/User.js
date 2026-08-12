const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 50 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
  password:  { type: String, required: true, select: false },  // never returned by default
  phone:     { type: String, trim: true, maxlength: 15 },
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },
  address:   {
    street: String, city: String, state: String, pincode: String,
  },
  createdAt: { type: Date, default: Date.now },
}, { strict: true });  // strict: reject unknown fields at schema level

// Hash password before save — never store plaintext
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
