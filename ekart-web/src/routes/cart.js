const express = require('express');
const router = express.Router();
const { getCart, addItem, removeItem, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect); // all cart routes require auth

router.get('/',                  getCart);
router.post('/add',              validate(schemas.cartItemSchema), addItem);
router.delete('/:productId',     removeItem);
router.delete('/',               clearCart);

module.exports = router;
