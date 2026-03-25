-- 001_create_users.sql
-- Creates the users table with all required columns and indexes.

CREATE TABLE IF NOT EXISTS users (
  id                      CHAR(36)        NOT NULL PRIMARY KEY,
  first_name              VARCHAR(80)     NOT NULL,
  last_name               VARCHAR(80)     NOT NULL,
  email                   VARCHAR(255)    NOT NULL,
  password                VARCHAR(255)    NOT NULL,
  role                    ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  phone                   VARCHAR(30)     DEFAULT NULL,
  is_active               TINYINT(1)      NOT NULL DEFAULT 1,
  password_reset_token    VARCHAR(255)    DEFAULT NULL,
  password_reset_expires  DATETIME        DEFAULT NULL,
  last_login              DATETIME        DEFAULT NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at              DATETIME        DEFAULT NULL,

  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_role     ON users (role, is_active);
CREATE INDEX idx_users_deleted  ON users (deleted_at);
