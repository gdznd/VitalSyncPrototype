from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    DoctorPatientReminder,
    DoctorNote,
    DoctorProfile,
    MonitoringHistoryEpisode,
    PatientProfile,
    TeamMessage,
)
from api.patients import authorized_patient_ids


def get_doctor(request):
    if request.user.role != "doctor":
        return None, Response(
            {"message": "Doctor account required."},
            status=status.HTTP_403_FORBIDDEN,
        )
    doctor = DoctorProfile.objects.filter(user_id=request.user.id).first()
    if not doctor:
        return None, Response(
            {"message": "Doctor profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return doctor, None


def serialize_team_message(message, current_doctor_id):
    return {
        "id": message.id,
        "side": "doctor" if message.sender_doctor_id == current_doctor_id else "team",
        "text": message.text,
        "important": bool(message.is_important),
        "time": message.created_at.isoformat() if message.created_at else "",
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def doctor_notes(request):
    doctor, error_response = get_doctor(request)
    if error_response:
        return error_response

    if request.method == "GET":
        notes = DoctorNote.objects.filter(doctor_id=doctor.id).order_by("-created_at", "-id")
        return Response({
            "notes": [
                {
                    "id": note.id,
                    "text": note.text,
                    "createdAt": note.created_at.isoformat() if note.created_at else None,
                }
                for note in notes
            ]
        })

    text = request.data.get("text")
    if not isinstance(text, str) or not text.strip():
        return Response({"message": "Note text is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(text.strip()) > 5000:
        return Response({"message": "Note text must be 5000 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)

    note = DoctorNote.objects.create(doctor=doctor, text=text.strip())
    return Response(
        {
            "note": {
                "id": note.id,
                "text": note.text,
                "createdAt": note.created_at.isoformat() if note.created_at else None,
            }
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def doctor_note_detail(request, note_id):
    doctor, error_response = get_doctor(request)
    if error_response:
        return error_response

    note = DoctorNote.objects.filter(id=note_id, doctor_id=doctor.id).first()
    if not note:
        return Response({"message": "Note not found."}, status=status.HTTP_404_NOT_FOUND)
    note.delete()
    return Response({"message": "Note deleted."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def doctor_reminders(request):
    doctor, error_response = get_doctor(request)
    if error_response:
        return error_response

    patient_ids = DoctorPatientReminder.objects.filter(
        doctor_id=doctor.id,
        enabled=True,
        patient_id__in=authorized_patient_ids(doctor.id),
    ).values_list("patient_id", flat=True)
    return Response({"patientIds": list(patient_ids)})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def patient_reminder(request, patient_id):
    doctor, error_response = get_doctor(request)
    if error_response:
        return error_response

    enabled = request.data.get("enabled")
    if not isinstance(enabled, bool):
        return Response({"message": "The enabled field must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)

    patient = PatientProfile.objects.filter(
        id=patient_id,
        id__in=authorized_patient_ids(doctor.id),
    ).first()
    if not patient:
        return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    reminder, _ = DoctorPatientReminder.objects.update_or_create(
        doctor=doctor,
        patient=patient,
        defaults={"enabled": enabled, "updated_at": timezone.now()},
    )
    return Response({"patientId": patient.id, "enabled": reminder.enabled})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monitoring_history(request, patient_id):
    doctor, error_response = get_doctor(request)
    if error_response:
        return error_response

    patient = PatientProfile.objects.filter(
        id=patient_id,
        id__in=authorized_patient_ids(doctor.id),
    ).first()
    if not patient:
        return Response({"message": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    episodes = (
        MonitoringHistoryEpisode.objects.filter(patient_id=patient.id)
        .select_related("managing_doctor")
        .order_by("-started_at", "-id")
    )
    return Response({
        "episodes": [
            {
                "id": episode.id,
                "careFocus": episode.care_focus,
                "startedAt": episode.started_at.isoformat() if episode.started_at else None,
                "endedAt": episode.ended_at.isoformat() if episode.ended_at else None,
                "status": "Current" if episode.ended_at is None else "Completed",
                "managingDoctor": episode.managing_doctor.name if episode.managing_doctor else None,
            }
            for episode in episodes
        ]
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_messages(request, doctor_id):
    current_doctor, error_response = get_doctor(request)
    if error_response:
        return error_response
    if doctor_id == current_doctor.id:
        return Response({"message": "Choose another doctor."}, status=status.HTTP_400_BAD_REQUEST)

    recipient = DoctorProfile.objects.filter(id=doctor_id).first()
    if not recipient:
        return Response({"message": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        messages = (
            TeamMessage.objects.filter(
                Q(sender_doctor_id=current_doctor.id, recipient_doctor_id=recipient.id)
                | Q(sender_doctor_id=recipient.id, recipient_doctor_id=current_doctor.id)
            )
            .order_by("created_at", "id")
        )
        return Response({
            "messages": [serialize_team_message(message, current_doctor.id) for message in messages]
        })

    text = request.data.get("text")
    important = request.data.get("important", False)
    if not isinstance(text, str) or not text.strip():
        return Response({"message": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(text.strip()) > 5000 or not isinstance(important, bool):
        return Response({"message": "Invalid team message fields."}, status=status.HTTP_400_BAD_REQUEST)

    message = TeamMessage.objects.create(
        sender_doctor=current_doctor,
        recipient_doctor=recipient,
        text=text.strip(),
        is_important=important,
    )
    return Response(
        {"message": serialize_team_message(message, current_doctor.id)},
        status=status.HTTP_201_CREATED,
    )


def start_monitoring_episode(patient, managing_doctor, started_at=None):
    return MonitoringHistoryEpisode.objects.create(
        patient=patient,
        managing_doctor=managing_doctor,
        care_focus=patient.care_focus or "General lifestyle care",
        started_at=started_at or timezone.localdate(),
    )


def end_monitoring_episode(patient, ended_at=None):
    episode = MonitoringHistoryEpisode.objects.filter(
        patient_id=patient.id,
        ended_at__isnull=True,
    ).order_by("-id").first()
    if episode:
        episode.ended_at = ended_at or timezone.localdate()
        episode.save(update_fields=["ended_at"])
    return episode


def change_monitoring_care_focus(patient, managing_doctor, care_focus):
    end_monitoring_episode(patient)
    patient.care_focus = care_focus
    patient.save(update_fields=["care_focus"])
    return start_monitoring_episode(patient, managing_doctor)
