-- MySQL init script — runs once when the container is first created.
-- The database itself is created by MYSQL_DATABASE env var.

USE ironclad_db;

-- UTF8MB4 default for full emoji + Unicode support
ALTER DATABASE ironclad_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to app user (Docker only — use fine-grained grants in production)
GRANT ALL PRIVILEGES ON ironclad_db.* TO 'ironclad'@'%';
FLUSH PRIVILEGES;
