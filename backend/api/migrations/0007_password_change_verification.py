from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0006_patient_activity_types")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS password_change_verifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    code_hash VARCHAR(255) NOT NULL,
                    requested_at TIMESTAMPTZ NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    attempts SMALLINT NOT NULL DEFAULT 0,
                    verified_at TIMESTAMPTZ NULL
                );
            """,
            reverse_sql="DROP TABLE IF EXISTS password_change_verifications;",
        ),
    ]
