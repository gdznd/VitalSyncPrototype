from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0003_doctor_profile_phone")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS monitoring_history (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
                    managing_doctor_id INTEGER NULL REFERENCES doctor_profiles(id) ON DELETE SET NULL,
                    care_focus VARCHAR(255) NOT NULL,
                    started_at DATE NULL,
                    ended_at DATE NULL
                );

                INSERT INTO monitoring_history
                    (patient_id, managing_doctor_id, care_focus, started_at, ended_at)
                SELECT DISTINCT ON (patient.id)
                    patient.id,
                    relationship.managing_doctor_id,
                    COALESCE(patient.care_focus, 'General lifestyle care'),
                    NULL,
                    NULL
                FROM patient_profiles AS patient
                JOIN monitoring_relationships AS relationship
                    ON relationship.patient_id = patient.id
                WHERE patient.monitoring_active = TRUE
                  AND NOT EXISTS (
                    SELECT 1
                    FROM monitoring_history AS history
                    WHERE history.patient_id = patient.id
                      AND history.ended_at IS NULL
                  )
                ORDER BY patient.id, relationship.id;

                CREATE INDEX IF NOT EXISTS monitoring_history_patient_started_idx
                    ON monitoring_history (patient_id, started_at DESC, id DESC);

                CREATE TABLE IF NOT EXISTS doctor_notes (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
                    text TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS doctor_notes_doctor_created_idx
                    ON doctor_notes (doctor_id, created_at DESC, id DESC);

                CREATE TABLE IF NOT EXISTS team_messages (
                    id SERIAL PRIMARY KEY,
                    sender_doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
                    recipient_doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
                    text TEXT NOT NULL,
                    is_important BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS team_messages_conversation_created_idx
                    ON team_messages (sender_doctor_id, recipient_doctor_id, created_at, id);
                CREATE INDEX IF NOT EXISTS team_messages_recipient_created_idx
                    ON team_messages (recipient_doctor_id, created_at, id);

                CREATE TABLE IF NOT EXISTS doctor_patient_reminders (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
                    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
                    enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT doctor_patient_reminders_unique_pair UNIQUE (doctor_id, patient_id)
                );
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
