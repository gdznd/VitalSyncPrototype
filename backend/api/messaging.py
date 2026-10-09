from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import DoctorProfile, MonitoringRelationship, PatientMessage, PatientProfile
from api.patients import authorized_patient_ids

MAX_MESSAGE_LENGTH = 5000


def serialize_message(message):
    return {
        "id": message.id,
        "sender": message.sender_role,
        "text": message.text,
        "time": message.created_at.isoformat() if message.created_at else "",
        "important": bool(message.is_important),
    }


def message_body(request):
    text = request.data.get("text")
    important = request.data.get("important", False)
    if not isinstance(text, str) or not text.strip():
        return None, "Message text is required."
    if len(text.strip()) > MAX_MESSAGE_LENGTH:
        return None, f"Message text must be {MAX_MESSAGE_LENGTH} characters or fewer."
    if not isinstance(important, bool):
        return None, "important must be a boolean."
    return {"text": text.strip(), "important": important}, None


def patient_provider_ids(patient):
    relationship = MonitoringRelationship.objects.filter(patient_id=patient.id).first()
    if not relationship:
        return DoctorProfile.objects.none()
    if not patient.monitoring_active:
        if relationship.managing_doctor_id is None:
            return DoctorProfile.objects.none()
        return DoctorProfile.objects.filter(id=relationship.managing_doctor_id)
    if relationship.visibility == "All Doctors":
        return DoctorProfile.objects.all()
    allowed_ids = [relationship.managing_doctor_id]
    if relationship.visibility == "Selected Doctors":
        allowed_ids.extend(relationship.selected_doctor_ids or [])
    return DoctorProfile.objects.filter(id__in=set(allowed_ids))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def patient_provider_directory(request):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)
    patient = PatientProfile.objects.filter(user_id=request.user.id).first()
    if not patient:
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

    doctors = patient_provider_ids(patient).order_by("name")
    return Response({
        "providers": [
            {
                "id": doctor.id,
                "name": doctor.name,
                "initials": doctor.initials or "",
                "color": doctor.display_color or "#d9ecf1",
                "role": doctor.specialty or "Care team",
                "specialty": doctor.specialty or "",
                "clinic": doctor.clinic or "",
                "about": doctor.about or "",
                "license": doctor.license or "",
            }
            for doctor in doctors
        ]
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def patient_conversation(request, doctor_id):
    if request.user.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)
    patient = PatientProfile.objects.filter(user_id=request.user.id).first()
    if not patient:
        return Response({"message": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)
    doctor = patient_provider_ids(patient).filter(id=doctor_id).first()
    if not doctor:
        return Response({"message": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "POST":
        data, error = message_body(request)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
        message = PatientMessage.objects.create(
            patient=patient,
            doctor=doctor,
            sender_role="patient",
            text=data["text"],
            is_important=data["important"],
        )
        return Response({"message": serialize_message(message)}, status=status.HTTP_201_CREATED)

    messages = PatientMessage.objects.filter(patient=patient, doctor=doctor).order_by("created_at", "id")
    return Response({"messages": [serialize_message(message) for message in messages]})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def doctor_patient_conversation(request, patient_id):
    if request.user.role != "doctor":
        return Response({"message": "Doctor account required."}, status=status.HTTP_403_FORBIDDEN)
    doctor = DoctorProfile.objects.filter(user_id=request.user.id).first()
    if not doctor:
        return Response({"message": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
    patient = PatientProfile.objects.filter(
        id=patient_id,
        id__in=authorized_patient_ids(doctor.id),
    ).first()
    if not patient:
        return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
    if not patient.monitoring_active:
        established_relationship = MonitoringRelationship.objects.filter(
            patient_id=patient.id,
            managing_doctor_id=doctor.id,
        ).exists()
        if not established_relationship:
            return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "POST":
        data, error = message_body(request)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
        message = PatientMessage.objects.create(
            patient=patient,
            doctor=doctor,
            sender_role="doctor",
            text=data["text"],
            is_important=data["important"],
        )
        return Response({"message": serialize_message(message)}, status=status.HTTP_201_CREATED)

    messages = PatientMessage.objects.filter(patient=patient, doctor=doctor).order_by("created_at", "id")
    return Response({"messages": [serialize_message(message) for message in messages]})