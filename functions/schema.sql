CREATE TABLE IF NOT EXISTS login_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  logged_in_at TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  colo TEXT,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_login_events_logged_in_at
ON login_events(logged_in_at);
