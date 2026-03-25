-- =============================================================================
-- IRONCLAD — Query Reference
-- Common queries that the application and admin dashboard will run.
-- Each query is optimised for the indexes defined in schema.sql.
-- =============================================================================

USE ironclad_db;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: PRODUCT CATALOGUE QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1  Homepage: featured products with primary image
--      Uses: idx_products_featured
SELECT
  p.id, p.name, p.slug, p.sku,
  p.price, p.original_price,
  ROUND((1 - p.price / p.original_price) * 100) AS discount_pct,
  p.rating_avg, p.rating_count,
  p.stock_quantity, p.shipping_days,
  pi.url AS image_url,
  c.name AS category
FROM   products       p
JOIN   categories     c  ON c.id = p.category_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE  p.is_featured = 1
  AND  p.is_active   = 1
  AND  p.deleted_at  IS NULL
ORDER BY p.sales_count DESC
LIMIT  12;


-- 1.2  Smart filter: brand + model + year compatibility
--      Uses: idx_model_years_model, idx_compat_year, idx_compat_product
SELECT DISTINCT
  p.id, p.name, p.slug, p.price, p.original_price,
  p.rating_avg, p.rating_count, p.stock_quantity,
  pi.url AS image_url
FROM   product_compat pc
JOIN   model_years    my ON my.id = pc.model_year_id
JOIN   models          m ON m.id  = my.model_id
JOIN   brands          b ON b.id  = m.brand_id
JOIN   products        p ON p.id  = pc.product_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE  b.slug  = 'bmw'          -- :brand_slug  parameter
  AND  m.slug  = 'bmw-3-series' -- :model_slug  parameter
  AND  my.year = 2021           -- :year        parameter
  AND  p.is_active  = 1
  AND  p.deleted_at IS NULL
ORDER BY p.sales_count DESC
LIMIT  20 OFFSET 0;             -- paginated


-- 1.3  Category drill-down with optional sub-category
--      Uses: idx_products_category, idx_categories_parent
SELECT
  p.id, p.name, p.slug, p.sku,
  p.price, p.original_price,
  p.rating_avg, p.stock_quantity,
  pi.url AS image_url
FROM   products       p
JOIN   categories     c  ON c.id = p.category_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE  (c.id = 2 OR c.parent_id = 2)  -- 2 = 'Brakes & Suspension' root id
  AND  p.is_active  = 1
  AND  p.deleted_at IS NULL
ORDER BY p.is_featured DESC, p.sales_count DESC
LIMIT  20 OFFSET 0;


-- 1.4  Full-text search (MATCH … AGAINST)
--      Uses: ft_products_name_desc FULLTEXT index
SELECT
  p.id, p.name, p.slug, p.price,
  MATCH(p.name, p.description) AGAINST ('brake pads BMW ceramic' IN NATURAL LANGUAGE MODE) AS relevance,
  pi.url AS image_url
FROM   products p
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE  MATCH(p.name, p.description) AGAINST ('brake pads BMW ceramic' IN NATURAL LANGUAGE MODE)
  AND  p.is_active  = 1
  AND  p.deleted_at IS NULL
ORDER BY relevance DESC
LIMIT  20;


-- 1.5  Price range filter + in-stock filter
--      Uses: idx_products_price, idx_products_stock
SELECT
  p.id, p.name, p.price, p.stock_quantity, pi.url AS image_url
FROM   products p
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
WHERE  p.price         BETWEEN 50 AND 250
  AND  p.stock_quantity > 0
  AND  p.is_active      = 1
  AND  p.deleted_at     IS NULL
ORDER BY p.price ASC
LIMIT  20 OFFSET 0;


-- 1.6  Single product detail page (full info)
SELECT
  p.*,
  c.name    AS category_name,
  c.slug    AS category_slug,
  pc.name   AS parent_category_name,
  u.first_name AS created_by_first, u.last_name AS created_by_last
FROM   products   p
JOIN   categories c  ON c.id = p.category_id
LEFT JOIN categories pc ON pc.id = c.parent_id
LEFT JOIN users      u  ON u.id  = p.created_by
WHERE  p.slug     = 'timing-belt-kit-water-pump'   -- :slug parameter
  AND  p.is_active = 1
  AND  p.deleted_at IS NULL;


-- 1.7  All images for a product
SELECT id, url, alt_text, is_primary, sort_order
FROM   product_images
WHERE  product_id = 'p0000004'
ORDER BY sort_order ASC;


-- 1.8  Compatibility list for a product (shown on PDP)
SELECT
  b.name AS brand, m.name AS model, my.year,
  my.engine_variants
FROM   product_compat pc
JOIN   model_years    my ON my.id = pc.model_year_id
JOIN   models          m ON m.id  = my.model_id
JOIN   brands          b ON b.id  = m.brand_id
WHERE  pc.product_id = 'p0000001'
ORDER BY b.name, m.name, my.year;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: VEHICLE FILTER DROPDOWNS
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1  All active brands (for Brand dropdown)
SELECT id, name, slug, logo_url
FROM   brands
WHERE  is_active = 1
ORDER BY sort_order, name;


