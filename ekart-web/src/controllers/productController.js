const Product = require('../models/Product');

// GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), products });
  } catch (err) {
    console.error('getProducts error:', err.message);
    res.status(500).json({ success: false, error: 'Could not fetch products.' });
  }
};

// GET /api/products/:id
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch product.' });
  }
};

// POST /api/products  (admin)
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error('createProduct error:', err.message);
    res.status(500).json({ success: false, error: 'Could not create product.' });
  }
};

// PUT /api/products/:id  (admin)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not update product.' });
  }
};

// DELETE /api/products/:id  (admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not delete product.' });
  }
};
