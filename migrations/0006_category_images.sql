-- Add an optional Cloudinary image URL to each catalog category.
ALTER TABLE categories ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