-- 2.2  Models for a chosen brand (for Model dropdown)
SELECT id, name, slug, body_style
FROM   models
WHERE  brand_id = 1      -- :brand_id
  AND  is_active = 1
ORDER BY sort_order, name;


-- 2.3  Available years for a chosen model (for Year dropdown)
SELECT DISTINCT year
FROM   model_years
WHERE  model_id  = 1     -- :model_id
  AND  is_active = 1
ORDER BY year DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: CART & CHECKOUT
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1  Validate stock for cart items before order creation
SELECT
  id,
  name,
  sku,
  price,
  stock_quantity,
  stock_quantity >= 2 AS can_fulfil   -- 2 = requested quantity
FROM  products
WHERE id IN ('p0000001', 'p0000004')  -- :cart_product_ids
  AND is_active = 1
  AND deleted_at IS NULL;


-- 3.2  Coupon validation
SELECT
  id, code, discount_type, discount_value, min_order_amount,
  uses_count, max_uses,
  valid_from, valid_until,
  (uses_count < COALESCE(max_uses, 999999999)) AND
  (valid_from  IS NULL OR valid_from  <= NOW()) AND
  (valid_until IS NULL OR valid_until >= NOW()) AND
  is_active = 1                        AS is_valid
FROM  coupons
WHERE code = 'WELCOME10';             -- :code


-- 3.3  Per-user coupon usage count (for uses_per_user enforcement)
SELECT COUNT(*) AS user_usage
FROM   orders
WHERE  user_id   = '00000000-0000-0000-0000-000000000003'   -- :user_id
  AND  coupon_id = 1                                         -- :coupon_id
  AND  status NOT IN ('cancelled', 'refunded');


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: ORDER QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1  User's order list
--      Uses: idx_orders_user
SELECT
  o.id, o.order_number, o.status, o.payment_status,
  o.total, o.created_at, o.tracking_number,
  COUNT(oi.id)     AS item_count,
  SUM(oi.quantity) AS total_qty
FROM   orders      o
JOIN   order_items oi ON oi.order_id = o.id
WHERE  o.user_id    = '00000000-0000-0000-0000-000000000003'
  AND  o.deleted_at IS NULL
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT  10 OFFSET 0;


-- 4.2  Single order detail (with line items)
SELECT
  o.id, o.order_number, o.status, o.payment_status,
  o.subtotal, o.discount_amount, o.shipping_cost, o.tax_amount, o.total,
  o.shipping_address, o.tracking_number, o.customer_note,
  o.created_at, o.paid_at,
  oi.id            AS item_id,
  oi.product_id,
  oi.product_name,
  oi.product_sku,
  oi.product_image,
  oi.unit_price,
  oi.quantity,
  oi.line_total
FROM   orders      o
JOIN   order_items oi ON oi.order_id = o.id
WHERE  o.id        = 'ord0000001'
  AND  o.user_id   = '00000000-0000-0000-0000-000000000003'  -- security: own orders only
  AND  o.deleted_at IS NULL;


-- 4.3  Order status history
SELECT
  from_status, to_status, note, created_at
FROM   order_status_history
WHERE  order_id = 'ord0000001'
ORDER BY created_at ASC;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1  Reviews for a product (paginated)
--      Uses: idx_reviews_product
SELECT
  r.id, r.rating, r.title, r.body,
  r.is_verified_purchase, r.helpful_count, r.created_at,
  u.first_name, u.last_name
FROM   reviews r
JOIN   users   u ON u.id = r.user_id
WHERE  r.product_id  = 'p0000001'
  AND  r.is_approved = 1
  AND  r.deleted_at  IS NULL
ORDER BY r.created_at DESC
LIMIT  10 OFFSET 0;


-- 5.2  Rating distribution for a product (star breakdown)
SELECT
  rating,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM   reviews
WHERE  product_id  = 'p0000001'
  AND  is_approved = 1
  AND  deleted_at  IS NULL
