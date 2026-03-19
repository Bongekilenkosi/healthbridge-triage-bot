-- ============================================================
-- HealthBridgeSA — Supabase Schema Migration
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- 1. Sessions — persistent user state (language, consent, location, step)
CREATE TABLE IF NOT EXISTS sessions (
  patient_id   TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Triage logs — every triage interaction (audit trail)
CREATE TABLE IF NOT EXISTS triage_logs (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id        TEXT NOT NULL,
  phone_hash        TEXT,
  language          TEXT DEFAULT 'en',
  original_message  TEXT,
  english_summary   TEXT,
  triage_level      TEXT NOT NULL,        -- RED, ORANGE, YELLOW, GREEN, BLUE
  confidence        TEXT DEFAULT 'HIGH',  -- HIGH, MEDIUM, LOW
  method            TEXT DEFAULT 'menu',  -- menu, free_text, rule_override
  category          TEXT,                 -- symptom category (1-13)
  followup_answer   TEXT,                 -- followup option selected
  escalation        BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  pathway           TEXT,
  facility_name     TEXT,
  facility_id       INT,
  location          JSONB,
  needs_human_review BOOLEAN DEFAULT FALSE,
  reviewed          BOOLEAN DEFAULT FALSE,
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_triage_logs_patient ON triage_logs (patient_id);
CREATE INDEX idx_triage_logs_level ON triage_logs (triage_level);
CREATE INDEX idx_triage_logs_escalation ON triage_logs (needs_human_review, reviewed);
CREATE INDEX idx_triage_logs_created ON triage_logs (created_at DESC);

-- 3. Follow-ups — scheduled 48hr check-ins
CREATE TABLE IF NOT EXISTS follow_ups (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  phone           TEXT NOT NULL,
  triage_level    TEXT NOT NULL,
  triage_log_id   BIGINT REFERENCES triage_logs(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, completed, expired
  response        TEXT,
  sent_at         TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_due ON follow_ups (scheduled_at, status) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_patient ON follow_ups (patient_id, status);

-- 4. Facilities — clinics and hospitals with live capacity
CREATE TABLE IF NOT EXISTS facilities (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,          -- clinic, hospital
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  capacity          INT DEFAULT 20,
  current_queue     INT DEFAULT 0,
  wait_time_minutes INT DEFAULT 30,
  phone             TEXT,
  address           TEXT,
  province          TEXT DEFAULT 'Gauteng',
  active            BOOLEAN DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Gauteng facilities
INSERT INTO facilities (name, type, latitude, longitude, capacity, current_queue, wait_time_minutes, address) VALUES
  ('Benoni Clinic',               'clinic',   -26.188, 28.320, 20, 5,  30, 'Benoni, Gauteng'),
  ('Tambo Memorial Hospital',     'hospital', -26.204, 28.312, 50, 20, 45, 'Boksburg, Gauteng'),
  ('Charlotte Maxeke Hospital',   'hospital', -26.181, 28.047, 60, 15, 40, 'Parktown, Johannesburg'),
  ('Thelle Mogoerane Hospital',   'hospital', -26.281, 28.148, 45, 18, 50, 'Vosloorus, Gauteng'),
  ('Edenvale General Hospital',   'hospital', -26.141, 28.152, 40, 12, 35, 'Edenvale, Gauteng'),
  ('Daveyton Clinic',             'clinic',   -26.160, 28.418, 15, 3,  20, 'Daveyton, Gauteng'),
  ('Tembisa Hospital',            'hospital', -25.998, 28.227, 55, 25, 60, 'Tembisa, Gauteng'),
  ('Wattville Clinic',            'clinic',   -26.178, 28.343, 12, 4,  25, 'Wattville, Benoni'),
  ('Far East Rand Hospital',      'hospital', -26.226, 28.396, 35, 10, 40, 'Springs, Gauteng'),
  ('Chris Hani Baragwanath Hospital', 'hospital', -26.261, 27.943, 100, 45, 90, 'Soweto, Johannesburg')
ON CONFLICT DO NOTHING;

-- 5. Feedback — patient satisfaction after visits
CREATE TABLE IF NOT EXISTS feedback (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  triage_log_id   BIGINT REFERENCES triage_logs(id),
  facility_id     INT REFERENCES facilities(id),
  rating          INT CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending, completed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- 6. Consent log — audit trail for consent (POPIA compliance)
CREATE TABLE IF NOT EXISTS consent_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id      TEXT NOT NULL,
  consented       BOOLEAN NOT NULL,
  language        TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_patient ON consent_log (patient_id, created_at DESC);

-- 7. RLS policies (optional but recommended for production)
-- Enable Row Level Security on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your backend uses service role key)
CREATE POLICY "Service role full access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON triage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON facilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON consent_log FOR ALL USING (true) WITH CHECK (true);
