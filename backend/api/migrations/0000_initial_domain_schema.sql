-- VitalSync Postgres schema snapshot.
-- Reverse-engineered from the live `vitalsync_db` database on 2026-10-02 via
-- information_schema/pg_catalog introspection, since the tables were created by hand
-- and are mapped in Django with `managed = False` (see backend/api/models.py).
-- Run this against a fresh Postgres database to reproduce the schema the API expects.

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_temporary_password BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_change_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0,
    verified_at TIMESTAMPTZ
);

CREATE TABLE doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    initials VARCHAR(10),
    display_color VARCHAR(50),
    clinic VARCHAR(255),
    about TEXT,
    license VARCHAR(255),
    phone VARCHAR(50)
);

CREATE TABLE patient_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    unique_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    home_address TEXT,
    emergency_contact VARCHAR(255),
    date_of_birth DATE,
    weight_lbs NUMERIC(6, 2),
    height_inches NUMERIC(6, 2),
    care_focus VARCHAR(255),
    patient_type VARCHAR(50) DEFAULT 'Out-patient',
    status VARCHAR(50) DEFAULT 'On track',
    priority VARCHAR(20) DEFAULT 'Medium',
    follow_up_date DATE,
    monitoring_active BOOLEAN DEFAULT true
);

CREATE TABLE patient_activity_types (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX patient_activity_types_patient_name_unique
    ON patient_activity_types (patient_id, LOWER(name));

CREATE TABLE monitoring_relationships (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    managing_doctor_id INTEGER REFERENCES doctor_profiles(id),
    visibility VARCHAR(50) DEFAULT 'Assigned Only',
    selected_doctor_ids INTEGER[] DEFAULT '{}'
);

CREATE TABLE monitoring_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    managing_doctor_id INTEGER REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    care_focus VARCHAR(255) NOT NULL,
    started_at DATE,
    ended_at DATE
);

CREATE INDEX monitoring_history_patient_started_idx
    ON monitoring_history (patient_id, started_at DESC, id DESC);

CREATE TABLE lifestyle_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL,
    title VARCHAR(255),
    detail TEXT,
    extra TEXT,
    payload JSONB DEFAULT '{}'
);

CREATE TABLE provider_goals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    assigned_by_doctor_id INTEGER REFERENCES doctor_profiles(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    target VARCHAR(255),
    frequency VARCHAR(50),
    start_date DATE,
    review_date DATE,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    evaluation_type VARCHAR(50),
    target_value NUMERIC,
    target_unit VARCHAR(50),
    metric_key VARCHAR(100)
);

CREATE TABLE personal_goals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    target VARCHAR(255),
    frequency VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    progress_percent INTEGER DEFAULT 0,
    start_date DATE,
    review_date DATE,
    instructions TEXT
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    sender_role VARCHAR(20),
    text TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_notes (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX doctor_notes_doctor_created_idx
    ON doctor_notes (doctor_id, created_at DESC, id DESC);

CREATE TABLE team_messages (
    id SERIAL PRIMARY KEY,
    sender_doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    recipient_doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX team_messages_conversation_created_idx
    ON team_messages (sender_doctor_id, recipient_doctor_id, created_at, id);
CREATE INDEX team_messages_recipient_created_idx
    ON team_messages (recipient_doctor_id, created_at, id);

CREATE TABLE doctor_patient_reminders (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doctor_patient_reminders_unique_pair UNIQUE (doctor_id, patient_id)
);

CREATE TABLE account_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'system'
        CHECK (theme IN ('system', 'light', 'dark')),
    accent VARCHAR(20) NOT NULL DEFAULT 'teal'
        CHECK (accent IN ('teal', 'blue', 'purple', 'green', 'navy')),
    text_size VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (text_size IN ('normal', 'large', 'xlarge')),
    language VARCHAR(20) NOT NULL DEFAULT 'English'
        CHECK (language IN ('English', 'Filipino')),
    default_patient_type VARCHAR(50) NOT NULL DEFAULT 'Out-patient'
        CHECK (default_patient_type IN ('Out-patient', 'In-patient')),
    default_follow_up_days SMALLINT NOT NULL DEFAULT 7
        CHECK (default_follow_up_days IN (3, 7, 14, 30)),
    default_visibility VARCHAR(50) NOT NULL DEFAULT 'Assigned Only'
        CHECK (default_visibility IN ('Assigned Only', 'Selected Doctors', 'All Doctors')),
    notify_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
    notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
    notify_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    notify_activity BOOLEAN NOT NULL DEFAULT TRUE,
    notify_daily_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    notify_message_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    notify_weekly_summary BOOLEAN NOT NULL DEFAULT FALSE,
    notify_goal_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_preferences (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('patient', 'doctor')),
    target_id INTEGER NOT NULL CHECK (target_id > 0),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    notification_preference VARCHAR(30) NOT NULL DEFAULT 'All messages'
        CHECK (notification_preference IN ('All messages', 'Important only', 'Muted')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversation_preferences_owner_target_unique
        UNIQUE (owner_user_id, target_type, target_id)
);

CREATE INDEX conversation_preferences_owner_idx
    ON conversation_preferences (owner_user_id, target_type, target_id);

-- Legacy table from the earlier Express/TypeScript prototype (backend/src/seed.ts).
-- Not read or written by the current Django API (no model/view references it); kept
-- here only because it still exists in the live database. Safe to drop once confirmed unused.
CREATE TABLE vitals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    heart_rate INTEGER,
    blood_pressure VARCHAR(20),
    spo2 INTEGER,
    temperature NUMERIC(4, 1),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
