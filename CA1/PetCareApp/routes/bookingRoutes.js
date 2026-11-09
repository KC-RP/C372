const express = require('express');
const { isCustomer, isAdmin } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get('/bookings', isCustomer, bookingController.listCustomerBookings);
router.post('/bookings', isCustomer, bookingController.createBooking);
router.get('/bookings/:id/confirmation', isCustomer, bookingController.showConfirmation);
router.get('/admin/bookings', isAdmin, bookingController.listAdminBookings);
router.post('/admin/bookings/:id/status', isAdmin, bookingController.updateBookingStatus);

module.exports = router;
