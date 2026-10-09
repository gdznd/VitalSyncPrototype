from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0004_persist_activity_history_and_doctor_records")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS account_preferences (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    theme VARCHAR(20) NOT NULL DEFAULT 'system',
                    accent VARCHAR(20) NOT NULL DEFAULT 'teal',
                    text_size VARCHAR(20) NOT NULL DEFAULT 'normal',
                    language VARCHAR(20) NOT NULL DEFAULT 'English',
                    default_patient_type VARCHAR(50) NOT NULL DEFAULT 'Out-patient',
                    default_follow_up_days SMALLINT NOT NULL DEFAULT 7,
                    default_visibility VARCHAR(50) NOT NULL DEFAULT 'Assigned Only',
                    notify_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_reminders BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_activity BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_daily_reminder BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_message_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                    notify_weekly_summary BOOLEAN NOT NULL DEFAULT FALSE,
                    notify_goal_reminders BOOLEAN NOT NULL DEFAULT TRUE,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT account_preferences_theme_valid
                        CHECK (theme IN ('system', 'light', 'dark')),
                    CONSTRAINT account_preferences_accent_valid
                        CHECK (accent IN ('teal', 'blue', 'purple', 'green', 'navy')),
                    CONSTRAINT account_preferences_text_size_valid
                        CHECK (text_size IN ('normal', 'large', 'xlarge')),
                    CONSTRAINT account_preferences_language_valid
                        CHECK (language IN ('English', 'Filipino')),
                    CONSTRAINT account_preferences_patient_type_valid
                        CHECK (default_patient_type IN ('Out-patient', 'In-patient')),
                    CONSTRAINT account_preferences_follow_up_valid
                        CHECK (default_follow_up_days IN (3, 7, 14, 30)),
                    CONSTRAINT account_preferences_visibility_valid
                        CHECK (default_visibility IN ('Assigned Only', 'Selected Doctors', 'All Doctors'))
                );

                CREATE TABLE IF NOT EXISTS conversation_preferences (
                    id SERIAL PRIMARY KEY,
                    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    target_type VARCHAR(20) NOT NULL,
                    target_id INTEGER NOT NULL CHECK (target_id > 0),
                    pinned BOOLEAN NOT NULL DEFAULT FALSE,
                    notification_preference VARCHAR(30) NOT NULL DEFAULT 'All messages',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT conversation_preferences_target_type_valid
                        CHECK (target_type IN ('patient', 'doctor')),
                    CONSTRAINT conversation_preferences_notification_valid
                        CHECK (notification_preference IN ('All messages', 'Important only', 'Muted')),
                    CONSTRAINT conversation_preferences_owner_target_unique
                        UNIQUE (owner_user_id, target_type, target_id)
                );

                CREATE INDEX IF NOT EXISTS conversation_preferences_owner_idx
                    ON conversation_preferences (owner_user_id, target_type, target_id);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
