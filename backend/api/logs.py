import re
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import DoctorProfile, LifestyleLog, PatientProfile
from api.patients import authorized_patient_ids

LOG_TYPES = {"food", "medication", "activity", "sleep", "stress", "social", "habit"}


def serialize_log(log):
    return {
        "id": log.id,
        "patient_id": log.patient_id,
        "patientUniqueId": log.patient.unique_id if log.patient else None,
        "type": log.type,
        "date": log.date.isoformat(),
        "time": log.time,
        "title": log.title or "",
        "detail": log.detail or "",
        "extra": log.extra or "",
        "payload": log.payload or {},
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def lifestyle_logs(request):
    if request.method == "POST":
        if request.user.role != "patient":
            return Response(
                {"message": "Patient account required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient = PatientProfile.objects.filter(user_id=request.user.id).first()
        if not patient:
            return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

        log_type = request.data.get("type")
        log_date = request.data.get("date")
        log_time = request.data.get("time")
        title = request.data.get("title", "")
        detail = request.data.get("detail", "")
        extra = request.data.get("extra", "")
        payload = request.data.get("payload", {})

        if log_type not in LOG_TYPES:
            return Response({"message": "Unsupported lifestyle log type."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(log_date, str) or not isinstance(log_time, str):
            return Response({"message": "A valid date and time are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            parsed_date = date.fromisoformat(log_date)
        except ValueError:
            return Response({"message": "Date must use YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", log_time):
            return Response({"message": "Time must use HH:mm format."}, status=status.HTTP_400_BAD_REQUEST)
        if any(not isinstance(value, str) for value in (title, detail, extra)) or not isinstance(payload, dict):
            return Response({"message": "Invalid lifestyle log fields."}, status=status.HTTP_400_BAD_REQUEST)
        if len(title) > 255:
            return Response({"message": "Log title must be 255 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)

        log = LifestyleLog.objects.create(
            patient=patient,
            type=log_type,
            date=parsed_date,
            time=log_time,
            title=title,
            detail=detail,
            extra=extra,
            payload=payload,
        )
        return Response({"log": serialize_log(log)}, status=status.HTTP_201_CREATED)

    if request.user.role == "patient":
        patient = PatientProfile.objects.filter(user_id=request.user.id).first()
        if not patient:
            return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)
        logs = LifestyleLog.objects.filter(patient_id=patient.id)
    elif request.user.role == "doctor":
        patient_id = request.query_params.get("patient_id")
        if not patient_id or not patient_id.isdecimal():
            return Response({"message": "A valid patient_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        doctor = DoctorProfile.objects.filter(user_id=request.user.id).first()
        if not doctor:
            return Response({"message": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        authorized_ids = authorized_patient_ids(doctor.id)
        patient = PatientProfile.objects.filter(id=int(patient_id), id__in=authorized_ids).first()
        if not patient:
            return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        logs = LifestyleLog.objects.filter(patient_id=patient.id)
    else:
        return Response({"message": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    parsed_dates = {}
    for parameter in ("start_date", "end_date"):
        value = request.query_params.get(parameter)
        if value is None:
            continue
        try:
            parsed_value = date.fromisoformat(value)
        except ValueError:
            return Response(
                {"message": f"{parameter} must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if parsed_value.isoformat() != value:
            return Response(
                {"message": f"{parameter} must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parsed_dates[parameter] = parsed_value

    start_date = parsed_dates.get("start_date")
    end_date = parsed_dates.get("end_date")
    if start_date and end_date and start_date > end_date:
        return Response(
            {"message": "start_date must be on or before end_date."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    log_type = request.query_params.get("type")
    if log_type and log_type not in LOG_TYPES:
        return Response({"message": "Unsupported lifestyle log type."}, status=status.HTTP_400_BAD_REQUEST)
    if start_date:
        logs = logs.filter(date__gte=start_date)
    if end_date:
        logs = logs.filter(date__lte=end_date)
    if log_type:
        logs = logs.filter(type=log_type)

    logs = logs.select_related("patient").order_by("-date", "-time", "-id")
    return Response({"logs": [serialize_log(log) for log in logs]})