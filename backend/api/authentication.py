import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from api.models import UserAccount


class VitalSyncJWTAuthentication(BaseAuthentication):
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

        return account, claims

    def authenticate_header(self, request):
        return "Bearer"