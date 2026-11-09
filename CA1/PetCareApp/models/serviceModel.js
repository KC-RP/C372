const connection = require('../config/db');

function findActive(callback) {
  const sql = 'SELECT service_id, name, description, cost, duration FROM services WHERE is_active = 1 ORDER BY name';
  connection.query(sql, callback);
}

function findAll(callback) {
  const sql = 'SELECT service_id, name, description, cost, duration, is_active FROM services ORDER BY is_active DESC, name';
  connection.query(sql, callback);
}

function findById(serviceId, callback) {
  const sql = 'SELECT service_id, name, description, cost, duration, is_active FROM services WHERE service_id = ?';
  connection.query(sql, [serviceId], callback);
}

function create(name, description, cost, duration, callback) {
  const sql = 'INSERT INTO services (name, description, cost, duration) VALUES (?, ?, ?, ?)';
  connection.query(sql, [name, description, cost, duration], callback);
}

function update(serviceId, name, description, cost, duration, callback) {
  const sql = 'UPDATE services SET name = ?, description = ?, cost = ?, duration = ? WHERE service_id = ? AND is_active = 1';
  connection.query(sql, [name, description, cost, duration, serviceId], (err, result) => {
    if (err || result.affectedRows) return callback(err, result);

    connection.query(
      'SELECT service_id FROM services WHERE service_id = ? AND is_active = 1',
      [serviceId],
      (checkErr, rows) => {
        if (checkErr) return callback(checkErr);
        callback(null, { affectedRows: rows.length });
      }
    );
  });
}

function deactivate(serviceId, callback) {
  const sql = 'UPDATE services SET is_active = 0 WHERE service_id = ? AND is_active = 1';
  connection.query(sql, [serviceId], callback);
}

module.exports = { findActive, findAll, findById, create, update, deactivate };
