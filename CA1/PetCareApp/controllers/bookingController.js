const Booking = require('../models/bookingModel');

const bookingStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

function parseStartTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getTime() <= Date.now()
  ) {
    return null;
  }

  return value.replace('T', ' ');
}

function parseServiceIds(value) {
  const ids = Array.isArray(value) ? value : [value];
  if (!ids.length || ids.some((id) => typeof id !== 'string' || !/^\d+$/.test(id))) return null;
  const uniqueIds = [...new Set(ids.map(Number))];
  if (uniqueIds.some((id) => !Number.isSafeInteger(id) || id < 1)) return null;
  return uniqueIds;
}

function showBookingError(req, res, message) {
  req.flash('error', message);
  res.redirect('/services');
}

async function createBooking(req, res) {
  const petIdInput = req.body.petId;
  const petId = typeof petIdInput === 'string' && /^\d+$/.test(petIdInput)
    ? Number(petIdInput)
    : NaN;
  const serviceIds = parseServiceIds(req.body.serviceIds);
  const startTime = parseStartTime(req.body.startTime);

  if (!Number.isSafeInteger(petId) || petId < 1) {
    return showBookingError(req, res, 'Choose one of your pets to book.');
  }
  if (!serviceIds) {
    return showBookingError(req, res, 'Select at least one valid service.');
  }
  if (!startTime) {
    return showBookingError(req, res, 'Choose a valid date and time in the future.');
  }

  try {
    const bookingId = await Booking.createForCustomer(
      req.session.user.id,
      petId,
      serviceIds,
      startTime
    );
    res.redirect(`/bookings/${bookingId}/confirmation`);
  } catch (err) {
    if (err.code === 'INVALID_PET' || err.code === 'INVALID_SERVICES') {
      return showBookingError(req, res, err.message);
    }
    if (err.code === 'TOTAL_LIMIT') {
      return showBookingError(req, res, 'The selected services exceed the maximum booking total.');
    }
    console.error('Error creating booking:', err);
    showBookingError(req, res, 'Unable to create your booking. Please try again.');
  }
}

async function listCustomerBookings(req, res) {
  try {
    const bookings = await Booking.findForCustomer(req.session.user.id);
    res.render('bookings', {
      bookings,
      session: req.session,
      errors: req.flash('error'),
      messages: req.flash('success')
    });
  } catch (err) {
    console.error('Error loading customer bookings:', err);
    res.status(500).send('Unable to load your bookings.');
  }
}

async function showConfirmation(req, res) {
  const bookingId = Number(req.params.id);
  if (!Number.isSafeInteger(bookingId) || bookingId < 1) return res.status(404).send('Booking not found.');

  try {
    const booking = await Booking.findForCustomerById(req.session.user.id, bookingId);
    if (!booking) return res.status(404).send('Booking not found.');
    res.render('bookingConfirmation', { booking, session: req.session });
  } catch (err) {
    console.error('Error loading booking confirmation:', err);
    res.status(500).send('Unable to load the booking confirmation.');
  }
}

async function listAdminBookings(req, res) {
  try {
    const bookings = await Booking.findAll();
    res.render('adminBookings', {
      bookings,
      bookingStatuses,
      session: req.session,
      errors: req.flash('error'),
      messages: req.flash('success')
    });
  } catch (err) {
    console.error('Error loading admin bookings:', err);
    res.status(500).send('Unable to load bookings.');
  }
}

async function updateBookingStatus(req, res) {
  const bookingId = Number(req.params.id);
  const status = req.body.status;
  if (!Number.isSafeInteger(bookingId) || bookingId < 1) return res.status(404).send('Booking not found.');
  if (!bookingStatuses.includes(status)) {
    req.flash('error', 'Choose a valid booking status.');
    return res.redirect('/admin/bookings');
  }

  try {
    const exists = await Booking.updateStatus(bookingId, status);
    if (!exists) return res.status(404).send('Booking not found.');
    req.flash('success', `Booking #${bookingId} updated to ${status}.`);
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error('Error updating booking status:', err);
    req.flash('error', 'Unable to update the booking status.');
    res.redirect('/admin/bookings');
  }
}

module.exports = {
  createBooking,
  listCustomerBookings,
  showConfirmation,
  listAdminBookings,
  updateBookingStatus
};
