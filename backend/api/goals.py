from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import DoctorProfile, PatientProfile, ProviderGoal
from api.patients import authorized_patient_ids

FREQUENCIES = {"Daily", "Weekdays", "Weekly"}
GOAL_STATUSES = {"Active", "Paused", "Completed", "Cancelled"}
EVALUATION_TYPES = {"duration", "indicator", "occurrence", "reflection", "none"}


def serialize_provider_goal(goal):
    return {
        "id": goal.id,
        "patientUniqueId": goal.patient.unique_id,
        "title": goal.title,
        "category": goal.category or "Other",
        "target": goal.target or "",
        "frequency": goal.frequency or "Daily",
        "startDate": goal.start_date.isoformat() if goal.start_date else "",
        "reviewDate": goal.review_date.isoformat() if goal.review_date else "",
        "instructions": goal.instructions or "",
        "status": goal.status or "Active",
        "progressPercent": 0,
        "assignedBy": goal.assigned_by_doctor.name if goal.assigned_by_doctor else "Care team",
        "evaluationType": goal.evaluation_type or "none",
        "targetValue": float(goal.target_value) if goal.target_value is not None else None,
        "targetUnit": goal.target_unit or "",
        "metricKey": goal.metric_key or "",
    }


def get_doctor_patient(request, patient_id):
    doctor = DoctorProfile.objects.filter(user_id=request.user.id).first()
    if not doctor:
        return None, None
    patient = PatientProfile.objects.filter(
        id=patient_id,
        id__in=authorized_patient_ids(doctor.id),
    ).first()
    return doctor, patient


def validate_goal(data):
    title = data.get("title")
    frequency = data.get("frequency", "Daily")
    goal_status = data.get("status", "Active")
    evaluation_type = data.get("evaluationType", "none")
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 255:
        return None, "Goal title is required and must be 255 characters or fewer."
    if frequency not in FREQUENCIES or goal_status not in GOAL_STATUSES:
        return None, "Invalid goal frequency or status."
    if evaluation_type not in EVALUATION_TYPES:
        return None, "Invalid evaluation type."

    parsed = {"title": title.strip(), "frequency": frequency, "status": goal_status, "evaluation_type": evaluation_type}
    for api_name, model_name in (
        ("category", "category"),
        ("target", "target"),
        ("instructions", "instructions"),
        ("targetUnit", "target_unit"),
        ("metricKey", "metric_key"),
    ):
        value = data.get(api_name, "")
        if not isinstance(value, str):
            return None, f"{api_name} must be a string."
        parsed[model_name] = value.strip() or None

    for api_name, model_name in (("startDate", "start_date"), ("reviewDate", "review_date")):
        value = data.get(api_name) or None
        if value is None:
            parsed[model_name] = None
            continue
        try:
            parsed[model_name] = date.fromisoformat(value)
        except (TypeError, ValueError):
            return None, f"{api_name} must use YYYY-MM-DD format."

    target_value = data.get("targetValue")
    if target_value in (None, ""):
        parsed["target_value"] = None
    else:
        try:
            parsed["target_value"] = Decimal(str(target_value))
        except (InvalidOperation, ValueError):
            return None, "targetValue must be numeric."
    return parsed, None


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def doctor_provider_goals(request, patient_id):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)
    doctor, patient = get_doctor_patient(request, patient_id)
    if not doctor:
        return Response({"message": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
    if not patient:
        return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        goals = ProviderGoal.objects.filter(patient_id=patient.id).select_related("patient", "assigned_by_doctor").order_by("id")
        return Response({"goals": [serialize_provider_goal(goal) for goal in goals]})

    submitted = request.data.get("goals")
    if not isinstance(submitted, list):
        return Response({"message": "Goals must be provided as a list."}, status=status.HTTP_400_BAD_REQUEST)

    parsed_goals = []
    for goal_data in submitted:
        if not isinstance(goal_data, dict):
            return Response({"message": "Each goal must be an object."}, status=status.HTTP_400_BAD_REQUEST)
        parsed, error = validate_goal(goal_data)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
        parsed_goals.append((goal_data.get("id"), parsed))

    with transaction.atomic():
        existing_goals = {
            goal.id: goal
            for goal in ProviderGoal.objects.filter(patient_id=patient.id)
        }
        for goal_id, values in parsed_goals:
            goal = existing_goals.get(goal_id)
            if goal is None:
                ProviderGoal.objects.create(
                    patient=patient,
                    assigned_by_doctor=doctor,
                    **values,
                )
                continue
            for field, value in values.items():
                setattr(goal, field, value)
            goal.save()

    goals = ProviderGoal.objects.filter(patient_id=patient.id).select_related("patient", "assigned_by_doctor").order_by("id")
    return Response({"goals": [serialize_provider_goal(goal) for goal in goals]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def patient_provider_goals(request):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)
    patient = PatientProfile.objects.filter(user_id=request.user.id).first()
    if not patient:
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)
    goals = ProviderGoal.objects.filter(patient_id=patient.id).select_related("patient", "assigned_by_doctor").order_by("id")
    return Response({"goals": [serialize_provider_goal(goal) for goal in goals]})