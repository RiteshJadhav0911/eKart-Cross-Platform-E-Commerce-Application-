const express = require('express');
const router = express.Router();
const { checkout, getOrders, getOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.post('/checkout', validate(schemas.checkoutSchema), checkout);
router.get('/',          getOrders);
router.get('/:id',       getOrder);

module.exports = router;
