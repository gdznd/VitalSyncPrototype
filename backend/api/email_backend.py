import html
import json
import logging
import re
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_TIMEOUT_SECONDS = 15


class EmailDeliveryError(Exception):
    pass


def email_is_configured():
    if settings.EMAIL_BACKEND == "api.email_backend.BrevoEmailBackend":
        values = (settings.BREVO_API_KEY, settings.DEFAULT_FROM_EMAIL)
    else:
        values = (
            settings.EMAIL_HOST,
            settings.EMAIL_HOST_USER,
            settings.EMAIL_HOST_PASSWORD,
            settings.DEFAULT_FROM_EMAIL,
        )
    return all(
        value and not re.match(r"^(your_|placeholder|example)", value, re.IGNORECASE)
        for value in values
    )


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not email_is_configured():
            if self.fail_silently:
                return 0
            raise EmailDeliveryError("Brevo email delivery is not configured.")

        sent_count = 0
        for message in email_messages:
            try:
                self._send_message(message)
            except EmailDeliveryError:
                if self.fail_silently:
                    logger.exception("Brevo email delivery failed")
                    continue
                raise
            sent_count += 1

        return sent_count

    def _send_message(self, message):
        if message.attachments:
            raise EmailDeliveryError("Brevo backend does not support email attachments.")

        sender_name, sender_email = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)
        if not sender_email:
            raise EmailDeliveryError("A valid email sender address is required.")

        payload = {
            "sender": {"email": sender_email},
            "to": [],
            "subject": message.subject,
        }
        if message.content_subtype == "html":
            payload["htmlContent"] = message.body
        else:
            payload["textContent"] = message.body
            payload["htmlContent"] = html.escape(message.body).replace("\n", "<br>\n")
        if sender_name:
            payload["sender"]["name"] = sender_name

        for recipient in message.to:
            name, address = parseaddr(recipient)
            if address:
                item = {"email": address}
                if name:
                    item["name"] = name
                payload["to"].append(item)

        if message.cc:
            payload["cc"] = [{"email": parseaddr(item)[1]} for item in message.cc]
        if message.bcc:
            payload["bcc"] = [{"email": parseaddr(item)[1]} for item in message.bcc]
        if message.reply_to:
            name, address = parseaddr(message.reply_to[0])
            payload["replyTo"] = {"email": address}
            if name:
                payload["replyTo"]["name"] = name
        request = Request(
            BREVO_SEND_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": settings.BREVO_API_KEY,
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=BREVO_TIMEOUT_SECONDS) as response:
                if response.status not in (201, 202):
                    raise EmailDeliveryError(
                        f"Brevo email API returned unexpected HTTP status {response.status}."
                    )
        except HTTPError as exc:
            raise EmailDeliveryError(
                f"Brevo email API rejected the request with HTTP status {exc.code}."
            ) from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise EmailDeliveryError("Could not reach the Brevo email API.") from exc
