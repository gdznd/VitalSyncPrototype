from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0001_add_personal_goal_details")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE patient_profiles
                    ADD COLUMN IF NOT EXISTS home_address TEXT NULL,
                    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255) NULL,
                    ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL,
                    ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(6, 2) NULL,
                    ADD COLUMN IF NOT EXISTS height_inches NUMERIC(6, 2) NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
