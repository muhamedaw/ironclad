-- 004_create_reviews.sql
-- Product reviews with verified-purchase flag and moderation support.

CREATE TABLE IF NOT EXISTS reviews (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  product_id           CHAR(36)     NOT NULL,
  user_id              CHAR(36)     NOT NULL,
  rating               TINYINT      NOT NULL,
  title                VARCHAR(120) DEFAULT NULL,
  body                 TEXT         DEFAULT NULL,
  is_verified_purchase TINYINT(1)   NOT NULL DEFAULT 0,
  is_approved          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME     DEFAULT NULL,

  -- One review per user per product
  CONSTRAINT uq_review_product_user UNIQUE (product_id, user_id),
  CONSTRAINT fk_reviews_product     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT chk_rating             CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_product_approved ON reviews (product_id, is_approved);
CREATE INDEX idx_user_reviews     ON reviews (user_id);
