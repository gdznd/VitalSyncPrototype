from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now


class UserAccount(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.CharField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20)
    is_temporary_password = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    class Meta:
        managed = False
        db_table = "users"


class PasswordChangeVerification(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(UserAccount, models.CASCADE, db_column="user_id")
    code_hash = models.CharField(max_length=255)
    requested_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "password_change_verifications"


class DoctorProfile(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(UserAccount, models.DO_NOTHING, blank=True, null=True)
    name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=255, blank=True, null=True)
    initials = models.CharField(max_length=10, blank=True, null=True)
    display_color = models.CharField(max_length=50, blank=True, null=True)
    clinic = models.CharField(max_length=255, blank=True, null=True)
    about = models.TextField(blank=True, null=True)
    license = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "doctor_profiles"


class PatientProfile(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(UserAccount, models.DO_NOTHING, blank=True, null=True)
    unique_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    home_address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=255, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    weight_lbs = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    height_inches = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    care_focus = models.CharField(max_length=255, blank=True, null=True)
    patient_type = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    priority = models.CharField(max_length=20, blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)
    monitoring_active = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "patient_profiles"


class MonitoringRelationship(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    managing_doctor = models.ForeignKey(DoctorProfile, models.DO_NOTHING, blank=True, null=True)
    visibility = models.CharField(max_length=50, blank=True, null=True)
    selected_doctor_ids = ArrayField(
        models.IntegerField(),
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "monitoring_relationships"


class LifestyleLog(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    type = models.CharField(max_length=20)
    date = models.DateField()
    time = models.CharField(max_length=10)
    title = models.CharField(max_length=255, blank=True, null=True)
    detail = models.TextField(blank=True, null=True)
    extra = models.TextField(blank=True, null=True)
    payload = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "lifestyle_logs"


class ProviderGoal(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    assigned_by_doctor = models.ForeignKey(DoctorProfile, models.DO_NOTHING, blank=True, null=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    target = models.CharField(max_length=255, blank=True, null=True)
    frequency = models.CharField(max_length=50, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    review_date = models.DateField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)
    evaluation_type = models.CharField(max_length=50, blank=True, null=True)
    target_value = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True)
    target_unit = models.CharField(max_length=50, blank=True, null=True)
    metric_key = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "provider_goals"


class PersonalGoal(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    target = models.CharField(max_length=255, blank=True, null=True)
    frequency = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)
    progress_percent = models.IntegerField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    review_date = models.DateField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "personal_goals"


class PatientMessage(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING, blank=True, null=True)
    doctor = models.ForeignKey(DoctorProfile, models.DO_NOTHING, blank=True, null=True)
    sender_role = models.CharField(max_length=20, blank=True, null=True)
    text = models.TextField()
    is_important = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True, db_default=Now())

    class Meta:
        managed = False
        db_table = "messages"


class MonitoringHistoryEpisode(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING)
    managing_doctor = models.ForeignKey(DoctorProfile, models.SET_NULL, blank=True, null=True)
    care_focus = models.CharField(max_length=255)
    started_at = models.DateField(blank=True, null=True)
    ended_at = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "monitoring_history"


class DoctorNote(models.Model):
    id = models.AutoField(primary_key=True)
    doctor = models.ForeignKey(DoctorProfile, models.DO_NOTHING)
    text = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True, db_default=Now())

    class Meta:
        managed = False
        db_table = "doctor_notes"


class TeamMessage(models.Model):
    id = models.AutoField(primary_key=True)
    sender_doctor = models.ForeignKey(
        DoctorProfile,
        models.DO_NOTHING,
        related_name="sent_team_messages",
    )
    recipient_doctor = models.ForeignKey(
        DoctorProfile,
        models.DO_NOTHING,
        related_name="received_team_messages",
    )
    text = models.TextField()
    is_important = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True, db_default=Now())

    class Meta:
        managed = False
        db_table = "team_messages"


class DoctorPatientReminder(models.Model):
    id = models.AutoField(primary_key=True)
    doctor = models.ForeignKey(DoctorProfile, models.DO_NOTHING)
    patient = models.ForeignKey(PatientProfile, models.DO_NOTHING)
    enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "doctor_patient_reminders"


class AccountPreference(models.Model):
    user = models.OneToOneField(
        UserAccount,
        models.DO_NOTHING,
        primary_key=True,
        db_column="user_id",
        related_name="account_preferences",
    )
    theme = models.CharField(max_length=20, default="system")
    accent = models.CharField(max_length=20, default="teal")
    text_size = models.CharField(max_length=20, default="normal")
    language = models.CharField(max_length=20, default="English")
    default_patient_type = models.CharField(max_length=50, default="Out-patient")
    default_follow_up_days = models.SmallIntegerField(default=7)
    default_visibility = models.CharField(max_length=50, default="Assigned Only")
    notify_dashboard = models.BooleanField(default=True)
    notify_messages = models.BooleanField(default=True)
    notify_reminders = models.BooleanField(default=True)
    notify_activity = models.BooleanField(default=True)
    notify_daily_reminder = models.BooleanField(default=True)
    notify_message_alerts = models.BooleanField(default=True)
    notify_weekly_summary = models.BooleanField(default=False)
    notify_goal_reminders = models.BooleanField(default=True)
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "account_preferences"


class ConversationPreference(models.Model):
    id = models.AutoField(primary_key=True)
    owner_user = models.ForeignKey(UserAccount, models.DO_NOTHING)
    target_type = models.CharField(max_length=20)
    target_id = models.PositiveIntegerField()
    pinned = models.BooleanField(default=False)
    notification_preference = models.CharField(max_length=30, default="All messages")
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "conversation_preferences"
        constraints = [
            models.UniqueConstraint(
                fields=("owner_user", "target_type", "target_id"),
                name="conversation_preferences_owner_target_unique",
            ),
        ]


class PatientActivityType(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(PatientProfile, models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "patient_activity_types"