-- =============================================================================
-- IRONCLAD — Car Spare Parts Marketplace
-- MySQL 8.0+ Database Schema
-- =============================================================================
-- Architecture overview:
--
--   users          → the humans (customers + admins)
--   addresses      → shipping/billing addresses per user
--   brands         → vehicle brands  (BMW, Toyota …)
--   models         → models per brand (3 Series, Camry …)
--   years          → model-years per model (2018, 2019 …)
--   categories     → part categories  (Brakes, Engine …) — self-referencing tree
--   products       → the spare parts
--   product_images → multiple images per product
--   product_compat → vehicle compatibility join  (product ↔ brand/model/year)
--   inventory_log  → full audit trail of every stock movement
--   coupons        → discount codes
--   orders         → order header
--   order_items    → line items (price-snapshotted)
--   order_status_history → full status audit trail
--   reviews        → 1 review per user per product
--   wishlists      → saved products
--   sessions       → refresh-token store (optional — use Redis in production)
--
-- Conventions used throughout:
--   * CHAR(36)    primary keys (UUID v4 — application-generated)
--   * snake_case  column names
--   * created_at / updated_at on every table
--   * deleted_at  on soft-deletable tables (paranoid)
--   * DECIMAL(10,2) for all money fields
--   * ENUM types  for finite, rarely-changing value sets
-- =============================================================================

SET NAMES utf8mb4;
SET
  time_zone = '+00:00';
SET
  foreign_key_checks = 0;
-- disable during setup

-- =============================================================================
-- 0. DATABASE
-- =============================================================================
CREATE DATABASE IF NOT EXISTS ironclad_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ironclad_db;

