-- Allow the home banner to use either an image or a video URL.
INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
SELECT 'home_hero_media_url', setting_value
FROM site_settings
WHERE setting_key = 'home_hero_image';

INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
VALUES ('home_hero_media_type', 'image');
