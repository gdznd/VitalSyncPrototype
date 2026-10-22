import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from api.models import UserAccount


class VitalSyncJWTAuthentication(BaseAuthentication):
    PASSWORD_SETUP_PATHS = {
        "/api/auth/me",
        "/api/auth/change-password",
        "/api/auth/change-password/code",
        "/api/auth/change-password/verify",
    }

    def authenticate(self, request):
        authorization = request.headers.get("Authorization", "")
        if not authorization:
            return None

        scheme, separator, token = authorization.partition(" ")
        if not separator or scheme.lower() != "bearer" or not token:
            raise AuthenticationFailed("Invalid authorization header")

        try:
            claims = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            account = UserAccount.objects.get(
                id=claims["id"],
                role=claims["role"],
            )
        except (jwt.InvalidTokenError, KeyError, UserAccount.DoesNotExist) as exc:
            raise AuthenticationFailed("Invalid or expired token") from exc

        if account.role in ("patient", "doctor") and account.is_temporary_password:
            allowed_paths = (
                self.PASSWORD_SETUP_PATHS
                if account.role == "patient"
                else {"/api/auth/me", "/api/auth/change-password"}
            )
            if request.path_info not in allowed_paths:
                role_label = "patient" if account.role == "patient" else "doctor"
                raise PermissionDenied(
                    f"Change the temporary password before using {role_label} resources."
                )

        return account, claims

    def authenticate_header(self, request):
        return "Bearer"