from django.contrib import admin
from django.urls import path

from api.activity_types import patient_activity_types
from api.patients import archive_patient, doctor_directory, patient_detail, patient_list, reactivate_patient, update_patient_follow_up, update_patient_visibility
from api.logs import lifestyle_logs
from api.goals import doctor_provider_goals, patient_provider_goals
from api.personal_goals import personal_goal_detail, personal_goals
from api.messaging import doctor_patient_conversation, patient_conversation, patient_provider_directory
from api.profiles import change_patient_email, doctor_profile, patient_profile
from api.preferences import account_preferences, conversation_preferences
from api.records import doctor_note_detail, doctor_notes, doctor_reminders, monitoring_history, patient_reminder, team_messages
from api.views import change_password, current_user, health_check, login, register_doctor

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health_check, name="health-check"),
    path("api/auth/login", login, name="login"),
    path("api/auth/register-doctor", register_doctor, name="register-doctor"),
    path("api/auth/me", current_user, name="current-user"),
    path("api/auth/change-password", change_password, name="change-password"),
    path("api/patient/profile", patient_profile, name="patient-profile"),
    path("api/patient/account/email", change_patient_email, name="patient-change-email"),
    path("api/doctor/profile", doctor_profile, name="doctor-profile"),
    path("api/patients", patient_list, name="patient-list"),
    path("api/patients/reactivate", reactivate_patient, name="patient-reactivate"),
    path("api/doctors", doctor_directory, name="doctor-directory"),
    path("api/patients/<int:patient_id>", patient_detail, name="patient-detail"),
    path("api/patients/<int:patient_id>/follow-up", update_patient_follow_up, name="patient-follow-up"),
    path("api/patients/<int:patient_id>/archive", archive_patient, name="patient-archive"),
    path("api/patients/<int:patient_id>/visibility", update_patient_visibility, name="patient-visibility"),
    path("api/logs", lifestyle_logs, name="lifestyle-logs"),
    path("api/activity-types", patient_activity_types, name="patient-activity-types"),
    path("api/patients/<int:patient_id>/provider-goals", doctor_provider_goals, name="doctor-provider-goals"),
    path("api/provider-goals", patient_provider_goals, name="patient-provider-goals"),
    path("api/personal-goals", personal_goals, name="personal-goals"),
    path("api/personal-goals/<int:goal_id>", personal_goal_detail, name="personal-goal-detail"),
    path("api/providers", patient_provider_directory, name="patient-provider-directory"),
    path("api/messages/<int:doctor_id>", patient_conversation, name="patient-conversation"),
    path("api/patients/<int:patient_id>/messages", doctor_patient_conversation, name="doctor-patient-conversation"),
    path("api/patients/<int:patient_id>/monitoring-history", monitoring_history, name="monitoring-history"),
    path("api/doctor/notes", doctor_notes, name="doctor-notes"),
    path("api/doctor/notes/<int:note_id>", doctor_note_detail, name="doctor-note-detail"),
    path("api/doctor/reminders", doctor_reminders, name="doctor-reminders"),
    path("api/patients/<int:patient_id>/reminder", patient_reminder, name="patient-reminder"),
    path("api/preferences", account_preferences, name="account-preferences"),
    path(
        "api/conversation-preferences/<str:target_type>/<int:target_id>",
        conversation_preferences,
        name="conversation-preferences",
    ),
    path("api/team/messages/<int:doctor_id>", team_messages, name="team-messages"),
]