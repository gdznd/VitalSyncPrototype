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

    class Meta:
        managed = False
        db_table = "doctor_profiles"


class PatientProfile(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(UserAccount, models.DO_NOTHING, blank=True, null=True)
    unique_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    age = models.IntegerField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
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