GROUP BY rating
ORDER BY rating DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: ADMIN DASHBOARD QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1  KPI snapshot
SELECT
  (SELECT COUNT(*)      FROM orders   WHERE status NOT IN ('cancelled','refunded') AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS orders_this_month,
  (SELECT IFNULL(SUM(total), 0) FROM orders WHERE status NOT IN ('cancelled','refunded') AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS revenue_this_month,
  (SELECT COUNT(*)      FROM users    WHERE role = 'customer' AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS new_customers_this_month,
  (SELECT COUNT(*)      FROM orders   WHERE status = 'pending') AS pending_orders,
  (SELECT COUNT(*)      FROM products WHERE stock_quantity <= low_stock_threshold AND is_active = 1) AS low_stock_products;


-- 6.2  Monthly revenue for the last 12 months
SELECT
  DATE_FORMAT(created_at, '%Y-%m')  AS month,
  COUNT(*)                          AS orders,
  SUM(total)                        AS gross_revenue,
  SUM(discount_amount)              AS total_discounts,
  SUM(total - discount_amount)      AS net_revenue
FROM   orders
WHERE  status NOT IN ('cancelled','refunded')
  AND  deleted_at IS NULL
  AND  created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC;


-- 6.3  Top 10 products by revenue
SELECT
  oi.product_id,
  oi.product_name,
  oi.product_sku,
  SUM(oi.quantity)   AS units_sold,
  SUM(oi.line_total) AS total_revenue
FROM   order_items oi
JOIN   orders      o  ON o.id = oi.order_id
WHERE  o.status NOT IN ('cancelled','refunded')
  AND  o.deleted_at IS NULL
GROUP BY oi.product_id, oi.product_name, oi.product_sku
ORDER BY total_revenue DESC
LIMIT  10;


-- 6.4  Low-stock alert (use the view)
SELECT * FROM vw_low_stock;


-- 6.5  All orders — admin view with customer info (paginated)
SELECT
  o.id, o.order_number, o.status, o.payment_status,
  o.total, o.created_at,
  u.first_name, u.last_name, u.email
FROM   orders o
JOIN   users  u  ON u.id = o.user_id
WHERE  o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT  25 OFFSET 0;


-- 6.6  Revenue by category (what's driving sales)
SELECT
  c.name                AS category,
  COUNT(DISTINCT o.id)  AS order_count,
  SUM(oi.quantity)      AS units_sold,
  SUM(oi.line_total)    AS revenue
FROM   order_items oi
JOIN   orders      o   ON o.id  = oi.order_id
JOIN   products    p   ON p.id  = oi.product_id
JOIN   categories  c   ON c.id  = p.category_id
WHERE  o.status NOT IN ('cancelled','refunded')
  AND  o.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY revenue DESC;


-- 6.7  Inventory audit: all stock movements for a product
SELECT
  il.id, il.reason, il.delta, il.qty_before, il.qty_after,
  il.note, il.created_at,
  u.first_name, u.last_name
FROM   inventory_log il
LEFT JOIN users      u  ON u.id = il.created_by
WHERE  il.product_id = 'p0000001'
ORDER BY il.created_at DESC;


-- 6.8  Coupon performance report
SELECT
  c.code,
  c.discount_type,
  c.discount_value,
  c.uses_count,
  c.max_uses,
  SUM(o.discount_amount) AS total_discount_given,
  COUNT(o.id)            AS orders_used_in
FROM   coupons c
LEFT JOIN orders o ON o.coupon_id = c.id
             AND o.status NOT IN ('cancelled','refunded')
GROUP BY c.id, c.code, c.discount_type, c.discount_value, c.uses_count, c.max_uses
ORDER BY orders_used_in DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: USEFUL MAINTENANCE QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 7.1  Check index usage (run EXPLAIN on a slow query)
EXPLAIN SELECT * FROM products
WHERE brand_id = 1 AND is_active = 1;   -- shows idx_products_category or similar


-- 7.2  Find products never ordered
SELECT p.id, p.sku, p.name, p.stock_quantity
FROM   products p
WHERE  NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
  AND  p.is_active  = 1
  AND  p.deleted_at IS NULL
ORDER BY p.created_at;


-- 7.3  Customers with no orders
SELECT u.id, u.email, u.created_at
FROM   users u
WHERE  u.role = 'customer'
  AND  NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);


-- 7.4  Soft-deleted products (admin restore screen)
SELECT id, sku, name, deleted_at
FROM   products
WHERE  deleted_at IS NOT NULL
ORDER BY deleted_at DESC;


-- 7.5  Restore a soft-deleted product
UPDATE products SET deleted_at = NULL WHERE id = 'p0000001';


-- 7.6  Recalculate all product ratings (maintenance / data fix)
UPDATE products p
SET
  p.rating_avg   = IFNULL((
    SELECT ROUND(AVG(r.rating), 2)
    FROM   reviews r
    WHERE  r.product_id = p.id AND r.is_approved = 1 AND r.deleted_at IS NULL
  ), 0.00),
  p.rating_count = IFNULL((
    SELECT COUNT(*)
    FROM   reviews r
    WHERE  r.product_id = p.id AND r.is_approved = 1 AND r.deleted_at IS NULL
  ), 0);


-- 7.7  Recalculate all product sales counts from order history
UPDATE products p
SET p.sales_count = IFNULL((
  SELECT SUM(oi.quantity)
  FROM   order_items oi
  JOIN   orders      o ON o.id = oi.order_id
  WHERE  oi.product_id = p.id
    AND  o.status NOT IN ('cancelled','refunded')
    AND  o.deleted_at IS NULL
), 0);
