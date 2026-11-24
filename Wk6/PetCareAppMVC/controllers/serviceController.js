const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidBookingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isRealDate = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;

  return isRealDate && value >= getTodayDate();
}

function listServices(req, res) {
  const userId = req.session.user.id;

  petModel.getPetsByOwner(userId, (petError, pets) => {
    if (petError) {
      console.error('Error loading pets for service booking:', petError);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceError, services) => {
      if (serviceError) {
        console.error('Error loading services:', serviceError);
        return res.status(500).send('Unable to load services.');
      }

      const requestedPetId = Number(req.query.petId);
      const selectedPet = pets.find(pet => Number(pet.id) === requestedPetId);

      return res.render('services', {
        pets,
        services,
        selectedPetId: selectedPet ? String(selectedPet.id) : '',
        today: getTodayDate(),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const petId = Number(req.body.petId);
  const serviceId = Number(req.body.serviceId);
  const bookingDate = req.body.bookingDate;
  const validIds = Number.isInteger(petId) && petId > 0
    && Number.isInteger(serviceId) && serviceId > 0;

  if (!validIds || !isValidBookingDate(bookingDate)) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(
    req.session.user.id,
    petId,
    serviceId,
    bookingDate,
    (error, booking) => {
      if (error) {
        console.error('Error creating service booking:', error);
        req.flash('error', 'Unable to create the booking. Please try again.');
        return res.redirect(`/services?petId=${petId}`);
      }

      if (!booking) {
        req.flash('error', 'That pet or service is unavailable for booking.');
        return res.redirect('/services');
      }

      req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
      return res.redirect('/bookings');
    }
  );
}

function listBookings(req, res) {
  serviceBookingModel.getBookingsByOwner(req.session.user.id, (error, bookings) => {
    if (error) {
      console.error('Error loading booking history:', error);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings,
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

module.exports = { listServices, createBooking, listBookings };