from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import LifestyleLog, PatientProfile
from api.patients import authorized_patient_ids, get_doctor_profile
from api.stress_nlp import classify_reflection, model_metadata


# PROPOSED endpoint, pending agreement with the frontend owner and JC.
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stress_classification(request, patient_id):
    if request.user.role != "doctor":
        return Response(
            {"message": "Access denied. Doctor role required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    doctor_profile = get_doctor_profile(request.user)
    if not doctor_profile:
        return Response({"message": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)

    patient = PatientProfile.objects.filter(
        id=patient_id, id__in=authorized_patient_ids(doctor_profile.id)
    ).first()
    if not patient:
        return Response({"message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

    log_id = request.data.get("log_id")
    if isinstance(log_id, bool) or not isinstance(log_id, int):
        return Response({"message": "A valid log_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    log = LifestyleLog.objects.filter(id=log_id, patient_id=patient.id, type="stress").first()
    if not log:
        return Response({"message": "Stress reflection not found."}, status=status.HTTP_404_NOT_FOUND)

    label, result_status = classify_reflection(log.detail or "")
    metadata = model_metadata() or {}
    return Response(
        {
            "log_id": log.id,
            "patient_id": patient.id,
            "label": label,
            "status": result_status,
            "model_version": metadata.get("model_version"),
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE if result_status == "model_unavailable" else status.HTTP_200_OK,
    )
