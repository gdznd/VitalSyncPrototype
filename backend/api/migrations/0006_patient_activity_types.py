from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0005_persist_user_and_conversation_preferences")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS patient_activity_types (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE UNIQUE INDEX IF NOT EXISTS patient_activity_types_patient_name_unique
                    ON patient_activity_types (patient_id, LOWER(name));
            """,
            reverse_sql="""
                DROP TABLE IF EXISTS patient_activity_types;
            """,
        ),
    ]