-- =============================================================================
-- 1. USERS
-- =============================================================================
CREATE TABLE users (
  id                      CHAR(36)     NOT NULL,
  first_name              VARCHAR(80)  NOT NULL,
  last_name               VARCHAR(80)  NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  password_hash           VARCHAR(255) NOT NULL        COMMENT 'bcrypt hash — never store plaintext',
  role                    ENUM('customer','admin','moderator')
                                       NOT NULL DEFAULT 'customer',
  phone                   VARCHAR(30)  DEFAULT NULL,
  avatar_url              VARCHAR(500) DEFAULT NULL,
  is_active               TINYINT(1)   NOT NULL DEFAULT 1,
  email_verified_at       DATETIME     DEFAULT NULL,
  password_reset_token    VARCHAR(255) DEFAULT NULL,
  password_reset_expires  DATETIME     DEFAULT NULL,
  last_login_at           DATETIME     DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at              DATETIME     DEFAULT NULL    COMMENT 'soft delete',

  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'All user accounts — customers and staff';

-- Index: login lookup
CREATE INDEX idx_users_email      ON users (email);
-- Index: admin queries by role + status
CREATE INDEX idx_users_role       ON users (role, is_active);
-- Index: soft-delete filter
CREATE INDEX idx_users_deleted_at ON users (deleted_at);


-- =============================================================================
-- 2. ADDRESSES
-- =============================================================================
CREATE TABLE addresses (
  id           CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  label        VARCHAR(60)  NOT NULL DEFAULT 'Home'
                                     COMMENT 'e.g. Home, Work, Shop',
  full_name    VARCHAR(160) NOT NULL,
  phone        VARCHAR(30)  DEFAULT NULL,
  line1        VARCHAR(200) NOT NULL,
  line2        VARCHAR(200) DEFAULT NULL,
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) DEFAULT NULL,
  postal_code  VARCHAR(20)  DEFAULT NULL,
  country_code CHAR(2)      NOT NULL  DEFAULT 'US'
                                     COMMENT 'ISO 3166-1 alpha-2',
  is_default   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_addresses PRIMARY KEY (id),
  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Shipping and billing addresses per user';

CREATE INDEX idx_addresses_user ON addresses (user_id);


-- =============================================================================
-- 3. VEHICLE HIERARCHY: brands → models → years
-- =============================================================================

-- 3a. brands
CREATE TABLE brands (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)      NOT NULL,
  slug       VARCHAR(120)      NOT NULL  COMMENT 'URL-safe identifier',
  logo_url   VARCHAR(500)      DEFAULT NULL,
  country    VARCHAR(60)       DEFAULT NULL,
  is_active  TINYINT(1)        NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_brands      PRIMARY KEY (id),
  CONSTRAINT uq_brands_slug UNIQUE (slug)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Vehicle manufacturers (BMW, Toyota, Ford …)';

CREATE INDEX idx_brands_active ON brands (is_active, sort_order);


-- 3b. models (child of brand)
CREATE TABLE models (
  id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  brand_id   SMALLINT UNSIGNED  NOT NULL,
  name       VARCHAR(120)       NOT NULL,
  slug       VARCHAR(140)       NOT NULL,
  body_style ENUM('sedan','coupe','hatchback','suv','truck','van','convertible','wagon','other')
                                DEFAULT NULL,
  is_active  TINYINT(1)         NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED  NOT NULL DEFAULT 0,
  created_at DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_models      PRIMARY KEY (id),
  CONSTRAINT uq_models_slug UNIQUE (slug),
  CONSTRAINT fk_models_brand
    FOREIGN KEY (brand_id) REFERENCES brands (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Vehicle models nested under brands';

CREATE INDEX idx_models_brand  ON models (brand_id, is_active);
CREATE INDEX idx_models_active ON models (is_active, sort_order);


-- 3c. years (child of model) — stores year range as individual rows for simplicity
CREATE TABLE model_years (
  id        INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  model_id  MEDIUMINT UNSIGNED NOT NULL,
  year      SMALLINT UNSIGNED  NOT NULL COMMENT '4-digit year e.g. 2021',
  engine_variants JSON         DEFAULT NULL
                               COMMENT '["2.0T","3.0i","M","diesel"] — optional detail',
  notes     VARCHAR(255)       DEFAULT NULL,
  is_active TINYINT(1)         NOT NULL DEFAULT 1,

  CONSTRAINT pk_model_years PRIMARY KEY (id),
  CONSTRAINT uq_model_year  UNIQUE (model_id, year),
  CONSTRAINT fk_model_years_model
    FOREIGN KEY (model_id) REFERENCES models (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Individual model-years; used for compatibility matching';

CREATE INDEX idx_model_years_model ON model_years (model_id, year);
CREATE INDEX idx_model_years_year  ON model_years (year);


-- =============================================================================
-- 4. CATEGORIES  (self-referencing adjacency list — supports unlimited depth)
-- =============================================================================
CREATE TABLE categories (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id   SMALLINT UNSIGNED DEFAULT NULL
                                COMMENT 'NULL = root category',
  name        VARCHAR(120)      NOT NULL,
  slug        VARCHAR(140)      NOT NULL,
  description TEXT              DEFAULT NULL,
  icon        VARCHAR(10)       DEFAULT NULL COMMENT 'emoji shortcode or icon class',
  image_url   VARCHAR(500)      DEFAULT NULL,
  is_active   TINYINT(1)        NOT NULL DEFAULT 1,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_categories      PRIMARY KEY (id),
  CONSTRAINT uq_categories_slug UNIQUE (slug),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Hierarchical part categories (e.g. Powertrain > Engine > Timing)';

CREATE INDEX idx_categories_parent ON categories (parent_id, is_active);
CREATE INDEX idx_categories_active ON categories (is_active, sort_order);


-- =============================================================================
-- 5. PRODUCTS
-- =============================================================================
CREATE TABLE products (
  id              CHAR(36)          NOT NULL,
  category_id     SMALLINT UNSIGNED NOT NULL,
  name            VARCHAR(255)      NOT NULL,
  slug            VARCHAR(280)      NOT NULL,
  sku             VARCHAR(80)       NOT NULL,
  oem_number      VARCHAR(120)      DEFAULT NULL  COMMENT 'Original Equipment Manufacturer part number',
  description     TEXT              DEFAULT NULL,
  short_desc      VARCHAR(500)      DEFAULT NULL  COMMENT 'Used in list cards',

  -- Pricing
  price           DECIMAL(10,2)     NOT NULL,
  original_price  DECIMAL(10,2)     DEFAULT NULL  COMMENT 'Pre-sale price; used to compute discount %',
  cost_price      DECIMAL(10,2)     DEFAULT NULL  COMMENT 'Internal — hidden from customers',

  -- Inventory
  stock_quantity  INT UNSIGNED      NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED  NOT NULL DEFAULT 5
                                    COMMENT 'Trigger alert when stock ≤ this value',
  weight_kg       DECIMAL(6,3)      DEFAULT NULL,
  dimensions_cm   JSON              DEFAULT NULL  COMMENT '{"l":30,"w":20,"h":10}',

  -- Quality
  condition_type  ENUM('new','oem_reman','aftermarket','used')
                                    NOT NULL DEFAULT 'new',
  warranty_months TINYINT UNSIGNED  NOT NULL DEFAULT 12,
  shipping_days   TINYINT UNSIGNED  NOT NULL DEFAULT 3,

  -- Denormalised aggregates (updated by trigger / application)
  rating_avg      DECIMAL(3,2)      NOT NULL DEFAULT 0.00,
  rating_count    INT UNSIGNED      NOT NULL DEFAULT 0,
  sales_count     INT UNSIGNED      NOT NULL DEFAULT 0
                                    COMMENT 'Total units sold, for popularity sort',

  -- Flags
  is_active       TINYINT(1)        NOT NULL DEFAULT 1,
  is_featured     TINYINT(1)        NOT NULL DEFAULT 0,
  is_digital      TINYINT(1)        NOT NULL DEFAULT 0,

  -- Meta
  meta_title      VARCHAR(160)      DEFAULT NULL,
  meta_desc       VARCHAR(320)      DEFAULT NULL,
  created_by      CHAR(36)          DEFAULT NULL COMMENT 'admin user who created the listing',
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME          DEFAULT NULL,

  CONSTRAINT pk_products      PRIMARY KEY (id),
  CONSTRAINT uq_products_sku  UNIQUE (sku),
  CONSTRAINT uq_products_slug UNIQUE (slug),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_creator
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Spare parts catalogue';

-- Core read paths
CREATE INDEX idx_products_category   ON products (category_id, is_active);
CREATE INDEX idx_products_price      ON products (price, is_active);
CREATE INDEX idx_products_featured   ON products (is_featured, is_active);
CREATE INDEX idx_products_rating     ON products (rating_avg DESC, rating_count DESC);
CREATE INDEX idx_products_sales      ON products (sales_count DESC);
CREATE INDEX idx_products_stock      ON products (stock_quantity, is_active);
CREATE INDEX idx_products_deleted_at ON products (deleted_at);
-- Full-text search on name + description
ALTER TABLE products
  ADD FULLTEXT INDEX ft_products_name_desc (name, description);


-- =============================================================================
-- 6. PRODUCT IMAGES
-- =============================================================================
CREATE TABLE product_images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id CHAR(36)     NOT NULL,
  url        VARCHAR(500) NOT NULL,
  alt_text   VARCHAR(255) DEFAULT NULL,
  is_primary TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Exactly one per product ideally',
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_product_images PRIMARY KEY (id),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Multiple images per product, ordered by sort_order';

CREATE INDEX idx_product_images_product ON product_images (product_id, sort_order);


-- =============================================================================
-- 7. PRODUCT COMPATIBILITY  (product ↔ model_year — many-to-many)
-- =============================================================================
CREATE TABLE product_compat (
  product_id    CHAR(36)         NOT NULL,
  model_year_id INT UNSIGNED     NOT NULL,
  engine_code   VARCHAR(40)      DEFAULT NULL
                                 COMMENT 'Narrows fit to a specific engine variant',
  notes         VARCHAR(255)     DEFAULT NULL,

  CONSTRAINT pk_product_compat PRIMARY KEY (product_id, model_year_id),
  CONSTRAINT fk_compat_product
    FOREIGN KEY (product_id)    REFERENCES products    (id) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_compat_year
    FOREIGN KEY (model_year_id) REFERENCES model_years (id) ON DELETE CASCADE  ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Vehicle fitment: which products fit which model-years';

CREATE INDEX idx_compat_year    ON product_compat (model_year_id);
CREATE INDEX idx_compat_product ON product_compat (product_id);


-- =============================================================================
-- 8. INVENTORY LOG  (append-only audit trail of every stock change)
-- =============================================================================
CREATE TABLE inventory_log (
  id          BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  product_id  CHAR(36)           NOT NULL,
  delta       INT                NOT NULL COMMENT 'Positive = stock in, negative = stock out',
  qty_before  INT UNSIGNED       NOT NULL,
  qty_after   INT UNSIGNED       NOT NULL,
  reason      ENUM('purchase','sale','return','adjustment','damage','initial')
                                 NOT NULL DEFAULT 'adjustment',
  reference_id CHAR(36)         DEFAULT NULL COMMENT 'order_id, adjustment_id, etc.',
  note        VARCHAR(255)       DEFAULT NULL,
  created_by  CHAR(36)           DEFAULT NULL,
  created_at  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_inventory_log PRIMARY KEY (id),
  CONSTRAINT fk_inv_log_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Immutable stock-movement ledger';

CREATE INDEX idx_inv_log_product   ON inventory_log (product_id, created_at DESC);
CREATE INDEX idx_inv_log_reference ON inventory_log (reference_id);


-- =============================================================================
-- 9. COUPONS
-- =============================================================================
CREATE TABLE coupons (
  id                 INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  code               VARCHAR(40)        NOT NULL,
  description        VARCHAR(255)       DEFAULT NULL,
  discount_type      ENUM('percent','fixed_cart','fixed_product')
                                        NOT NULL DEFAULT 'percent',
  discount_value     DECIMAL(10,2)      NOT NULL,
  min_order_amount   DECIMAL(10,2)      DEFAULT NULL,
  max_uses           INT UNSIGNED       DEFAULT NULL  COMMENT 'NULL = unlimited',
  uses_per_user      TINYINT UNSIGNED   NOT NULL DEFAULT 1,
  uses_count         INT UNSIGNED       NOT NULL DEFAULT 0,
  valid_from         DATETIME           DEFAULT NULL,
  valid_until        DATETIME           DEFAULT NULL,
  is_active          TINYINT(1)         NOT NULL DEFAULT 1,
  created_at         DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_coupons      PRIMARY KEY (id),
  CONSTRAINT uq_coupons_code UNIQUE (code)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Discount codes';

CREATE INDEX idx_coupons_active ON coupons (is_active, valid_until);


-- =============================================================================
-- 10. ORDERS
-- =============================================================================
CREATE TABLE orders (
  id               CHAR(36)     NOT NULL,
  order_number     VARCHAR(24)  NOT NULL                COMMENT 'Human-readable: IC-20240924-A3F9K',
  user_id          CHAR(36)     NOT NULL,
  coupon_id        INT UNSIGNED DEFAULT NULL,

  -- Financials  (all snapshotted at checkout time)
  subtotal         DECIMAL(10,2) NOT NULL,
  discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_cost    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(10,2) NOT NULL,

  -- Status
  status           ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded')
                                NOT NULL DEFAULT 'pending',

  -- Shipping
  shipping_address JSON         NOT NULL
                                COMMENT 'snapshot: {full_name,line1,city,country_code,…}',
  shipping_method  VARCHAR(80)  DEFAULT NULL            COMMENT 'e.g. Standard, Express, Freight',
  tracking_number  VARCHAR(120) DEFAULT NULL,
  shipped_at       DATETIME     DEFAULT NULL,
  delivered_at     DATETIME     DEFAULT NULL,

  -- Payment
  payment_method   ENUM('card','paypal','bank_transfer','cod')
                                NOT NULL DEFAULT 'card',
  payment_status   ENUM('pending','paid','failed','refunded','partially_refunded')
                                NOT NULL DEFAULT 'pending',
  payment_ref      VARCHAR(120) DEFAULT NULL            COMMENT 'Gateway transaction ID',
  paid_at          DATETIME     DEFAULT NULL,

  -- Extras
  customer_note    TEXT         DEFAULT NULL,
  internal_note    TEXT         DEFAULT NULL            COMMENT 'Visible to staff only',
  ip_address       VARCHAR(45)  DEFAULT NULL,

  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME     DEFAULT NULL,

  CONSTRAINT pk_orders          PRIMARY KEY (id),
  CONSTRAINT uq_orders_number   UNIQUE (order_number),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons (id)
    ON DELETE SET NULL ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Order header — one row per customer transaction';

CREATE INDEX idx_orders_user         ON orders (user_id, status);
CREATE INDEX idx_orders_status       ON orders (status, created_at DESC);
CREATE INDEX idx_orders_payment      ON orders (payment_status);
CREATE INDEX idx_orders_created      ON orders (created_at DESC);
CREATE INDEX idx_orders_deleted_at   ON orders (deleted_at);


-- =============================================================================
-- 11. ORDER ITEMS  (line items — prices immutable after insert)
-- =============================================================================
CREATE TABLE order_items (
  id            CHAR(36)       NOT NULL,
  order_id      CHAR(36)       NOT NULL,
  product_id    CHAR(36)       NOT NULL,

  -- Price snapshot (never join back to products for financial calculations)
  product_name  VARCHAR(255)   NOT NULL,
  product_sku   VARCHAR(80)    NOT NULL,
  product_image VARCHAR(500)   DEFAULT NULL,
  unit_price    DECIMAL(10,2)  NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  line_total    DECIMAL(10,2)  NOT NULL     COMMENT 'unit_price × quantity',
  discount_amt  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,

  -- Return tracking
  qty_returned  SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_order_items  PRIMARY KEY (id),
  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id)   REFERENCES orders   (id) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_order_items_qty
    CHECK (quantity >= 1),
  CONSTRAINT chk_order_items_price
    CHECK (unit_price >= 0)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Order line items — price-snapshotted at checkout';

CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);


-- =============================================================================
-- 12. ORDER STATUS HISTORY  (append-only audit log)
-- =============================================================================
CREATE TABLE order_status_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    CHAR(36)        NOT NULL,
  from_status VARCHAR(20)     DEFAULT NULL,
  to_status   VARCHAR(20)     NOT NULL,
  note        VARCHAR(500)    DEFAULT NULL,
  changed_by  CHAR(36)        DEFAULT NULL COMMENT 'user_id of staff / system',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_order_status_history PRIMARY KEY (id),
  CONSTRAINT fk_osh_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Immutable log of every order status transition';

CREATE INDEX idx_osh_order ON order_status_history (order_id, created_at DESC);


-- =============================================================================
-- 13. REVIEWS  (one per user per product, verified-purchase flag)
-- =============================================================================
CREATE TABLE reviews (
  id                   CHAR(36)        NOT NULL,
  product_id           CHAR(36)        NOT NULL,
  user_id              CHAR(36)        NOT NULL,
  rating               TINYINT UNSIGNED NOT NULL,
  title                VARCHAR(120)    DEFAULT NULL,
  body                 TEXT            DEFAULT NULL,
  is_verified_purchase TINYINT(1)      NOT NULL DEFAULT 0,
  is_approved          TINYINT(1)      NOT NULL DEFAULT 1,
  helpful_count        INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME        DEFAULT NULL,

  CONSTRAINT pk_reviews              PRIMARY KEY (id),
  CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id),
  CONSTRAINT chk_reviews_rating      CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = '1 review per user per product';

CREATE INDEX idx_reviews_product ON reviews (product_id, is_approved, created_at DESC);
CREATE INDEX idx_reviews_user    ON reviews (user_id);


-- =============================================================================
-- 14. WISHLISTS
-- =============================================================================
CREATE TABLE wishlists (
  user_id    CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  added_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_wishlists PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_wishlists_user
    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wishlists_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'User saved / favourite products';

CREATE INDEX idx_wishlists_product ON wishlists (product_id);


-- =============================================================================
-- 15. SESSIONS  (server-side refresh-token store — swap for Redis in production)
-- =============================================================================
CREATE TABLE sessions (
  id           CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  token_hash   CHAR(64)    NOT NULL  COMMENT 'SHA-256 of the refresh token',
  user_agent   VARCHAR(255) DEFAULT NULL,
  ip_address   VARCHAR(45)  DEFAULT NULL,
  expires_at   DATETIME    NOT NULL,
  last_used_at DATETIME    DEFAULT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_sessions       PRIMARY KEY (id),
  CONSTRAINT uq_sessions_token UNIQUE (token_hash),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Active refresh-token sessions (optional — use Redis in production)';

CREATE INDEX idx_sessions_user    ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);


-- =============================================================================
-- 16. TRIGGERS
-- =============================================================================

DELIMITER $$

-- 16a. After an order_item is inserted, deduct stock and log the movement
CREATE TRIGGER trg_order_item_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  DECLARE v_before INT UNSIGNED DEFAULT 0;

  SELECT stock_quantity INTO v_before
  FROM   products
  WHERE  id = NEW.product_id;

  -- Deduct stock
  UPDATE products
  SET    stock_quantity = stock_quantity - NEW.quantity,
         sales_count    = sales_count    + NEW.quantity
  WHERE  id = NEW.product_id;

  -- Append to inventory ledger
  INSERT INTO inventory_log (product_id, delta, qty_before, qty_after, reason, reference_id)
  VALUES (NEW.product_id, -NEW.quantity, v_before, v_before - NEW.quantity, 'sale', NEW.order_id);
END$$


-- 16b. When an order_item is returned (qty_returned increases),
--      restore stock and log
CREATE TRIGGER trg_order_item_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
  DECLARE v_returned_delta INT DEFAULT 0;
  DECLARE v_before         INT UNSIGNED DEFAULT 0;

  SET v_returned_delta = NEW.qty_returned - OLD.qty_returned;

  IF v_returned_delta > 0 THEN
    SELECT stock_quantity INTO v_before
    FROM   products
    WHERE  id = NEW.product_id;

    UPDATE products
    SET    stock_quantity = stock_quantity + v_returned_delta,
           sales_count    = GREATEST(0, sales_count - v_returned_delta)
    WHERE  id = NEW.product_id;

    INSERT INTO inventory_log (product_id, delta, qty_before, qty_after, reason, reference_id)
    VALUES (NEW.product_id, v_returned_delta, v_before, v_before + v_returned_delta, 'return', NEW.order_id);
  END IF;
END$$


-- 16c. Automatically record order status transitions
CREATE TRIGGER trg_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
END$$


-- 16d. Recalculate product rating_avg + rating_count after a review is inserted
CREATE TRIGGER trg_review_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE products p
  SET    p.rating_avg   = (SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                           WHERE r.product_id = NEW.product_id AND r.is_approved = 1 AND r.deleted_at IS NULL),
         p.rating_count = (SELECT COUNT(*)                   FROM reviews r
                           WHERE r.product_id = NEW.product_id AND r.is_approved = 1 AND r.deleted_at IS NULL)
  WHERE  p.id = NEW.product_id;
END$$


-- 16e. Recalculate rating after a review is updated (e.g., approved/rejected)
CREATE TRIGGER trg_review_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  UPDATE products p
  SET    p.rating_avg   = (SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                           WHERE r.product_id = NEW.product_id AND r.is_approved = 1 AND r.deleted_at IS NULL),
         p.rating_count = (SELECT COUNT(*)                   FROM reviews r
                           WHERE r.product_id = NEW.product_id AND r.is_approved = 1 AND r.deleted_at IS NULL)
  WHERE  p.id = NEW.product_id;
END$$


-- 16f. Recalculate rating after soft-delete
CREATE TRIGGER trg_review_after_soft_delete
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE products p
    SET    p.rating_avg   = IFNULL((SELECT ROUND(AVG(r.rating),2) FROM reviews r
                             WHERE r.product_id = NEW.product_id AND r.is_approved=1 AND r.deleted_at IS NULL),0),
           p.rating_count = (SELECT COUNT(*) FROM reviews r
                             WHERE r.product_id = NEW.product_id AND r.is_approved=1 AND r.deleted_at IS NULL)
    WHERE  p.id = NEW.product_id;
  END IF;
END$$

DELIMITER ;


-- =============================================================================
-- 17. VIEWS  (convenience read layers — never write through these)
-- =============================================================================

-- 17a. Product catalogue with category and primary image
CREATE OR REPLACE VIEW vw_product_catalogue AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.sku,
  p.oem_number,
  p.short_desc,
  p.price,
  p.original_price,
  CASE WHEN p.original_price > p.price
       THEN ROUND((1 - p.price / p.original_price) * 100)
       ELSE NULL
  END                         AS discount_pct,
  p.stock_quantity,
  p.condition_type,
  p.warranty_months,
  p.shipping_days,
  p.rating_avg,
  p.rating_count,
  p.sales_count,
  p.is_active,
  p.is_featured,
  c.id                        AS category_id,
  c.name                      AS category_name,
  c.slug                      AS category_slug,
  pc.parent_id                AS parent_category_id,
  pi.url                      AS primary_image_url,
  p.created_at
FROM       products       p
JOIN       categories     c  ON c.id = p.category_id
LEFT JOIN  categories     pc ON pc.id = c.parent_id
LEFT JOIN  product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE p.deleted_at IS NULL;


-- 17b. Vehicle compatibility — flat view for front-end filter dropdowns
CREATE OR REPLACE VIEW vw_compat_flat AS
SELECT
  pc.product_id,
  b.id    AS brand_id,
  b.name  AS brand_name,
  b.slug  AS brand_slug,
  m.id    AS model_id,
  m.name  AS model_name,
  m.slug  AS model_slug,
  my.id   AS model_year_id,
  my.year
FROM       product_compat pc
JOIN       model_years    my ON my.id         = pc.model_year_id
JOIN       models         m  ON m.id          = my.model_id
JOIN       brands         b  ON b.id          = m.brand_id
WHERE my.is_active = 1
  AND m.is_active  = 1
  AND b.is_active  = 1;


-- 17c. Order summary with customer and item count
CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.payment_status,
  o.total,
  o.created_at,
  u.id         AS user_id,
  u.first_name,
  u.last_name,
  u.email,
  COUNT(oi.id) AS item_count,
  SUM(oi.quantity) AS total_qty
FROM       orders      o
JOIN       users       u  ON u.id = o.user_id
LEFT JOIN  order_items oi ON oi.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY
  o.id, o.order_number, o.status, o.payment_status,
  o.total, o.created_at, u.id, u.first_name, u.last_name, u.email;


-- 17d. Monthly revenue report
CREATE OR REPLACE VIEW vw_monthly_revenue AS
SELECT
  YEAR(o.created_at)  AS yr,
  MONTH(o.created_at) AS mo,
  COUNT(o.id)         AS order_count,
  SUM(o.total)        AS gross_revenue,
  SUM(o.discount_amount) AS total_discounts,
  SUM(o.total - o.discount_amount) AS net_revenue
FROM   orders o
WHERE  o.status NOT IN ('cancelled','refunded')
  AND  o.deleted_at IS NULL
GROUP BY yr, mo
ORDER BY yr DESC, mo DESC;


-- 17e. Low-stock alert view
CREATE OR REPLACE VIEW vw_low_stock AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.stock_quantity,
  p.low_stock_threshold,
  c.name AS category
FROM   products   p
JOIN   categories c ON c.id = p.category_id
WHERE  p.is_active = 1
  AND  p.deleted_at IS NULL
  AND  p.stock_quantity <= p.low_stock_threshold
ORDER BY p.stock_quantity ASC;


SET foreign_key_checks = 1;
-- =============================================================================
-- Schema complete.
-- Run sample_data.sql next to populate with realistic seed rows.
-- =============================================================================
