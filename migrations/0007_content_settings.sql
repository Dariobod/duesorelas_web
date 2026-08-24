-- Editable home media configuration.
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES
  ('home_hero_image', '/assets/hero-due-sorelas.png'),
  ('home_craft_video', 'https://videos.pexels.com/video-files/6263745/6263745-sd_360_640_25fps.mp4');
