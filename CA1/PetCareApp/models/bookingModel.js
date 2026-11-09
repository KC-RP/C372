const connection = require('../config/db');
const promisePool = connection.promise();

const bookingDetailsSql = `
  SELECT
    b.booking_id,
    b.user_id,
    b.pets_id,
    DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i') AS start_time_display,
    DATE_FORMAT(b.end_time, '%Y-%m-%d %H:%i') AS end_time_display,
    b.status,
    b.price,
    b.paid,
    u.name AS customer_name,
    u.username AS customer_username,
    p.name AS pet_name,
    p.species AS pet_species,
    bs.service_id,
    bs.service_name,
    bs.unit_price,
    bs.duration_minutes
  FROM booking b
  JOIN users u ON u.id = b.user_id
  JOIN pets p ON p.id = b.pets_id
  LEFT JOIN booking_services bs ON bs.booking_id = b.booking_id
`;

function groupBookingRows(rows) {
  const bookings = new Map();
  rows.forEach((row) => {
    let booking = bookings.get(row.booking_id);
    if (!booking) {
      booking = {
        booking_id: row.booking_id,
        user_id: row.user_id,
        pets_id: row.pets_id,
        start_time_display: row.start_time_display,
        end_time_display: row.end_time_display,
        status: row.status,
        price: row.price,
        paid: row.paid,
        customer_name: row.customer_name,
        customer_username: row.customer_username,
        pet_name: row.pet_name,
        pet_species: row.pet_species,
        services: []
      };
      bookings.set(row.booking_id, booking);
    }

    if (row.service_id !== null) {
      booking.services.push({
        service_id: row.service_id,
        name: row.service_name,
        price: row.unit_price,
        duration: row.duration_minutes
      });
    }
  });
  return Array.from(bookings.values());
}

function formatSqlDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function createForCustomer(userId, petId, serviceIds, startTime) {
  const db = await promisePool.getConnection();
  try {
    await db.beginTransaction();

    const [pets] = await db.query(
      'SELECT id FROM pets WHERE id = ? AND owner_id = ? FOR UPDATE',
      [petId, userId]
    );
    if (!pets.length) {
      const error = new Error('The selected pet does not belong to your account.');
      error.code = 'INVALID_PET';
      throw error;
    }

    const [services] = await db.query(
      'SELECT service_id, name, cost, duration FROM services WHERE is_active = 1 AND service_id IN (?) FOR UPDATE',
      [serviceIds]
    );
    if (services.length !== serviceIds.length) {
      const error = new Error('One or more selected services are no longer available.');
      error.code = 'INVALID_SERVICES';
      throw error;
    }

    const totalCents = services.reduce((total, service) => total + Math.round(Number(service.cost) * 100), 0);
    const totalDuration = services.reduce((total, service) => total + Number(service.duration), 0);
    if (totalCents > 9999999999) {
      const error = new Error('The selected services exceed the maximum booking total.');
      error.code = 'TOTAL_LIMIT';
      throw error;
    }
    const start = new Date(`${startTime.replace(' ', 'T')}:00`);
    start.setMinutes(start.getMinutes() + totalDuration);
    const endTime = formatSqlDate(start);
    const totalPrice = (totalCents / 100).toFixed(2);

    const [result] = await db.query(
      'INSERT INTO booking (user_id, pets_id, start_time, end_time, status, price, paid) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [userId, petId, `${startTime}:00`, endTime, 'Pending', totalPrice]
    );

    const serviceRows = services.map((service) => [
      result.insertId,
      service.service_id,
      service.name,
      Number(service.cost).toFixed(2),
      service.duration
    ]);
    await db.query(
      'INSERT INTO booking_services (booking_id, service_id, service_name, unit_price, duration_minutes) VALUES ?',
      [serviceRows]
    );
    await db.commit();
    return result.insertId;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

async function findForCustomer(userId) {
  const [rows] = await promisePool.query(
    `${bookingDetailsSql} WHERE b.user_id = ? ORDER BY b.start_time DESC, b.booking_id DESC`,
    [userId]
  );
  return groupBookingRows(rows);
}

async function findForCustomerById(userId, bookingId) {
  const [rows] = await promisePool.query(
    `${bookingDetailsSql} WHERE b.user_id = ? AND b.booking_id = ? ORDER BY b.booking_id`,
    [userId, bookingId]
  );
  return groupBookingRows(rows)[0] || null;
}

async function findAll() {
  const [rows] = await promisePool.query(
    `${bookingDetailsSql} ORDER BY b.start_time DESC, b.booking_id DESC`
  );
  return groupBookingRows(rows);
}

async function updateStatus(bookingId, status) {
  const [result] = await promisePool.query(
    'UPDATE booking SET status = ? WHERE booking_id = ?',
    [status, bookingId]
  );
  if (result.affectedRows) return true;

  const [rows] = await promisePool.query(
    'SELECT booking_id FROM booking WHERE booking_id = ?',
    [bookingId]
  );
  return rows.length > 0;
}

module.exports = {
  createForCustomer,
  findForCustomer,
  findForCustomerById,
  findAll,
  updateStatus
};
