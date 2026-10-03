from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0002_patient_profile_fields")]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
