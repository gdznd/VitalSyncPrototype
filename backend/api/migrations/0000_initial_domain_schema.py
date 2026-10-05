from pathlib import Path

import sqlparse
from django.db import migrations

SCHEMA_SQL = Path(__file__).with_suffix(".sql").read_text(encoding="utf-8")
SCHEMA_STATEMENTS = tuple(
    statement
    for statement in sqlparse.split(SCHEMA_SQL)
    if statement.strip()
)


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    replaces = [
        ("api", "0001_add_personal_goal_details"),
        ("api", "0002_patient_profile_fields"),
        ("api", "0003_doctor_profile_phone"),
        ("api", "0004_persist_activity_history_and_doctor_records"),
        ("api", "0005_persist_user_and_conversation_preferences"),
        ("api", "0006_patient_activity_types"),
    ]

    operations = [
        migrations.RunSQL(
            sql=SCHEMA_STATEMENTS,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
