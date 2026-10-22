from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("api", "0008_initial")]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE users
                            ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;

                        CREATE TABLE doctor_registration_verifications (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                            code_hash VARCHAR(255) NOT NULL,
                            requested_at TIMESTAMPTZ NOT NULL,
                            expires_at TIMESTAMPTZ NOT NULL,
                            attempts SMALLINT NOT NULL DEFAULT 0
                        );
                    """,
                    reverse_sql="""
                        DROP TABLE IF EXISTS doctor_registration_verifications;
                        ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
                    """,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="useraccount",
                    name="email_verified",
                    field=models.BooleanField(default=True),
                ),
                migrations.CreateModel(
                    name="DoctorRegistrationVerification",
                    fields=[
                        ("id", models.AutoField(primary_key=True, serialize=False)),
                        (
                            "user",
                            models.OneToOneField(
                                db_column="user_id",
                                on_delete=django.db.models.deletion.CASCADE,
                                to="api.useraccount",
                            ),
                        ),
                        ("code_hash", models.CharField(max_length=255)),
                        ("requested_at", models.DateTimeField()),
                        ("expires_at", models.DateTimeField()),
                        ("attempts", models.PositiveSmallIntegerField(default=0)),
                    ],
                    options={
                        "db_table": "doctor_registration_verifications",
                        "managed": False,
                    },
                ),
            ],
        ),
    ]
