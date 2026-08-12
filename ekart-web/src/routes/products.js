const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.get('/',     getProducts);
router.get('/:id',  getProduct);
router.post('/',    protect, adminOnly, validate(schemas.productSchema), createProduct);
router.put('/:id',  protect, adminOnly, validate(schemas.productSchema), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
