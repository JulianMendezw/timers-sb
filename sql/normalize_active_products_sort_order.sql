-- One-time data repair: normalize sort_order for active products.
--
-- Why:
-- Existing rows may have null/duplicate sort_order values from earlier behavior,
-- causing active product order to appear shuffled when refreshed.
--
-- What this does:
-- Reassigns contiguous sort_order values (0..N-1) for active rows only,
-- preserving current relative order by:
--   1) existing sort_order
--   2) updated_at
--   3) item_id
--
-- Safe to run multiple times (idempotent).

BEGIN;

WITH ranked AS (
  SELECT
    item_id,
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(sort_order, 2147483647),
        updated_at NULLS FIRST,
        item_id
    ) - 1 AS new_sort_order
  FROM active_products
  WHERE is_active = TRUE
)
UPDATE active_products ap
SET
  sort_order = ranked.new_sort_order,
  updated_at = NOW()
FROM ranked
WHERE ap.item_id = ranked.item_id
  AND ap.sort_order IS DISTINCT FROM ranked.new_sort_order;

COMMIT;

-- Optional verification
SELECT item_id, is_active, sort_order, updated_at
FROM active_products
WHERE is_active = TRUE
ORDER BY sort_order, item_id;
