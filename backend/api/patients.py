import logging
import re
import secrets
import smtplib
from datetime import date, timedelta

import bcrypt
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.core.mail import EmailMessage
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import AccountPreference, DoctorProfile, MonitoringRelationship, PatientProfile, UserAccount
from api.profiles import calculate_age

logger = logging.getLogger(__name__)


def authorized_patient_ids(doctor_profile_id):
    return MonitoringRelationship.objects.filter(
        Q(managing_doctor_id=doctor_profile_id)
        | Q(visibility="All Doctors")
        | Q(
            visibility="Selected Doctors",
            selected_doctor_ids__contains=[doctor_profile_id],
        )
    ).values_list("patient_id", flat=True)


def get_doctor_profile(user):
    return DoctorProfile.objects.filter(user_id=user.id).first()


def serialize_patient(patient):
    relationship = (
        MonitoringRelationship.objects.filter(patient_id=patient.id)
        .select_related("managing_doctor")
        .first()
    )
    return {
        "id": patient.id,
        "user_id": patient.user_id,
        "unique_id": patient.unique_id,
        "name": patient.name,
        "age": calculate_age(patient.date_of_birth),
        "email": patient.user.email if patient.user else None,
        "created_at": patient.user.created_at if patient.user else None,
        "phone": patient.phone,
        "care_focus": patient.care_focus,
        "patient_type": patient.patient_type,
        "status": patient.status,
        "priority": patient.priority,
        "follow_up_date": patient.follow_up_date.isoformat() if patient.follow_up_date else None,
        "monitoring_active": patient.monitoring_active,
        "visibility": relationship.visibility if relationship else "Assigned Only",
        "selected_doctor_ids": relationship.selected_doctor_ids if relationship else [],
        "managing_doctor_name": relationship.managing_doctor.name if relationship and relationship.managing_doctor else None,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def patient_list(request):
    if request.user.role != "doctor":
        return Response(
            {"message": "Access denied. Doctor role required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    doctor_profile = get_doctor_profile(request.user)
    if not doctor_profile:
        return Response(
            {"message": "Doctor profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "POST":
        return create_patient(request, doctor_profile)

    active_param = request.query_params.get("monitoring_active", "true").lower()
    if active_param not in {"true", "false"}:
        return Response(
            {"message": "monitoring_active must be true or false."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    patients = (
        PatientProfile.objects.filter(
            id__in=authorized_patient_ids(doctor_profile.id),
            monitoring_active=active_param == "true",
        )
        .select_related("user")
        .order_by("user__created_at")
    )
    return Response({"patients": [serialize_patient(patient) for patient in patients]})


def create_patient(request, doctor_profile):
    email = request.data.get("email")
    name = request.data.get("name")
    phone = request.data.get("phone")
    if not isinstance(email, str) or not isinstance(name, str):
        return Response(
            {"message": "A valid email and patient name are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = email.strip().lower()
    name = name.strip()
    if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return Response(
            {"message": "A valid email and patient name are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if phone is not None and not isinstance(phone, str):
        return Response({"message": "Phone must be a string."}, status=status.HTTP_400_BAD_REQUEST)

    smtp_values = [settings.EMAIL_HOST, settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD]
    smtp_configured = all(
        value and not re.match(r"^(your_|placeholder|example)", value, re.IGNORECASE)
        for value in smtp_values
    )
    if not smtp_configured:
        return Response(
            {"message": "Patient invitation email is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    temporary_password = secrets.token_urlsafe(12)
    password_hash = bcrypt.hashpw(temporary_password.encode(), bcrypt.gensalt(rounds=12)).decode()

    try:
        with transaction.atomic():
            preferences = AccountPreference.objects.filter(user_id=doctor_profile.user_id).first()
            default_patient_type = preferences.default_patient_type if preferences else "Out-patient"
            default_follow_up_days = preferences.default_follow_up_days if preferences else 7
            default_visibility = preferences.default_visibility if preferences else "Assigned Only"
            account = UserAccount.objects.create(
                email=email,
                password_hash=password_hash,
                role="patient",
                is_temporary_password=True,
            )
            patient = PatientProfile.objects.create(
                user=account,
                unique_id=f"VS-{account.id:04d}",
                name=name,
                phone=phone.strip() if phone else None,
                care_focus="General lifestyle care",
                patient_type=default_patient_type,
                status="On track",
                priority="Medium",
                follow_up_date=timezone.localdate() + timedelta(days=default_follow_up_days),
                monitoring_active=True,
            )
            MonitoringRelationship.objects.create(
                patient=patient,
                managing_doctor=doctor_profile,
                visibility=default_visibility,
                selected_doctor_ids=[],
            )
            from api.records import start_monitoring_episode

            start_monitoring_episode(patient, doctor_profile)

            message = EmailMessage(
                subject="Your VitalSync Patient Portal account",
                body=(
                    f"Hello {name},\n\n"
                    "Your doctor created a VitalSync Patient Portal account for you.\n"
                    f"Login email: {email}\n"
                    f"Temporary password: {temporary_password}\n"
                    f"Patient Portal: {settings.PATIENT_PORTAL_URL}\n\n"
                    "Sign in with these credentials and change your temporary password after signing in."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            message.send(fail_silently=False)

        return Response(
            {
                "patient": serialize_patient(patient),
                "message": "Patient account created and invitation email sent.",
            },
            status=status.HTTP_201_CREATED,
        )
    except IntegrityError:
        return Response(
            {"message": "A user with this email or patient ID already exists."},
            status=status.HTTP_409_CONFLICT,
        )
    except (OSError, smtplib.SMTPException):
        logger.exception("Patient account creation or invitation email failed")
        return Response(
            {"message": "Could not create the patient account and send its invitation."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def patient_detail(request, patient_id):
    if request.user.role != "doctor":
        return Response(
            {"message": "Access denied. Doctor role required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    doctor_profile = get_doctor_profile(request.user)
    if not doctor_profile:
        return Response(
            {"message": "Doctor profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        return Response(
            {"message": "Patient deletion is disabled; archive monitoring instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    patient = (
        PatientProfile.objects.filter(
            id=patient_id,
            id__in=authorized_patient_ids(doctor_profile.id),
        )
        .select_related("user")
        .first()
    )
    if not patient:
        return Response({"message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"patient": serialize_patient(patient)})

    doctor, managed_patient, error_response = get_managed_patient(request, patient_id)
    if error_response:
        return error_response

    allowed_fields = {"name", "careFocus", "patientType", "priority"}
    if not request.data or not set(request.data).issubset(allowed_fields):
        return Response(
            {"message": "Only name, care focus, patient type, and priority can be updated here."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    updates = {}
    if "name" in request.data:
        value = request.data["name"]
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 255:
            return Response({"message": "A valid patient name is required."}, status=status.HTTP_400_BAD_REQUEST)
        updates["name"] = value.strip()
    if "careFocus" in request.data:
        value = request.data["careFocus"]
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 255:
            return Response({"message": "A valid care focus is required."}, status=status.HTTP_400_BAD_REQUEST)
        updates["care_focus"] = value.strip()
    if "patientType" in request.data:
        value = request.data["patientType"]
        if not isinstance(value, str) or value not in {"Out-patient", "In-patient"}:
            return Response({"message": "Invalid patient type."}, status=status.HTTP_400_BAD_REQUEST)
        updates["patient_type"] = value
    if "priority" in request.data:
        value = request.data["priority"]
        if not isinstance(value, str) or value not in {"High", "Medium", "Low"}:
            return Response({"message": "Invalid priority."}, status=status.HTTP_400_BAD_REQUEST)
        updates["priority"] = value

    with transaction.atomic():
        care_focus = updates.pop("care_focus", None)
        changed_care_focus = care_focus is not None and care_focus != managed_patient.care_focus
        for field, value in updates.items():
            setattr(managed_patient, field, value)
        if updates:
            managed_patient.save(update_fields=list(updates))
        if changed_care_focus:
            from api.records import change_monitoring_care_focus

            if managed_patient.monitoring_active:
                change_monitoring_care_focus(managed_patient, doctor, care_focus)
            else:
                managed_patient.care_focus = care_focus
                managed_patient.save(update_fields=["care_focus"])
    return Response({"message": "Patient updated successfully", "patient": serialize_patient(patient)})


def get_managed_patient(request, patient_id):
    doctor = get_doctor_profile(request.user)
    if not doctor:
        return None, None, Response(
            {"message": "Doctor profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )

    patient = PatientProfile.objects.filter(id=patient_id).first()
    if not patient:
        return doctor, None, Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
    is_manager = MonitoringRelationship.objects.filter(
        patient_id=patient.id,
        managing_doctor_id=doctor.id,
    ).exists()
    if not is_manager:
        return doctor, None, Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
    return doctor, patient, None


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_patient_follow_up(request, patient_id):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)
    _, patient, error_response = get_managed_patient(request, patient_id)
    if error_response:
        return error_response

    value = request.data.get("followUpDate")
    if value in (None, ""):
        patient.follow_up_date = None
    elif isinstance(value, str):
        try:
            patient.follow_up_date = date.fromisoformat(value)
        except ValueError:
            return Response({"message": "followUpDate must use YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"message": "Invalid follow-up date."}, status=status.HTTP_400_BAD_REQUEST)

    patient.save(update_fields=["follow_up_date"])
    return Response({"patient": serialize_patient(patient)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_patient(request, patient_id):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)
    _, patient, error_response = get_managed_patient(request, patient_id)
    if error_response:
        return error_response

    with transaction.atomic():
        from api.records import end_monitoring_episode

        end_monitoring_episode(patient)
        patient.monitoring_active = False
        patient.save(update_fields=["monitoring_active"])
    return Response({"patient": serialize_patient(patient), "message": "Monitoring archived."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reactivate_patient(request):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)

    unique_id = request.data.get("uniqueId")
    if not isinstance(unique_id, str) or not unique_id.strip():
        return Response({"message": "Patient unique ID is required."}, status=status.HTTP_400_BAD_REQUEST)
    patient = PatientProfile.objects.filter(unique_id__iexact=unique_id.strip()).first()
    if not patient:
        return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
    _, managed_patient, error_response = get_managed_patient(request, patient.id)
    if error_response:
        return error_response
    if managed_patient.monitoring_active:
        return Response({"patient": serialize_patient(managed_patient), "message": "Monitoring is already active."})

    with transaction.atomic():
        from api.records import start_monitoring_episode

        managed_patient.monitoring_active = True
        managed_patient.save(update_fields=["monitoring_active"])
        start_monitoring_episode(managed_patient, get_doctor_profile(request.user))
    return Response({"patient": serialize_patient(managed_patient), "message": "Monitoring reactivated."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_directory(request):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)

    doctors = DoctorProfile.objects.order_by("name")
    return Response({
        "doctors": [
            {
                "id": doctor.id,
                "name": doctor.name,
                "initials": doctor.initials or "",
                "color": doctor.display_color or "#d9ecf1",
                "specialty": doctor.specialty or "Doctor",
                "is_current": doctor.user_id == request.user.id,
            }
            for doctor in doctors
        ]
    })


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_patient_visibility(request, patient_id):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)

    doctor, patient, error_response = get_managed_patient(request, patient_id)
    if error_response:
        return error_response

    visibility = request.data.get("visibility")
    if visibility not in {"Assigned Only", "Selected Doctors", "All Doctors"}:
        return Response({"message": "Invalid patient visibility."}, status=status.HTTP_400_BAD_REQUEST)

    selected_ids = request.data.get("selectedDoctorIds", [])
    if not isinstance(selected_ids, list) or any(
        isinstance(doctor_id, bool) or not isinstance(doctor_id, int) or doctor_id <= 0
        for doctor_id in selected_ids
    ):
        return Response({"message": "selectedDoctorIds must be a list of doctor profile IDs."}, status=status.HTTP_400_BAD_REQUEST)
    if len(selected_ids) != len(set(selected_ids)):
        return Response({"message": "selectedDoctorIds cannot contain duplicates."}, status=status.HTTP_400_BAD_REQUEST)
    if selected_ids and DoctorProfile.objects.filter(id__in=selected_ids).count() != len(selected_ids):
        return Response({"message": "One or more selected doctors do not exist."}, status=status.HTTP_400_BAD_REQUEST)

    relationship = MonitoringRelationship.objects.filter(
        patient_id=patient.id,
        managing_doctor_id=doctor.id,
    ).first()
    if not relationship:
        return Response({"message": "Monitoring relationship not found."}, status=status.HTTP_404_NOT_FOUND)

    relationship.visibility = visibility
    relationship.selected_doctor_ids = (
        [selected_id for selected_id in selected_ids if selected_id != doctor.id]
        if visibility == "Selected Doctors"
        else []
    )
    relationship.save(update_fields=["visibility", "selected_doctor_ids"])
    return Response({"patient": serialize_patient(patient)})