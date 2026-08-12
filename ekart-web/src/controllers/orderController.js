const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// POST /api/checkout
exports.checkout = async (req, res) => {
  try {
    const { paymentMethod, shippingAddress, couponCode } = req.body;

    // Fetch user's cart
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty.' });
    }

    // Validate stock for all items atomically before charging
    const stockErrors = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) { stockErrors.push(`${item.name} is no longer available.`); continue; }
      if (product.stock < item.quantity) {
        stockErrors.push(`${item.name}: only ${product.stock} unit(s) left.`);
      }
    }
    if (stockErrors.length > 0) {
      return res.status(400).json({ success: false, errors: stockErrors });
    }

    // Calculate total (apply 5% coupon discount if code matches)
    let total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (couponCode === 'EKART5') total = total * 0.95;
    total = parseFloat(total.toFixed(2));

    // Create Payment Intent via Stripe (env var — never hardcoded)
    let paymentIntentId = 'pi_simulated_' + Date.now();
    if (process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),  // Stripe uses paise/cents
        currency: 'inr',
        metadata: { userId: req.user.id.toString() },
      });
      paymentIntentId = intent.id;
    }

    // Decrement stock atomically using conditional update
    for (const item of cart.items) {
      const result = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!result) {
        return res.status(409).json({ success: false, error: `${item.name} just went out of stock. Please update your cart.` });
      }
    }

    // Create order record
    const order = await Order.create({
      userId: req.user.id,
      items: cart.items.map((i) => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      totalAmount: total,
      paymentMethod,
      paymentIntentId,
      paymentStatus: process.env.NODE_ENV === 'production' ? 'pending' : 'paid',
      status: 'processing',
      shippingAddress,
    });

    // Clear the cart after successful order
    await Cart.findOneAndDelete({ userId: req.user.id });

    res.status(201).json({ success: true, order, message: 'Order placed successfully!' });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ success: false, error: 'Checkout failed. Please try again.' });
  }
};

// GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch orders.' });
  }
};

// GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch order.' });
  }
};
