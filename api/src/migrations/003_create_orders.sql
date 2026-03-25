-- 003_create_orders.sql
-- Order header and immutable line-item price snapshots.

CREATE TABLE IF NOT EXISTS orders (
  id               CHAR(36)    NOT NULL PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL,
  user_id          CHAR(36)    NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  shipping_cost    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(10,2) NOT NULL,
  status           ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded')
                               NOT NULL DEFAULT 'pending',
  shipping_address JSON        NOT NULL,
  payment_method   ENUM('card','paypal','bank_transfer','cod') NOT NULL DEFAULT 'card',
  payment_status   ENUM('pending','paid','failed','refunded')  NOT NULL DEFAULT 'pending',
  paid_at          DATETIME    DEFAULT NULL,
  tracking_number  VARCHAR(100) DEFAULT NULL,
  notes            TEXT        DEFAULT NULL,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME    DEFAULT NULL,

  CONSTRAINT uq_orders_number    UNIQUE (order_number),
  CONSTRAINT fk_orders_user      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_status  ON orders (user_id, status);
CREATE INDEX idx_status_date  ON orders (status, created_at);


CREATE TABLE IF NOT EXISTS order_items (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  order_id     CHAR(36)      NOT NULL,
  product_id   CHAR(36)      NOT NULL,
  product_name VARCHAR(255)  NOT NULL,
  product_sku  VARCHAR(60)   NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  quantity     SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  line_total   DECIMAL(10,2) NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_items_order   ON order_items (order_id);
CREATE INDEX idx_items_product ON order_items (product_id);
