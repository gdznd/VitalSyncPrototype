from django.db import migrations


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE personal_goals
                    ADD COLUMN IF NOT EXISTS start_date date NULL,
                    ADD COLUMN IF NOT EXISTS review_date date NULL,
                    ADD COLUMN IF NOT EXISTS instructions text NULL;
            """,
        ),
    ]