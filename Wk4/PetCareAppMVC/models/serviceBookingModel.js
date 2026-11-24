const connection = require('../config/db');

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  connection.beginTransaction((transactionErr) => {
    if (transactionErr) {
      return callback(transactionErr);
    }

    connection.query(
      'SELECT id, owner_id FROM pets WHERE id = ? AND owner_id = ? FOR UPDATE',
      [petId, ownerId],
      (petErr, petRows) => {
        if (petErr) {
          return connection.rollback(() => callback(petErr));
        }

        if (!petRows.length) {
          return connection.rollback(() => callback(null, null));
        }

        connection.query(
          'SELECT id, name, price FROM services WHERE id = ? AND is_active = 1 FOR UPDATE',
          [serviceId],
          (serviceErr, serviceRows) => {
            if (serviceErr) {
              return connection.rollback(() => callback(serviceErr));
            }

            if (!serviceRows.length) {
              return connection.rollback(() => callback(null, null));
            }

            const selectedService = serviceRows[0];

            connection.query(
              'INSERT INTO service_bookings (pet_id, service_id, booking_status, booked_price, booking_date) VALUES (?, ?, ?, ?, ?)',
              [petId, serviceId, 'pending', selectedService.price, bookingDate],
              (bookingErr, bookingResult) => {
                if (bookingErr) {
                  return connection.rollback(() => callback(bookingErr));
                }

                const bookingId = bookingResult.insertId;
                connection.query(
                  'INSERT INTO payments (booking_id, amount, payment_status) VALUES (?, ?, ?)',
                  [bookingId, selectedService.price, 'pending'],
                  (paymentErr, paymentResult) => {
                    if (paymentErr) {
                      return connection.rollback(() => callback(paymentErr));
                    }

                    connection.commit((commitErr) => {
                      if (commitErr) {
                        return connection.rollback(() => callback(commitErr));
                      }

                      callback(null, {
                        bookingId,
                        paymentId: paymentResult.insertId
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      sb.id AS booking_id,
      sb.booking_date,
      p.name AS pet_name,
      s.name AS service_name,
      sb.booked_price,
      sb.booking_status,
      pay.payment_status
    FROM service_bookings sb
    JOIN pets p ON p.id = sb.pet_id
    JOIN services s ON s.id = sb.service_id
    LEFT JOIN payments pay ON pay.booking_id = sb.id
    WHERE p.owner_id = ?
    ORDER BY sb.created_at DESC, sb.id DESC
  `;

  connection.query(sql, [ownerId], callback);
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner
};
