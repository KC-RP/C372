const connection = require('../config/db');

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      sb.id AS booking_id,
      p.name AS pet_name,
      s.name AS service_name,
      DATE_FORMAT(sb.booking_date, '%Y-%m-%d') AS booking_date,
      sb.booked_price,
      sb.booking_status,
      pay.payment_status,
      pay.payment_reference,
      sb.created_at
    FROM service_bookings AS sb
    JOIN pets AS p ON p.id = sb.pet_id
    JOIN services AS s ON s.id = sb.service_id
    LEFT JOIN payments AS pay ON pay.booking_id = sb.id
    WHERE p.owner_id = ?
    ORDER BY sb.created_at DESC, sb.id DESC
  `;

  connection.query(sql, [ownerId], callback);
}

function getBookingForPayment(bookingId, ownerId, callback) {
  const sql = `
    SELECT sb.id, sb.booked_price, sb.booking_status, s.name AS service_name
    FROM service_bookings AS sb
    JOIN pets AS p ON p.id = sb.pet_id
    JOIN services AS s ON s.id = sb.service_id
    WHERE sb.id = ? AND p.owner_id = ?
  `;

  connection.query(sql, [bookingId, ownerId], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function recordPaymentResult(ownerId, bookingId, paymentStatus, paymentReference, bookingStatus, callback) {
  connection.getConnection((connectionError, dbConnection) => {
    if (connectionError) return callback(connectionError);

    dbConnection.beginTransaction(transactionError => {
      if (transactionError) {
        dbConnection.release();
        return callback(transactionError);
      }

      const rollback = (error, result) => {
        dbConnection.rollback(() => {
          dbConnection.release();
          callback(error, result);
        });
      };

      const bookingSql = `
        SELECT sb.id, sb.booked_price, sb.booking_status
        FROM service_bookings AS sb
        JOIN pets AS p ON p.id = sb.pet_id
        WHERE sb.id = ? AND p.owner_id = ?
        FOR UPDATE
      `;

      dbConnection.query(bookingSql, [bookingId, ownerId], (bookingError, bookingRows) => {
        if (bookingError) return rollback(bookingError);
        if (!bookingRows.length || bookingRows[0].booking_status !== 'pending') {
          return rollback(null, null);
        }

        const booking = bookingRows[0];
        const amount = booking.booked_price;
        const existingPaymentSql = `
          SELECT id
          FROM payments
          WHERE booking_id = ?
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
        `;

        dbConnection.query(existingPaymentSql, [bookingId], (paymentLookupError, paymentRows) => {
          if (paymentLookupError) return rollback(paymentLookupError);

          const savePayment = paymentRows.length
            ? dbConnection.query.bind(dbConnection,
              'UPDATE payments SET amount = ?, payment_status = ?, payment_reference = ? WHERE id = ?',
              [amount, paymentStatus, paymentReference, paymentRows[0].id])
            : dbConnection.query.bind(dbConnection,
              'INSERT INTO payments (booking_id, amount, payment_status, payment_reference) VALUES (?, ?, ?, ?)',
              [bookingId, amount, paymentStatus, paymentReference]);

          savePayment((saveError, paymentResult) => {
            if (saveError) return rollback(saveError);

            dbConnection.query(
              'UPDATE service_bookings SET booking_status = ? WHERE id = ?',
              [bookingStatus, bookingId],
              (updateError) => {
                if (updateError) return rollback(updateError);

                dbConnection.commit(commitError => {
                  if (commitError) return rollback(commitError);

                  dbConnection.release();
                  callback(null, {
                    amount,
                    paymentId: paymentRows.length ? paymentRows[0].id : paymentResult.insertId
                  });
                });
              }
            );
          });
        });
      });
    });
  });
}

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  connection.getConnection((connectionError, dbConnection) => {
    if (connectionError) return callback(connectionError);

    dbConnection.beginTransaction((transactionError) => {
      if (transactionError) {
        dbConnection.release();
        return callback(transactionError);
      }

      const rollback = (error, result) => {
        dbConnection.rollback(() => {
          dbConnection.release();
          callback(error, result);
        });
      };

      const bookingSql = `
        INSERT INTO service_bookings
          (pet_id, service_id, booking_status, booked_price, booking_date)
        SELECT p.id, s.id, 'pending', s.price, ?
        FROM pets AS p
        JOIN services AS s ON s.id = ?
        WHERE p.id = ? AND p.owner_id = ? AND s.is_active = 1
      `;

      dbConnection.query(bookingSql, [bookingDate, serviceId, petId, ownerId], (bookingError, bookingResult) => {
        if (bookingError) return rollback(bookingError);
        if (bookingResult.affectedRows !== 1) return rollback(null, null);

        const bookingId = bookingResult.insertId;
        const paymentSql = `
          INSERT INTO payments (booking_id, amount, payment_status)
          SELECT id, booked_price, 'pending'
          FROM service_bookings
          WHERE id = ?
        `;

        dbConnection.query(paymentSql, [bookingId], (paymentError, paymentResult) => {
          if (paymentError) return rollback(paymentError);

          dbConnection.commit((commitError) => {
            if (commitError) return rollback(commitError);

            dbConnection.release();
            callback(null, {
              bookingId,
              paymentId: paymentResult.insertId
            });
          });
        });
      });
    });
  });
}

module.exports = {
  getBookingsByOwner,
  getBookingForPayment,
  recordPaymentResult,
  createPendingBooking
};