CREATE TABLE IF NOT EXISTS maintenance_reports (id TEXT PRIMARY KEY, apartment_id TEXT NOT NULL, building TEXT, description TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL, assigned_to TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT);
CREATE INDEX IF NOT EXISTS maintenance_reports_apartment_idx ON maintenance_reports(apartment_id);
CREATE INDEX IF NOT EXISTS maintenance_reports_status_idx ON maintenance_reports(status);
CREATE TABLE IF NOT EXISTS maintenance_attachments (id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES maintenance_reports(id) ON DELETE CASCADE, storage_key TEXT NOT NULL, original_filename TEXT NOT NULL, mime_type TEXT, file_size INTEGER, created_at TEXT NOT NULL, uploaded_by TEXT);
CREATE INDEX IF NOT EXISTS maintenance_attachments_report_idx ON maintenance_attachments(report_id);
CREATE TABLE IF NOT EXISTS maintenance_updates (id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES maintenance_reports(id) ON DELETE CASCADE, update_text TEXT, previous_status TEXT, new_status TEXT, created_at TEXT NOT NULL, created_by TEXT);
