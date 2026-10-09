from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.messaging import patient_provider_ids
from api.models import (
    AccountPreference,
    ConversationPreference,
    DoctorProfile,
    PatientProfile,
)
from api.patients import authorized_patient_ids
from api.records import get_doctor

DOCTOR_NOTIFICATION_FIELDS = {
    "dashboard": "notify_dashboard",
    "messages": "notify_messages",
    "reminders": "notify_reminders",
    "activity": "notify_activity",
}
PATIENT_NOTIFICATION_FIELDS = {
    "dailyReminder": "notify_daily_reminder",
    "messageAlerts": "notify_message_alerts",
    "weeklySummary": "notify_weekly_summary",
    "goalReminders": "notify_goal_reminders",
}
NOTIFICATION_PREFERENCES = {"All messages", "Important only", "Muted"}


def serialize_account_preferences(preference, role, clinic=""):
    data = {
        "theme": preference.theme,
        "accent": preference.accent,
    }
    if role == "doctor":
        data.update({
            "clinic": clinic or "",
            "defaultPatientType": preference.default_patient_type,
            "defaultFollowUpDays": preference.default_follow_up_days,
            "defaultVisibility": preference.default_visibility,
            "notifications": {
                "dashboard": preference.notify_dashboard,
                "messages": preference.notify_messages,
                "reminders": preference.notify_reminders,
                "activity": preference.notify_activity,
            },
        })
    else:
        data.update({
            "textSize": preference.text_size,
            "language": preference.language,
            "notifications": {
                "dailyReminder": preference.notify_daily_reminder,
                "messageAlerts": preference.notify_message_alerts,
                "weeklySummary": preference.notify_weekly_summary,
                "goalReminders": preference.notify_goal_reminders,
            },
        })
    return data


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def account_preferences(request):
    if request.user.role not in {"doctor", "patient"}:
        return Response({"message": "Unsupported account role."}, status=status.HTTP_403_FORBIDDEN)

    doctor_profile = None
    if request.user.role == "doctor":
        doctor_profile, error_response = get_doctor(request)
        if error_response:
            return error_response
    elif not PatientProfile.objects.filter(user_id=request.user.id).exists():
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

    preference, _ = AccountPreference.objects.get_or_create(user_id=request.user.id)
    if request.method == "GET":
        return Response({
            "preferences": serialize_account_preferences(
                preference,
                request.user.role,
                doctor_profile.clinic if doctor_profile else "",
            )
        })

    data = request.data
    if not isinstance(data, dict) or not data:
        return Response({"message": "At least one preference is required."}, status=status.HTTP_400_BAD_REQUEST)

    common_fields = {"theme", "accent", "notifications"}
    role_fields = (
        {"clinic", "defaultPatientType", "defaultFollowUpDays", "defaultVisibility"}
        if request.user.role == "doctor"
        else {"textSize", "language"}
    )
    if set(data) - common_fields - role_fields:
        return Response({"message": "Unsupported preference field."}, status=status.HTTP_400_BAD_REQUEST)

    changes = {}
    if "theme" in data:
        if not isinstance(data["theme"], str) or data["theme"] not in {"system", "light", "dark"}:
            return Response({"message": "Invalid theme."}, status=status.HTTP_400_BAD_REQUEST)
        changes["theme"] = data["theme"]
    if "accent" in data:
        allowed_accents = {"teal", "purple", "green", "navy"}
        if request.user.role == "doctor":
            allowed_accents.add("blue")
        if not isinstance(data["accent"], str) or data["accent"] not in allowed_accents:
            return Response({"message": "Invalid accent color."}, status=status.HTTP_400_BAD_REQUEST)
        changes["accent"] = data["accent"]
    if "notifications" in data:
        notifications = data["notifications"]
        notification_fields = (
            DOCTOR_NOTIFICATION_FIELDS if request.user.role == "doctor" else PATIENT_NOTIFICATION_FIELDS
        )
        if not isinstance(notifications, dict) or not notifications:
            return Response({"message": "Notifications must be a non-empty object."}, status=status.HTTP_400_BAD_REQUEST)
        if set(notifications) - set(notification_fields):
            return Response({"message": "Unsupported notification preference."}, status=status.HTTP_400_BAD_REQUEST)
        if any(not isinstance(value, bool) for value in notifications.values()):
            return Response({"message": "Notification preferences must be booleans."}, status=status.HTTP_400_BAD_REQUEST)
        changes.update({
            notification_fields[key]: value
            for key, value in notifications.items()
        })

    if request.user.role == "doctor":
        if "clinic" in data:
            clinic = data["clinic"]
            if not isinstance(clinic, str) or len(clinic) > 255:
                return Response({"message": "Clinic must be a string of 255 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        if "defaultPatientType" in data:
            if not isinstance(data["defaultPatientType"], str) or data["defaultPatientType"] not in {"Out-patient", "In-patient"}:
                return Response({"message": "Invalid default patient type."}, status=status.HTTP_400_BAD_REQUEST)
            changes["default_patient_type"] = data["defaultPatientType"]
        if "defaultFollowUpDays" in data:
            value = data["defaultFollowUpDays"]
            if not isinstance(value, int) or isinstance(value, bool) or value not in {3, 7, 14, 30}:
                return Response({"message": "Default follow-up interval must be 3, 7, 14, or 30 days."}, status=status.HTTP_400_BAD_REQUEST)
            changes["default_follow_up_days"] = value
        if "defaultVisibility" in data:
            if not isinstance(data["defaultVisibility"], str) or data["defaultVisibility"] not in {"Assigned Only", "Selected Doctors", "All Doctors"}:
                return Response({"message": "Invalid default visibility."}, status=status.HTTP_400_BAD_REQUEST)
            changes["default_visibility"] = data["defaultVisibility"]
    else:
        if "textSize" in data:
            if not isinstance(data["textSize"], str) or data["textSize"] not in {"normal", "large", "xlarge"}:
                return Response({"message": "Invalid text size."}, status=status.HTTP_400_BAD_REQUEST)
            changes["text_size"] = data["textSize"]
        if "language" in data:
            if not isinstance(data["language"], str) or data["language"] not in {"English", "Filipino"}:
                return Response({"message": "Invalid language."}, status=status.HTTP_400_BAD_REQUEST)
            changes["language"] = data["language"]

    with transaction.atomic():
        if changes:
            for field, value in changes.items():
                setattr(preference, field, value)
            preference.updated_at = timezone.now()
            preference.save(update_fields=[*changes, "updated_at"])
        if request.user.role == "doctor" and "clinic" in data:
            doctor_profile.clinic = data["clinic"]
            doctor_profile.save(update_fields=["clinic"])

    preference.refresh_from_db()
    return Response({
        "preferences": serialize_account_preferences(
            preference,
            request.user.role,
            doctor_profile.clinic if doctor_profile else "",
        )
    })


def validate_conversation_access(request, target_type, target_id):
    if request.user.role == "doctor":
        doctor, error_response = get_doctor(request)
        if error_response:
            return None, error_response
        if target_type == "patient":
            target = PatientProfile.objects.filter(
                id=target_id,
                id__in=authorized_patient_ids(doctor.id),
            ).first()
        elif target_type == "doctor" and target_id != doctor.id:
            target = DoctorProfile.objects.filter(id=target_id).first()
        else:
            target = None
        if not target:
            return None, Response({"message": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        return (request.user.id, target_type, target_id), None

    if request.user.role == "patient" and target_type == "doctor":
        patient = PatientProfile.objects.filter(user_id=request.user.id).first()
        doctor = patient_provider_ids(patient).filter(id=target_id).first() if patient else None
        if not doctor:
            return None, Response({"message": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        return (request.user.id, target_type, target_id), None

    return None, Response({"message": "Unsupported conversation."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def conversation_preferences(request, target_type, target_id):
    identity, error_response = validate_conversation_access(request, target_type, target_id)
    if error_response:
        return error_response

    owner_user_id, resolved_type, resolved_id = identity
    preference = ConversationPreference.objects.filter(
        owner_user_id=owner_user_id,
        target_type=resolved_type,
        target_id=resolved_id,
    ).first()
    if request.method == "GET":
        return Response({
            "preferences": {
                "pinned": preference.pinned if preference else False,
                "notificationPreference": (
                    preference.notification_preference if preference else "All messages"
                ),
            }
        })

    if not isinstance(request.data, dict) or not request.data:
        return Response({"message": "At least one conversation preference is required."}, status=status.HTTP_400_BAD_REQUEST)
    if set(request.data) - {"pinned", "notificationPreference"}:
        return Response({"message": "Unsupported conversation preference."}, status=status.HTTP_400_BAD_REQUEST)

    defaults = {}
    if "pinned" in request.data:
        if not isinstance(request.data["pinned"], bool):
            return Response({"message": "pinned must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)
        defaults["pinned"] = request.data["pinned"]
    if "notificationPreference" in request.data:
        value = request.data["notificationPreference"]
        if not isinstance(value, str) or value not in NOTIFICATION_PREFERENCES:
            return Response({"message": "Invalid notification preference."}, status=status.HTTP_400_BAD_REQUEST)
        defaults["notification_preference"] = value

    preference, _ = ConversationPreference.objects.update_or_create(
        owner_user_id=owner_user_id,
        target_type=resolved_type,
        target_id=resolved_id,
        defaults={**defaults, "updated_at": timezone.now()},
    )
    return Response({
        "preferences": {
            "pinned": preference.pinned,
            "notificationPreference": preference.notification_preference,
        }
    })
