-- 005_create_wishlists.sql
-- User wishlist — join table between users and products.

CREATE TABLE IF NOT EXISTS wishlists (
  id         CHAR(36)  NOT NULL PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  product_id CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id),
  CONSTRAINT fk_wishlist_user         FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_wishlist_user    ON wishlists (user_id);
CREATE INDEX idx_wishlist_product ON wishlists (product_id);
