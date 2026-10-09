from datetime import date

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import PatientProfile, PersonalGoal

FREQUENCIES = {"Daily", "Weekdays", "Weekly"}
GOAL_STATUSES = {"Active", "Paused", "Completed", "Cancelled"}


def serialize_personal_goal(goal):
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
        "progressPercent": goal.progress_percent or 0,
    }


def get_patient_account(request):
    if request.user.role != "patient":
        return None
    return PatientProfile.objects.filter(user_id=request.user.id).first()


def validate_personal_goal(data, partial=False):
    parsed = {}

    if not partial or "title" in data:
        title = data.get("title")
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 255:
            return None, "Goal title is required and must be 255 characters or fewer."
        parsed["title"] = title.strip()

    for api_name, model_name in (("category", "category"), ("target", "target"), ("instructions", "instructions")):
        if partial and api_name not in data:
            continue
        value = data.get(api_name, "")
        if not isinstance(value, str):
            return None, f"{api_name} must be a string."
        parsed[model_name] = value.strip() or None

    if not partial or "frequency" in data:
        frequency = data.get("frequency", "Daily")
        if frequency not in FREQUENCIES:
            return None, "Invalid goal frequency."
        parsed["frequency"] = frequency

    if not partial or "status" in data:
        goal_status = data.get("status", "Active")
        if goal_status not in GOAL_STATUSES:
            return None, "Invalid goal status."
        parsed["status"] = goal_status

    if not partial or "progressPercent" in data:
        progress = data.get("progressPercent", 0)
        if isinstance(progress, bool) or not isinstance(progress, int) or not 0 <= progress <= 100:
            return None, "Progress must be an integer between 0 and 100."
        parsed["progress_percent"] = progress

    for api_name, model_name in (("startDate", "start_date"), ("reviewDate", "review_date")):
        if partial and api_name not in data:
            continue
        value = data.get(api_name)
        if not isinstance(value, str) or not value:
            return None, f"{api_name} is required."
        try:
            parsed[model_name] = date.fromisoformat(value)
        except ValueError:
            return None, f"{api_name} must use YYYY-MM-DD format."

    return parsed, None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def personal_goals(request):
    patient = get_patient_account(request)
    if not patient:
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        goals = PersonalGoal.objects.filter(patient_id=patient.id).select_related("patient").order_by("id")
        return Response({"goals": [serialize_personal_goal(goal) for goal in goals]})

    parsed, error = validate_personal_goal(request.data)
    if error:
        return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
    goal = PersonalGoal.objects.create(patient=patient, **parsed)
    return Response({"goal": serialize_personal_goal(goal)}, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def personal_goal_detail(request, goal_id):
    patient = get_patient_account(request)
    if not patient:
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)

    goal = PersonalGoal.objects.filter(id=goal_id, patient_id=patient.id).select_related("patient").first()
    if not goal:
        return Response({"message": "Personal goal not found."}, status=status.HTTP_404_NOT_FOUND)

    parsed, error = validate_personal_goal(request.data, partial=request.method == "PATCH")
    if error:
        return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        for field, value in parsed.items():
            setattr(goal, field, value)
        goal.save(update_fields=list(parsed.keys()))
    return Response({"goal": serialize_personal_goal(goal)})