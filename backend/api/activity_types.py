from django.db import IntegrityError, transaction
from django.db.models.functions import Lower
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import PatientActivityType, PatientProfile

BUILT_IN_ACTIVITY_TYPES = ("Walking", "Running", "Cycling", "Swimming", "Hiking")


def activity_names(patient):
    custom = PatientActivityType.objects.filter(patient_id=patient.id).order_by("id")
    return [*BUILT_IN_ACTIVITY_TYPES, *(activity.name for activity in custom)]


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def patient_activity_types(request):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)

    patient = PatientProfile.objects.filter(user_id=request.user.id).first()
    if not patient:
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"activities": activity_names(patient)})

    data = request.data
    if not isinstance(data, dict) or set(data) != {"name"}:
        return Response({"message": "Only an activity name can be provided."}, status=status.HTTP_400_BAD_REQUEST)
    name = data.get("name") if isinstance(data, dict) else None
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
        return Response(
            {"message": "Activity name must contain 1 to 100 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    name = name.strip()
    if name.lower() in {activity.lower() for activity in BUILT_IN_ACTIVITY_TYPES}:
        return Response({"activities": activity_names(patient)}, status=status.HTTP_200_OK)

    existing = PatientActivityType.objects.annotate(
        normalized_name=Lower("name"),
    ).filter(
        patient_id=patient.id,
        normalized_name=name.lower(),
    ).first()
    if existing:
        return Response({"activities": activity_names(patient)}, status=status.HTTP_200_OK)

    try:
        with transaction.atomic():
            PatientActivityType.objects.create(patient=patient, name=name)
    except IntegrityError:
        existing = PatientActivityType.objects.annotate(
            normalized_name=Lower("name"),
        ).filter(
            patient_id=patient.id,
            normalized_name=name.lower(),
        ).first()
        if not existing:
            raise
        return Response({"activities": activity_names(patient)}, status=status.HTTP_200_OK)

    return Response({"activities": activity_names(patient)}, status=status.HTTP_201_CREATED)
