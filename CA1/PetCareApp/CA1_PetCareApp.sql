CREATE DATABASE IF NOT EXISTS petcare
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petcare;

-- Fresh-install/reset script: the DROP statements below delete existing application data.
-- For an existing installation, use migrations/add_service_booking_features.sql instead.
-- Drop child tables first
DROP TABLE IF EXISTS booking_services;
DROP TABLE IF EXISTS booking;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS journal;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password CHAR(64) NOT NULL,          -- SHA-256 hash (64 characters)
  name VARCHAR(100) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(80) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pets_owner_id (owner_id),
  CONSTRAINT fk_pets_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE journal (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pet_id INT UNSIGNED NOT NULL,
  activity VARCHAR(120) NOT NULL,
  notes TEXT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_pet_id (pet_id),
  INDEX idx_journal_entry_date (entry_date),
  CONSTRAINT fk_journal_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Sample users
-- Plain passwords:
-- admin1 / admin123
-- amy / user123
-- ben / user123
-- clara / user123
INSERT INTO users (id, username, password, name, role) VALUES
(1, 'admin1', SHA2('admin123', 256), 'Hannah Admin', 'admin'),
(2, 'amy',    SHA2('user123', 256),  'Amy Tan',      'user'),
(3, 'ben',    SHA2('user123', 256),  'Ben Lim',      'user'),
(4, 'clara',  SHA2('user123', 256),  'Clara Ng',     'user');

-- Sample pets (image names aligned with your public/images folder)
INSERT INTO pets (id, owner_id, name, species, breed, age, image) VALUES
(1, 1, 'Chester', 'Dog', 'Pomeranian', 3, '1751953011050_chester.jpg'),
(2, 2, 'Hammy',   'Hamster', 'Syrian', 1, '1751905564825_hammy.jpg'),
(3, 3, 'Molly',   'Dog', 'West Highland Terrier', 4, 'molly.jpg'),
(4, 3, 'Mochi',   'Dog', 'Maltese', 2, 'Mochi.png'),
(5, 4, 'Mira',    'Cat', 'Ragdoll', 5, 'mira.jpg');

-- Sample journal entries
INSERT INTO journal (pet_id, activity, notes, entry_date) VALUES
(1, 'Morning Walk', '30-minute walk at the park', '2026-08-10'),
(1, 'Grooming', 'Brushed coat and trimmed nails', '2026-08-11'),
(2, 'Cage Cleaning', 'Replaced bedding and cleaned wheel', '2026-08-09'),
(2, 'Feeding', 'Gave sunflower mix and fresh water', '2026-08-11'),
(3, 'Vet Visit', 'Annual check-up completed', '2026-08-08'),
(3, 'Playtime', 'Played fetch in the living room', '2026-08-12'),
(4, 'Litter Box', 'Cleaned litter and changed liner', '2026-08-10'),
(4, 'Napping', 'Slept most of the afternoon', '2026-08-12'),
(5, 'Walk', 'Short evening walk', '2026-08-07'),
(5, 'Bath', 'Mild shampoo bath and dry', '2026-08-11');

CREATE TABLE services (
  service_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  cost DECIMAL(10,2) NOT NULL,
  duration SMALLINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE booking (
  booking_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pets_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  price DECIMAL(10,2) NOT NULL,
  paid TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_booking_user_id (user_id),
  INDEX idx_booking_pets_id (pets_id),
  CONSTRAINT fk_booking_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_booking_pet
    FOREIGN KEY (pets_id) REFERENCES pets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

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
