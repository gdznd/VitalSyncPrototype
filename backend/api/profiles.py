import re
from datetime import date
from decimal import Decimal, InvalidOperation

import bcrypt
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import DoctorProfile, MonitoringRelationship, PatientProfile, UserAccount

PROFILE_FIELDS = {
    "phone": ("phone", 50),
    "homeAddress": ("home_address", 1000),
    "emergencyContact": ("emergency_contact", 255),
}
DOCTOR_PROFILE_FIELDS = {
    "name": ("name", 255),
    "specialty": ("specialty", 255),
    "clinic": ("clinic", 255),
    "about": ("about", 4000),
    "license": ("license", 255),
    "phone": ("phone", 50),
}
METRIC_FIELDS = {
    "weightLbs": "weight_lbs",
    "heightInches": "height_inches",
}


def serialize_doctor_profile(doctor):
    return {
        "id": doctor.id,
        "name": doctor.name,
        "email": doctor.user.email,
        "specialty": doctor.specialty or "",
        "clinic": doctor.clinic or "",
        "about": doctor.about or "",
        "license": doctor.license or "",
        "phone": doctor.phone or "",
        "initials": doctor.initials or "",
        "color": doctor.display_color or "#d9ecf1",
    }


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def doctor_profile(request):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)
    doctor = (
        DoctorProfile.objects.select_related("user")
        .filter(user_id=request.user.id)
        .first()
    )
    if not doctor:
        return Response({"message": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"profile": serialize_doctor_profile(doctor)})
    if not isinstance(request.data, dict):
        return Response({"message": "Profile changes must be an object."}, status=status.HTTP_400_BAD_REQUEST)

    unknown_fields = set(request.data) - set(DOCTOR_PROFILE_FIELDS)
    if unknown_fields:
        return Response(
            {"message": f"Unsupported doctor profile field: {sorted(unknown_fields)[0]}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    updates = {}
    for api_name, (model_name, max_length) in DOCTOR_PROFILE_FIELDS.items():
        if api_name not in request.data:
            continue
        value = request.data[api_name]
        if api_name == "name":
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
                return Response(
                    {"message": f"{api_name} must be a non-empty string of {max_length} characters or fewer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            updates[model_name] = value.strip()
        elif value is None:
            updates[model_name] = None
        elif isinstance(value, str) and len(value.strip()) <= max_length:
            updates[model_name] = value.strip() or None
        else:
            return Response(
                {"message": f"{api_name} must be a string of {max_length} characters or fewer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if updates:
        if "name" in updates:
            updates["initials"] = "".join(
                part[0] for part in updates["name"].split() if part
            )[:2].upper() or "DR"
        for field, value in updates.items():
            setattr(doctor, field, value)
        doctor.save(update_fields=list(updates))
    return Response({"profile": serialize_doctor_profile(doctor)})


def calculate_age(date_of_birth, today=None):
    if not date_of_birth:
        return None
    today = today or date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )


def serialize_patient_profile(patient):
    account = patient.user
    relationship = (
        MonitoringRelationship.objects.filter(patient_id=patient.id)
        .select_related("managing_doctor")
        .first()
    )
    doctor = relationship.managing_doctor if relationship else None
    return {
        "name": patient.name,
        "email": account.email,
        "memberSince": account.created_at.date().isoformat() if account.created_at else None,
        "primaryPhysician": doctor.name if doctor else None,
        "careFocus": patient.care_focus,
        "monitoringActive": bool(patient.monitoring_active),
        "phone": patient.phone or "",
        "homeAddress": patient.home_address or "",
        "emergencyContact": patient.emergency_contact or "",
        "dateOfBirth": patient.date_of_birth.isoformat() if patient.date_of_birth else "",
        "age": calculate_age(patient.date_of_birth),
        "weightLbs": str(patient.weight_lbs) if patient.weight_lbs is not None else "",
        "heightInches": str(patient.height_inches) if patient.height_inches is not None else "",
    }


def parse_optional_metric(value, field_name):
    if value in (None, ""):
        return None, None
    if isinstance(value, bool):
        return None, f"{field_name} must be a positive number."
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None, f"{field_name} must be a positive number."
    if not parsed.is_finite() or parsed <= 0 or parsed > Decimal("9999.99"):
        return None, f"{field_name} must be greater than 0 and at most 9999.99."
    if parsed.as_tuple().exponent < -2:
        return None, f"{field_name} supports at most 2 decimal places."
    return parsed, None


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def patient_profile(request):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)
    patient = (
        PatientProfile.objects.select_related("user")
        .filter(user_id=request.user.id)
        .first()
    )
    if not patient:
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"profile": serialize_patient_profile(patient)})

    allowed_fields = set(PROFILE_FIELDS) | set(METRIC_FIELDS) | {"dateOfBirth"}
    unknown_fields = set(request.data) - allowed_fields
    if unknown_fields:
        return Response(
            {"message": f"Unsupported patient profile field: {sorted(unknown_fields)[0]}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    updates = {}
    for api_name, (model_name, max_length) in PROFILE_FIELDS.items():
        if api_name not in request.data:
            continue
        value = request.data[api_name]
        if value is None:
            updates[model_name] = None
        elif isinstance(value, str) and len(value.strip()) <= max_length:
            updates[model_name] = value.strip() or None
        else:
            return Response(
                {"message": f"{api_name} must be a string of {max_length} characters or fewer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    for api_name, model_name in METRIC_FIELDS.items():
        if api_name not in request.data:
            continue
        parsed, error = parse_optional_metric(request.data[api_name], api_name)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
        updates[model_name] = parsed

    if "dateOfBirth" in request.data:
        value = request.data["dateOfBirth"]
        if value in (None, ""):
            updates["date_of_birth"] = None
        elif isinstance(value, str):
            try:
                parsed_date = date.fromisoformat(value)
            except ValueError:
                return Response(
                    {"message": "dateOfBirth must use YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if parsed_date.isoformat() != value or parsed_date > date.today():
                return Response(
                    {"message": "dateOfBirth must be a valid date that is not in the future."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            updates["date_of_birth"] = parsed_date
        else:
            return Response(
                {"message": "dateOfBirth must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if updates:
        for field, value in updates.items():
            setattr(patient, field, value)
        patient.save(update_fields=list(updates))
    return Response({"profile": serialize_patient_profile(patient)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_patient_email(request):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)

    current_password = request.data.get("currentPassword")
    new_email = request.data.get("newEmail")
    if not isinstance(current_password, str) or not isinstance(new_email, str):
        return Response(
            {"message": "Current password and new email are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    new_email = new_email.strip().lower()
    if len(new_email) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", new_email):
        return Response({"message": "A valid email address is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not bcrypt.checkpw(current_password.encode(), request.user.password_hash.encode()):
        return Response({"message": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.is_temporary_password:
        return Response(
            {"message": "Change your temporary password before changing your login email."},
            status=status.HTTP_409_CONFLICT,
        )

    try:
        with transaction.atomic():
            account = UserAccount.objects.select_for_update().get(id=request.user.id)
            account.email = new_email
            account.save(update_fields=["email"])
    except IntegrityError:
        return Response(
            {"message": "An account already exists for that email."},
            status=status.HTTP_409_CONFLICT,
        )
    return Response({"email": account.email})
