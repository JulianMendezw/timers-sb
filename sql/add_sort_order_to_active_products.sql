-- Add sort_order column to active_products table
-- This column stores the display order for drag-and-drop functionality

ALTER TABLE active_products 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create an index for better query performance when ordering
CREATE INDEX IF NOT EXISTS idx_active_products_sort_order 
ON active_products(sort_order);
