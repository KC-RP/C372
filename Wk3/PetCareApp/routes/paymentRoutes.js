const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.get('/payments/prepare/:serviceId', paymentController.preparePayment);

module.exports = router;
