-- Apply once to an existing database created from the previous CA1_PetCareApp.sql schema.
USE petcare;

ALTER TABLE services
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE booking
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  ADD COLUMN paid TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE booking_services (
  booking_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (booking_id, service_id),
  INDEX idx_booking_services_service_id (service_id),
  CONSTRAINT fk_booking_services_booking
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_booking_services_service
    FOREIGN KEY (service_id) REFERENCES services(service_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;
