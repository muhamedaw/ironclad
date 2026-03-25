-- 002_create_products.sql
-- Products with vehicle compatibility range and full-text search support.

CREATE TABLE IF NOT EXISTS products (
  id              CHAR(36)          NOT NULL PRIMARY KEY,
  name            VARCHAR(255)      NOT NULL,
  sku             VARCHAR(60)       NOT NULL,
  description     TEXT              DEFAULT NULL,
  brand           VARCHAR(80)       NOT NULL,
  model           VARCHAR(100)      NOT NULL,
  year_from       SMALLINT UNSIGNED NOT NULL,
  year_to         SMALLINT UNSIGNED DEFAULT NULL,
  category        ENUM('engine','brakes','electrical','body','interior','exhaust','cooling','fuel','other')
                                    NOT NULL DEFAULT 'other',
  price           DECIMAL(10,2)     NOT NULL,
  original_price  DECIMAL(10,2)     DEFAULT NULL,
  stock_quantity  INT UNSIGNED      NOT NULL DEFAULT 0,
  images          JSON              NOT NULL DEFAULT (JSON_ARRAY()),
  rating_avg      DECIMAL(3,2)      NOT NULL DEFAULT 0.00,
  rating_count    INT UNSIGNED      NOT NULL DEFAULT 0,
  is_active       TINYINT(1)        NOT NULL DEFAULT 1,
  is_featured     TINYINT(1)        NOT NULL DEFAULT 0,
  shipping_days   TINYINT UNSIGNED  NOT NULL DEFAULT 3,
  weight_kg       DECIMAL(6,3)      DEFAULT NULL,
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME          DEFAULT NULL,

  CONSTRAINT uq_products_sku UNIQUE (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vehicle compatibility lookup (most common filter)
CREATE INDEX idx_vehicle          ON products (brand, model, year_from, year_to);
CREATE INDEX idx_category_active  ON products (category, is_active);
CREATE INDEX idx_price            ON products (price);
CREATE INDEX idx_featured         ON products (is_featured, is_active);

-- Full-text search on name and description
ALTER TABLE products ADD FULLTEXT INDEX ft_name_desc (name, description);
