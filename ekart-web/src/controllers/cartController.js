const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET /api/cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }) || { items: [], userId: req.user.id };
    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ success: true, cart, subtotal: parseFloat(subtotal.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch cart.' });
  }
};

// POST /api/cart/add
exports.addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId).catch(() => null);
    
    // If product not in DB, use info from request (fallback for demo/offline logic)
    const itemName = product ? product.name : (req.body.name || 'Unknown Product');
    const itemPrice = product ? product.price : (req.body.price || 0);

    let cart = await Cart.findOne({ userId: req.user.id }).catch(() => null);
    if (!cart) cart = { userId: req.user.id, items: [] }; // Mock cart for demo logging

    const idx = cart.items.findIndex((i) => i.productId.toString() === productId);
    if (idx >= 0) {
      cart.items[idx].quantity = Math.min(cart.items[idx].quantity + quantity, 99);
    } else {
      cart.items.push({ productId, name: itemName, price: itemPrice, quantity, image: product?.image || '' });
    }

    if (cart.save && typeof cart.save === 'function') {
      await cart.save().catch(e => console.log('DB save skipped (offline)'));
    }

    // Log to encrypted file database (Always runs)
    const { writeUserFile, logActivity } = require('../services/fileDatabase');
    await writeUserFile(req.user.id, 'cart', cart.items);
    await logActivity(req.user.id, { type: 'cart_add', productId, quantity });

    res.json({ success: true, cart, itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) {
    console.error('addItem error:', err.message);
    res.status(500).json({ success: false, error: 'Could not add item to cart.' });
  }
};

// DELETE /api/cart/:productId
exports.removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, error: 'Cart not found.' });
    cart.items = cart.items.filter((i) => i.productId.toString() !== req.params.productId);
    await cart.save();

    // Log to encrypted file database
    const { writeUserFile, logActivity } = require('../services/fileDatabase');
    await writeUserFile(req.user.id, 'cart', cart.items);
    await logActivity(req.user.id, { type: 'cart_remove', productId: req.params.productId });

    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not remove item.' });
  }
};

// DELETE /api/cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.user.id });

    // Sync with file database
    const { writeUserFile, logActivity } = require('../services/fileDatabase');
    await writeUserFile(req.user.id, 'cart', []);
    await logActivity(req.user.id, { type: 'cart_clear' });

    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not clear cart.' });
  }
};
