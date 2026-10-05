import logging
import re
import secrets
import smtplib
from datetime import timedelta

import bcrypt
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from django.core.mail import EmailMessage
from django.db import DatabaseError, IntegrityError, connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.http import require_GET

from api.models import DoctorProfile, PasswordChangeVerification, PatientProfile, UserAccount

logger = logging.getLogger(__name__)


@require_GET
def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT NOW()")
            database_time = cursor.fetchone()[0]
    except DatabaseError:
        return JsonResponse(
            {"status": "error", "message": "Database connection failed"},
            status=503,
        )

    return JsonResponse(
        {
            "status": "ok",
            "message": "VitalSync Django API Running",
            "dbTime": database_time.isoformat(),
        }
    )


def serialize_auth_user(account):
    profile = None
    if account.role == "doctor":
        profile = DoctorProfile.objects.filter(user_id=account.id).first()
    elif account.role == "patient":
        profile = PatientProfile.objects.filter(user_id=account.id).first()

    return {
        "id": account.id,
        "email": account.email,
        "role": account.role,
        "is_temporary_password": bool(account.is_temporary_password),
        "created_at": account.created_at,
        "name": profile.name if profile else None,
        "patient_unique_id": profile.unique_id if account.role == "patient" and profile else None,
        "specialty": profile.specialty if account.role == "doctor" and profile else None,
        "initials": profile.initials if account.role == "doctor" and profile else None,
        "display_color": profile.display_color if account.role == "doctor" and profile else None,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return Response({"message": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    account = UserAccount.objects.filter(email=email.strip().lower()).first()
    if not account or not bcrypt.checkpw(password.encode(), account.password_hash.encode()):
        return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    from datetime import datetime, timedelta, timezone
    import jwt
    from django.conf import settings

    issued_at = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "id": account.id,
            "email": account.email,
            "role": account.role,
            "iat": issued_at,
            "exp": issued_at + timedelta(hours=24),
        },
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    return Response({"token": token, "user": serialize_auth_user(account)})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_doctor(request):
    email = request.data.get("email")
    password = request.data.get("password")
    name = request.data.get("name")
    specialty = request.data.get("specialty")
    if not isinstance(email, str) or not isinstance(password, str) or not isinstance(name, str):
        return Response({"message": "Name, email, and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    email = email.strip().lower()
    name = name.strip()
    if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return Response({"message": "A valid email and name are required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({"message": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

    initials = "".join(part[0] for part in name.split() if part)[:2].upper() or "DR"
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

    try:
        with transaction.atomic():
            account = UserAccount.objects.create(
                email=email,
                password_hash=password_hash,
                role="doctor",
                is_temporary_password=False,
            )
            DoctorProfile.objects.create(
                user=account,
                name=name,
                specialty=specialty.strip() if isinstance(specialty, str) and specialty.strip() else "Lifestyle Medicine",
                initials=initials,
                display_color="#d9ecf1",
            )
    except IntegrityError:
        return Response({"message": "An account already exists for that email."}, status=status.HTTP_409_CONFLICT)

    from datetime import datetime, timedelta, timezone
    import jwt
    from django.conf import settings

    issued_at = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "id": account.id,
            "email": account.email,
            "role": account.role,
            "iat": issued_at,
            "exp": issued_at + timedelta(hours=24),
        },
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    return Response({"token": token, "user": serialize_auth_user(account)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response({"user": serialize_auth_user(request.user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_password_change_code(request):
    account = request.user
    if account.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)
    if not all((settings.EMAIL_HOST, settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)):
        return Response(
            {"message": "Email verification is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    now = timezone.now()
    verification = PasswordChangeVerification.objects.filter(user_id=account.id).first()
    if verification and verification.requested_at > now - timedelta(seconds=60):
        return Response(
            {"message": "Please wait before requesting another verification code."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    try:
        with transaction.atomic():
            PasswordChangeVerification.objects.update_or_create(
                user_id=account.id,
                defaults={
                    "code_hash": make_password(code),
                    "requested_at": now,
                    "expires_at": now + timedelta(minutes=10),
                    "attempts": 0,
                    "verified_at": None,
                },
            )
            EmailMessage(
                subject="Your VitalSync password-change verification code",
                body=(
                    f"Your one-time verification code is {code}.\n\n"
                    "This code expires in 10 minutes. If you did not request this "
                    "change, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[account.email],
            ).send(fail_silently=False)
    except (OSError, smtplib.SMTPException):
        logger.exception("Password-change verification email could not be sent")
        return Response(
            {"message": "Could not send the verification code. Please try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"message": "A verification code was sent to your registered email."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_password_change_code(request):
    account = request.user
    if account.role != "patient":
        return Response({"message": "Patient account required."}, status=status.HTTP_403_FORBIDDEN)

    code = request.data.get("code")
    if not isinstance(code, str) or not re.fullmatch(r"\d{6}", code):
        return Response(
            {"message": "Enter the six-digit verification code."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()
    with transaction.atomic():
        verification = (
            PasswordChangeVerification.objects.select_for_update()
            .filter(user_id=account.id)
            .first()
        )
        if not verification or verification.expires_at <= now:
            return Response(
                {"message": "The verification code is missing or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if verification.attempts >= 5:
            return Response(
                {"message": "Too many incorrect attempts. Request a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if not check_password(code, verification.code_hash):
            verification.attempts += 1
            verification.save(update_fields=["attempts"])
            return Response(
                {"message": "The verification code is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        verification.verified_at = now
        verification.save(update_fields=["verified_at"])

    return Response({"message": "Verification code accepted."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    account = request.user
    if account.role not in {"doctor", "patient"}:
        return Response({"message": "Supported account required."}, status=status.HTTP_403_FORBIDDEN)

    new_password = request.data.get("newPassword")
    if not isinstance(new_password, str):
        return Response(
            {"message": "A new password is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(new_password) < 8:
        return Response(
            {"message": "New password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if account.role == "doctor":
        current_password = request.data.get("currentPassword")
        if not isinstance(current_password, str):
            return Response(
                {"message": "Current password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not bcrypt.checkpw(current_password.encode(), account.password_hash.encode()):
            return Response(
                {"message": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        UserAccount.objects.filter(id=account.id, role="doctor").update(
            password_hash=bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12)).decode(),
            is_temporary_password=False,
        )
        return Response({"message": "Password updated successfully."})

    now = timezone.now()
    with transaction.atomic():
        verification = (
            PasswordChangeVerification.objects.select_for_update()
            .filter(user_id=account.id)
            .first()
        )
        if (
            not verification
            or verification.verified_at is None
            or verification.expires_at <= now
        ):
            return Response(
                {"message": "Verify the email code before setting a new password."},
                status=status.HTTP_403_FORBIDDEN,
            )
        UserAccount.objects.filter(id=account.id, role="patient").update(
            password_hash=bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12)).decode(),
            is_temporary_password=False,
        )
        verification.delete()

    return Response({"message": "Password updated successfully."})