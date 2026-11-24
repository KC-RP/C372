const serviceBookingModel = require('../models/serviceBookingModel');
const MockProvider = require('../services/mockPaymentProvider');

const bookingStatusByPayment = {
  APPROVED: 'CONFIRMED',
  PENDING: 'AWAITING_PAYMENT',
  DECLINED: 'PAYMENT_FAILED'
};
const allowedOutcomes = ['APPROVED', 'PENDING', 'DECLINED'];

exports.createMockPayment = (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const requestedOutcome = req.body?.testStatus || 'RANDOM';

  if (!Number.isInteger(bookingId) || bookingId < 1) {
    return res.status(400).send('Invalid booking ID.');
  }

  if (requestedOutcome !== 'RANDOM' && !allowedOutcomes.includes(requestedOutcome)) {
    return res.status(400).send('Invalid simulated payment outcome.');
  }

  const ownerId = req.session.user.id;
  serviceBookingModel.getBookingForPayment(bookingId, ownerId, (bookingError, booking) => {
    if (bookingError) {
      console.error('Error retrieving booking for payment:', bookingError);
      return res.status(500).send('Unable to retrieve booking.');
    }

    if (!booking) return res.status(404).send('Booking not found.');
    if (booking.booking_status !== 'pending') {
      return res.status(409).send('This booking has already been processed.');
    }

    const amount = Number(booking.booked_price);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(500).send('Booking has an invalid amount.');
    }

    const paymentRequest = {
      amount,
      currency: 'sgd',
      merchantReference: `BOOKING-${booking.id}-${Date.now()}`,
      description: booking.service_name,
      testStatus: requestedOutcome === 'RANDOM' ? undefined : requestedOutcome
    };

    MockProvider.createPayment(paymentRequest).then(providerResult => {
      const bookingStatus = bookingStatusByPayment[providerResult.status];
      if (!bookingStatus || !providerResult.providerPaymentId) {
        return res.status(502).send('The mock payment provider returned an invalid result.');
      }

      serviceBookingModel.recordPaymentResult(
        ownerId,
        bookingId,
        providerResult.status,
        providerResult.providerPaymentId,
        bookingStatus,
        (saveError, savedPayment) => {
          if (saveError) {
            console.error('Error saving payment result:', saveError);
            return res.status(500).send('Unable to save payment result.');
          }

          if (!savedPayment) {
            return res.status(409).send('This booking has already been processed.');
          }

          return res.render('paymentResult', {
            bookingId,
            serviceName: booking.service_name,
            amount: Number(savedPayment.amount),
            paymentStatus: providerResult.status,
            bookingStatus,
            paymentReference: providerResult.providerPaymentId,
            session: req.session
          });
        }
      );
    }).catch(error => {
      console.error('Mock payment provider error:', error);
      return res.status(502).send('Unable to generate a payment result.');
    });
  });
};
