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

CREATE TABLE doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    initials VARCHAR(10),
    display_color VARCHAR(50),
    clinic VARCHAR(255),
    about TEXT,
    license VARCHAR(255)
);

CREATE TABLE patient_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    unique_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    phone VARCHAR(50),
    care_focus VARCHAR(255),
    patient_type VARCHAR(50) DEFAULT 'Out-patient',
    status VARCHAR(50) DEFAULT 'On track',
    priority VARCHAR(20) DEFAULT 'Medium',
    follow_up_date DATE,
    monitoring_active BOOLEAN DEFAULT true
);

CREATE TABLE monitoring_relationships (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
    managing_doctor_id INTEGER REFERENCES doctor_profiles(id),
    visibility VARCHAR(50) DEFAULT 'Assigned Only',
    selected_doctor_ids INTEGER[] DEFAULT '{}'
);

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
