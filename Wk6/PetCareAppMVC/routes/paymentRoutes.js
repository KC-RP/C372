const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/payments/mock/:bookingId', isLoggedIn, paymentController.createMockPayment);

module.exports = router;