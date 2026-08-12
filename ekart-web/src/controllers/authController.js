const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, phone });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

// POST /api/auth/login  — rate limited upstream
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'invalid mail' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'incorrect password' });
    }

    const token = signToken(user);

    // Log to encrypted file database
    const { logActivity, getProfile } = require('../services/fileDatabase');
    await logActivity(user._id, { type: 'login', email: user.email });

    // Retrieve and merge persisted profile from file database (for fallback/consistency)
    const fileProfile = await getProfile(user._id);
    const userData = { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
    if (fileProfile) {
      if (fileProfile.name) userData.name = fileProfile.name;
      if (fileProfile.phone) userData.phone = fileProfile.phone;
    }

    res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { getProfile } = require('../services/fileDatabase');
    const fileProfile = await getProfile(req.user.id);

    if (!user) {
      if (fileProfile) {
        return res.json({ 
          success: true, 
          user: { id: req.user.id, name: fileProfile.name, phone: fileProfile.phone, role: req.user.role } 
        });
      }
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const userData = { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
    if (fileProfile) {
      if (fileProfile.name) userData.name = fileProfile.name;
      if (fileProfile.phone) userData.phone = fileProfile.phone;
    }

    res.json({ success: true, user: userData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch user.' });
  }
};

// PATCH /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    // Log and Persist to encrypted file database
    const { logActivity, saveProfile } = require('../services/fileDatabase');
    await logActivity(user._id, { type: 'profile_update', updatedFields: { name: !!name, phone: phone !== undefined } });
    await saveProfile(user._id, { name: user.name, phone: user.phone });

    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
};
