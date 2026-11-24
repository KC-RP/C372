const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString() {
  return formatLocalDate(new Date());
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseBookingDate(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [yearText, monthText, dayText] = trimmed.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (parsedDate < startOfToday) {
    return null;
  }

  return trimmed;
}

function listServices(req, res) {
  const ownerId = req.session.user.id;

  petModel.getPetsByOwner(ownerId, (petErr, pets) => {
    if (petErr) {
      console.error('Error loading pets:', petErr);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceErr, services) => {
      if (serviceErr) {
        console.error('Error loading services:', serviceErr);
        return res.status(500).send('Unable to load services.');
      }

      let selectedPetId = '';
      const requestedPetId = req.query.petId;
      if (requestedPetId !== undefined && requestedPetId !== null && requestedPetId !== '') {
        const parsedPetId = parsePositiveInteger(requestedPetId);
        if (parsedPetId && pets.some((pet) => Number(pet.id) === parsedPetId)) {
          selectedPetId = String(parsedPetId);
        }
      }

      return res.render('services', {
        pets: pets || [],
        services: services || [],
        selectedPetId,
        today: getTodayString(),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const petId = parsePositiveInteger(req.body.petId);
  const serviceId = parsePositiveInteger(req.body.serviceId);
  const bookingDate = parseBookingDate(req.body.bookingDate);

  if (!petId || !serviceId || !bookingDate) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(req.session.user.id, petId, serviceId, bookingDate, (err, result) => {
    if (err) {
      console.error('Error creating booking:', err);
      req.flash('error', 'Unable to create the booking. Please try again.');
      const redirectUrl = petId ? `/services?petId=${petId}` : '/services';
      return res.redirect(redirectUrl);
    }

    if (!result) {
      req.flash('error', 'That pet or service is unavailable for booking.');
      return res.redirect('/services');
    }

    req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
    return res.redirect('/bookings');
  });
}

function listBookings(req, res) {
  const ownerId = req.session.user.id;

  serviceBookingModel.getBookingsByOwner(ownerId, (err, bookings) => {
    if (err) {
      console.error('Error loading booking history:', err);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings: bookings || [],
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

module.exports = {
  listServices,
  createBooking,
  listBookings
};
