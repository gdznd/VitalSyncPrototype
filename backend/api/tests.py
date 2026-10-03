from contextlib import nullcontext
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models import UserAccount
from api.activity_types import BUILT_IN_ACTIVITY_TYPES, patient_activity_types
from api.preferences import account_preferences, conversation_preferences
from api.profiles import calculate_age, doctor_profile, parse_optional_metric
from api.records import (
    doctor_note_detail,
    doctor_notes,
    doctor_reminders,
    monitoring_history,
    patient_reminder,
    start_monitoring_episode,
    team_messages,
)
from api.goals import doctor_provider_goals
from api.logs import lifestyle_logs
from api.patients import authorized_patient_ids, patient_list
from api.views import change_password


class PatientProfileValueTests(SimpleTestCase):
    def test_age_is_derived_from_date_of_birth(self):
        self.assertEqual(calculate_age(date(2000, 10, 4), date(2026, 10, 3)), 25)
        self.assertEqual(calculate_age(date(2000, 10, 3), date(2026, 10, 3)), 26)
        self.assertIsNone(calculate_age(None, date(2026, 10, 3)))

    def test_optional_metric_accepts_positive_values_and_empty_values(self):
        self.assertEqual(parse_optional_metric("182.5", "weightLbs"), (Decimal("182.5"), None))
        self.assertEqual(parse_optional_metric("", "weightLbs"), (None, None))
        self.assertIsNotNone(parse_optional_metric("0", "weightLbs")[1])
        self.assertIsNotNone(parse_optional_metric("1.234", "weightLbs")[1])


class DoctorProfileApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.doctor = SimpleNamespace(
            id=17,
            user=SimpleNamespace(email="doctor@example.test"),
            name="Dr. Example",
            specialty="Cardiology",
            clinic="VitalSync",
            about="",
            license="",
            phone="",
            initials="DE",
            display_color="#d9ecf1",
            save=Mock(),
        )
        queryset = Mock()
        queryset.filter.return_value.first.return_value = self.doctor
        manager_patcher = patch(
            "api.profiles.DoctorProfile.objects.select_related",
            return_value=queryset,
        )
        self.select_related = manager_patcher.start()
        self.addCleanup(manager_patcher.stop)

    def request(self, method, data=None, role="doctor"):
        request = getattr(self.factory, method)("/api/doctor/profile", data=data, format="json")
        account = UserAccount(id=9, role=role)
        force_authenticate(request, user=account)
        return doctor_profile(request)

    def test_get_returns_the_signed_in_doctors_profile(self):
        response = self.request("get")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["email"], "doctor@example.test")
        self.assertEqual(response.data["profile"]["specialty"], "Cardiology")

    def test_patch_updates_profile_fields_and_initials(self):
        response = self.request(
            "patch",
            {"name": "Jamie Dizon", "clinic": "VitalSync Clinic", "phone": "555-0100"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["name"], "Jamie Dizon")
        self.assertEqual(response.data["profile"]["initials"], "JD")
        self.assertEqual(response.data["profile"]["phone"], "555-0100")
        self.doctor.save.assert_called_once()

    def test_patch_cannot_change_authentication_email(self):
        response = self.request("patch", {"email": "new@example.test"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.doctor.user.email, "doctor@example.test")
        self.doctor.save.assert_not_called()

    def test_patient_cannot_access_doctor_profile_endpoint(self):
        response = self.request("get", role="patient")

        self.assertEqual(response.status_code, 403)
        self.select_related.assert_not_called()


class DoctorRecordApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.doctor = SimpleNamespace(id=17, name="Dr. Example", specialty="Cardiology")
        self.manager_patcher = patch("api.records.DoctorProfile.objects.filter")
        self.doctor_filter = self.manager_patcher.start()
        self.addCleanup(self.manager_patcher.stop)

    def request(self, view, method, path, data=None, role="doctor", **view_kwargs):
        request = getattr(self.factory, method)(path, data=data, format="json")
        force_authenticate(request, user=SimpleNamespace(id=9, role=role, is_authenticated=True))
        return view(request, **view_kwargs)

    def test_doctor_notes_are_listed_for_the_signed_in_doctor(self):
        created_at = datetime(2026, 10, 3, tzinfo=timezone.utc)
        note = SimpleNamespace(id=5, text="Follow up", created_at=created_at)
        self.doctor_filter.return_value.first.return_value = self.doctor
        note_query = Mock()
        note_query.order_by.return_value = [note]
        with patch("api.records.DoctorNote.objects.filter", return_value=note_query):
            response = self.request(doctor_notes, "get", "/api/doctor/notes")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["notes"][0]["text"], "Follow up")

    def test_patient_cannot_read_or_create_doctor_notes(self):
        response = self.request(doctor_notes, "get", "/api/doctor/notes", role="patient")

        self.assertEqual(response.status_code, 403)
        self.doctor_filter.assert_not_called()

    def test_doctor_can_create_a_note(self):
        note = SimpleNamespace(
            id=6,
            text="Review next week",
            created_at=datetime(2026, 10, 3, tzinfo=timezone.utc),
        )
        self.doctor_filter.return_value.first.return_value = self.doctor
        with patch("api.records.DoctorNote.objects.create", return_value=note) as create_note:
            response = self.request(
                doctor_notes,
                "post",
                "/api/doctor/notes",
                {"text": "  Review next week  "},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["note"]["text"], "Review next week")
        create_note.assert_called_once_with(doctor=self.doctor, text="Review next week")

    def test_deleting_another_doctors_note_returns_not_found(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        with patch("api.records.DoctorNote.objects.filter") as filter_notes:
            filter_notes.return_value.first.return_value = None
            response = self.request(doctor_note_detail, "delete", "/api/doctor/notes/8", note_id=8)

        self.assertEqual(response.status_code, 404)
        filter_notes.assert_called_once_with(id=8, doctor_id=self.doctor.id)

    def test_doctor_can_delete_their_own_note(self):
        note = SimpleNamespace(delete=Mock())
        self.doctor_filter.return_value.first.return_value = self.doctor
        with patch("api.records.DoctorNote.objects.filter") as filter_notes:
            filter_notes.return_value.first.return_value = note
            response = self.request(doctor_note_detail, "delete", "/api/doctor/notes/8", note_id=8)

        self.assertEqual(response.status_code, 200)
        note.delete.assert_called_once_with()

    def test_doctor_reminders_returns_enabled_patient_ids(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        reminder_query = Mock()
        reminder_query.values_list.return_value = [42]
        with (
            patch("api.records.authorized_patient_ids", return_value=[42]),
            patch("api.records.DoctorPatientReminder.objects.filter", return_value=reminder_query) as filter_reminders,
        ):
            response = self.request(doctor_reminders, "get", "/api/doctor/reminders")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["patientIds"], [42])
        filter_reminders.assert_called_once_with(
            doctor_id=self.doctor.id,
            enabled=True,
            patient_id__in=[42],
        )

    def test_doctor_can_update_a_reminder_for_an_authorized_patient(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        patient = SimpleNamespace(id=42)
        patient_query = Mock()
        patient_query.first.return_value = patient
        reminder = SimpleNamespace(enabled=True)
        with (
            patch("api.records.authorized_patient_ids", return_value=[42]),
            patch("api.records.PatientProfile.objects.filter", return_value=patient_query),
            patch("api.records.DoctorPatientReminder.objects.update_or_create", return_value=(reminder, True)) as update_reminder,
        ):
            response = self.request(
                patient_reminder,
                "put",
                "/api/patients/42/reminder",
                {"enabled": True},
                patient_id=42,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"patientId": 42, "enabled": True})
        update_reminder.assert_called_once()

    def test_doctor_cannot_update_a_reminder_for_an_unauthorized_patient(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        patient_query = Mock()
        patient_query.first.return_value = None
        with (
            patch("api.records.authorized_patient_ids", return_value=[]),
            patch("api.records.PatientProfile.objects.filter", return_value=patient_query),
            patch("api.records.DoctorPatientReminder.objects.update_or_create") as update_reminder,
        ):
            response = self.request(
                patient_reminder,
                "put",
                "/api/patients/42/reminder",
                {"enabled": True},
                patient_id=42,
            )

        self.assertEqual(response.status_code, 404)
        update_reminder.assert_not_called()

    def test_reminder_update_requires_a_boolean(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        response = self.request(
            patient_reminder,
            "put",
            "/api/patients/42/reminder",
            {"enabled": "true"},
            patient_id=42,
        )

        self.assertEqual(response.status_code, 400)
    def test_team_message_requires_another_existing_doctor(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        response = self.request(team_messages, "post", "/api/team/messages/17", {"text": "Hello"}, doctor_id=17)

        self.assertEqual(response.status_code, 400)

    def test_team_message_creation_records_sender_recipient_and_importance(self):
        recipient = SimpleNamespace(id=18)
        message = SimpleNamespace(
            id=22,
            sender_doctor_id=self.doctor.id,
            text="Please review",
            is_important=True,
            created_at=datetime(2026, 10, 3, tzinfo=timezone.utc),
        )
        self.doctor_filter.return_value.first.side_effect = [self.doctor, recipient]
        with patch("api.records.TeamMessage.objects.create", return_value=message) as create_message:
            response = self.request(
                team_messages,
                "post",
                "/api/team/messages/18",
                {"text": "Please review", "important": True},
                doctor_id=18,
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["message"]["side"], "doctor")
        self.assertEqual(response.data["message"]["text"], "Please review")
        create_message.assert_called_once_with(
            sender_doctor=self.doctor,
            recipient_doctor=recipient,
            text="Please review",
            is_important=True,
        )

    def test_team_message_read_is_limited_to_the_selected_doctor_pair(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        self.doctor_filter.return_value.first.side_effect = [self.doctor, SimpleNamespace(id=18)]
        created_at = datetime(2026, 10, 3, tzinfo=timezone.utc)
        message = SimpleNamespace(
            id=22,
            sender_doctor_id=self.doctor.id,
            text="Private team note",
            is_important=False,
            created_at=created_at,
        )
        message_query = Mock()
        message_query.order_by.return_value = [message]
        with patch("api.records.TeamMessage.objects.filter", return_value=message_query) as filter_messages:
            response = self.request(team_messages, "get", "/api/team/messages/18", doctor_id=18)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["messages"][0]["text"], "Private team note")
        filter_messages.assert_called_once()

    def test_authorized_doctor_can_read_persisted_monitoring_history(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        patient = SimpleNamespace(id=42)
        episode = SimpleNamespace(
            id=9,
            care_focus="Recovery",
            started_at=date(2026, 9, 1),
            ended_at=None,
            managing_doctor=self.doctor,
        )
        patient_query = Mock()
        patient_query.first.return_value = patient
        episode_query = Mock()
        episode_query.select_related.return_value.order_by.return_value = [episode]
        with (
            patch("api.records.authorized_patient_ids", return_value=[42]),
            patch("api.records.PatientProfile.objects.filter", return_value=patient_query),
            patch("api.records.MonitoringHistoryEpisode.objects.filter", return_value=episode_query),
        ):
            response = self.request(
                monitoring_history,
                "get",
                "/api/patients/42/monitoring-history",
                patient_id=42,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["episodes"][0]["status"], "Current")
        self.assertEqual(response.data["episodes"][0]["startedAt"], "2026-09-01")

    def test_monitoring_history_hides_patients_outside_the_doctors_access(self):
        self.doctor_filter.return_value.first.return_value = self.doctor
        with patch("api.records.authorized_patient_ids", return_value=[]):
            with patch("api.records.PatientProfile.objects.filter") as filter_patients:
                filter_patients.return_value.first.return_value = None
                response = self.request(
                    monitoring_history,
                    "get",
                    "/api/patients/42/monitoring-history",
                    patient_id=42,
                )

        self.assertEqual(response.status_code, 404)


class MonitoringHistoryPersistenceTests(SimpleTestCase):
    def test_starting_monitoring_records_the_actual_start_date(self):
        patient = SimpleNamespace(id=4, care_focus="Recovery")
        doctor = SimpleNamespace(id=7)
        episode = SimpleNamespace(id=9)
        with patch("api.records.timezone.localdate", return_value=date(2026, 10, 3)):
            with patch("api.records.MonitoringHistoryEpisode.objects.create", return_value=episode) as create_episode:
                result = start_monitoring_episode(patient, doctor)

        self.assertIs(result, episode)
        create_episode.assert_called_once_with(
            patient=patient,
            managing_doctor=doctor,
            care_focus="Recovery",
            started_at=date(2026, 10, 3),
        )


class PreferenceApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.preference = SimpleNamespace(
            theme="system",
            accent="teal",
            text_size="normal",
            language="English",
            default_patient_type="Out-patient",
            default_follow_up_days=7,
            default_visibility="Assigned Only",
            notify_dashboard=True,
            notify_messages=True,
            notify_reminders=True,
            notify_activity=True,
            notify_daily_reminder=True,
            notify_message_alerts=True,
            notify_weekly_summary=False,
            notify_goal_reminders=True,
            save=Mock(),
            refresh_from_db=Mock(),
        )

    def request(self, view, method, path, data=None, role="doctor", **view_kwargs):
        request = getattr(self.factory, method)(path, data=data, format="json")
        force_authenticate(
            request,
            user=SimpleNamespace(id=9, role=role, is_authenticated=True),
        )
        return view(request, **view_kwargs)

    def test_doctor_can_patch_persisted_preferences(self):
        doctor = SimpleNamespace(clinic="Old clinic", save=Mock())
        with (
            patch("api.preferences.get_doctor", return_value=(doctor, None)),
            patch(
                "api.preferences.AccountPreference.objects.get_or_create",
                return_value=(self.preference, False),
            ),
            patch("api.preferences.transaction.atomic", return_value=nullcontext()),
        ):
            response = self.request(
                account_preferences,
                "patch",
                "/api/preferences",
                {"theme": "dark", "clinic": "New clinic", "defaultFollowUpDays": 14},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["preferences"]["theme"], "dark")
        self.assertEqual(response.data["preferences"]["clinic"], "New clinic")
        self.assertEqual(response.data["preferences"]["defaultFollowUpDays"], 14)
        self.preference.save.assert_called_once()
        doctor.save.assert_called_once_with(update_fields=["clinic"])

    def test_account_preference_rejects_unhashable_enum_input(self):
        doctor = SimpleNamespace(clinic="VitalSync", save=Mock())
        with (
            patch("api.preferences.get_doctor", return_value=(doctor, None)),
            patch(
                "api.preferences.AccountPreference.objects.get_or_create",
                return_value=(self.preference, False),
            ),
        ):
            response = self.request(
                account_preferences,
                "patch",
                "/api/preferences",
                {"theme": ["dark"]},
            )

        self.assertEqual(response.status_code, 400)
        self.preference.save.assert_not_called()

    def test_patient_cannot_patch_doctor_only_preferences(self):
        profile_query = Mock()
        profile_query.exists.return_value = True
        with (
            patch("api.preferences.PatientProfile.objects.filter", return_value=profile_query),
            patch(
                "api.preferences.AccountPreference.objects.get_or_create",
                return_value=(self.preference, False),
            ),
        ):
            response = self.request(
                account_preferences,
                "patch",
                "/api/preferences",
                {"defaultVisibility": "All Doctors"},
                role="patient",
            )

        self.assertEqual(response.status_code, 400)
        self.preference.save.assert_not_called()

    def test_doctor_follow_up_default_must_be_an_integer(self):
        doctor = SimpleNamespace(clinic="VitalSync", save=Mock())
        with (
            patch("api.preferences.get_doctor", return_value=(doctor, None)),
            patch(
                "api.preferences.AccountPreference.objects.get_or_create",
                return_value=(self.preference, False),
            ),
        ):
            response = self.request(
                account_preferences,
                "patch",
                "/api/preferences",
                {"defaultFollowUpDays": 7.0},
            )

        self.assertEqual(response.status_code, 400)
        self.preference.save.assert_not_called()

    def test_conversation_preferences_patch_preserves_partial_updates(self):
        stored = SimpleNamespace(pinned=True, notification_preference="Muted")
        with (
            patch(
                "api.preferences.validate_conversation_access",
                return_value=((9, "patient", 42), None),
            ),
            patch(
                "api.preferences.ConversationPreference.objects.filter",
                return_value=Mock(first=Mock(return_value=None)),
            ),
            patch(
                "api.preferences.ConversationPreference.objects.update_or_create",
                return_value=(stored, False),
            ) as update_preference,
        ):
            response = self.request(
                conversation_preferences,
                "patch",
                "/api/conversation-preferences/patient/42",
                {"notificationPreference": "Important only"},
                target_type="patient",
                target_id=42,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["preferences"]["pinned"], True)
        self.assertEqual(response.data["preferences"]["notificationPreference"], "Muted")
        self.assertEqual(
            update_preference.call_args.kwargs["defaults"]["notification_preference"],
            "Important only",
        )
        self.assertNotIn("pinned", update_preference.call_args.kwargs["defaults"])

    def test_conversation_preferences_reject_unhashable_notification_value(self):
        with (
            patch(
                "api.preferences.validate_conversation_access",
                return_value=((9, "doctor", 18), None),
            ),
            patch(
                "api.preferences.ConversationPreference.objects.filter",
                return_value=Mock(first=Mock(return_value=None)),
            ),
            patch("api.preferences.ConversationPreference.objects.update_or_create") as update_preference,
        ):
            response = self.request(
                conversation_preferences,
                "patch",
                "/api/conversation-preferences/doctor/18",
                {"notificationPreference": ["Muted"]},
                target_type="doctor",
                target_id=18,
            )

        self.assertEqual(response.status_code, 400)
        update_preference.assert_not_called()


class ChangePasswordApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def request(self, role, data):
        request = self.factory.post("/api/auth/change-password", data=data, format="json")
        account = SimpleNamespace(
            id=9,
            role=role,
            password_hash="stored-hash",
            is_temporary_password=True,
            is_authenticated=True,
        )
        force_authenticate(request, user=account)
        return change_password(request)

    def test_doctor_can_change_password_with_current_password(self):
        queryset = Mock()
        with (
            patch("api.views.bcrypt.checkpw", return_value=True),
            patch("api.views.bcrypt.hashpw", return_value=b"new-hash"),
            patch("api.views.bcrypt.gensalt", return_value=b"salt"),
            patch("api.views.UserAccount.objects.filter", return_value=queryset) as filter_accounts,
        ):
            response = self.request(
                "doctor",
                {"currentPassword": "current", "newPassword": "new-password"},
            )

        self.assertEqual(response.status_code, 200)
        filter_accounts.assert_called_once_with(id=9, role="doctor")
        queryset.update.assert_called_once_with(
            password_hash="new-hash",
            is_temporary_password=False,
        )

    def test_wrong_current_password_does_not_change_password(self):
        with (
            patch("api.views.bcrypt.checkpw", return_value=False),
            patch("api.views.UserAccount.objects.filter") as filter_accounts,
        ):
            response = self.request(
                "patient",
                {"currentPassword": "incorrect", "newPassword": "new-password"},
            )

        self.assertEqual(response.status_code, 400)
        filter_accounts.assert_not_called()


class PatientActivityTypeApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.patient = SimpleNamespace(id=42)
        patient_query = Mock()
        patient_query.first.return_value = self.patient
        patcher = patch("api.activity_types.PatientProfile.objects.filter", return_value=patient_query)
        self.patient_filter = patcher.start()
        self.addCleanup(patcher.stop)

    def request(self, method, data=None, role="patient"):
        request = getattr(self.factory, method)("/api/activity-types", data=data, format="json")
        force_authenticate(
            request,
            user=SimpleNamespace(id=9, role=role, is_authenticated=True),
        )
        return patient_activity_types(request)

    def test_get_returns_backend_defaults_and_patient_owned_custom_choices(self):
        custom_query = Mock()
        custom_query.order_by.return_value = [SimpleNamespace(name="Yoga")]
        with patch("api.activity_types.PatientActivityType.objects.filter", return_value=custom_query) as filter_custom:
            response = self.request("get")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["activities"], [*BUILT_IN_ACTIVITY_TYPES, "Yoga"])
        filter_custom.assert_called_once_with(patient_id=self.patient.id)

    def test_patient_can_add_custom_activity_choice(self):
        custom_match = Mock()
        custom_match.filter.return_value.first.return_value = None
        custom_query = Mock()
        custom_query.order_by.return_value = [SimpleNamespace(name="Yoga")]
        with (
            patch("api.activity_types.PatientActivityType.objects.annotate", return_value=custom_match),
            patch("api.activity_types.PatientActivityType.objects.filter", return_value=custom_query),
            patch(
                "api.activity_types.PatientActivityType.objects.create",
                return_value=SimpleNamespace(name="Yoga"),
            ) as create_activity,
            patch("api.activity_types.transaction.atomic", return_value=nullcontext()),
        ):
            response = self.request("post", {"name": "  Yoga  "})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["activities"][-1], "Yoga")
        create_activity.assert_called_once_with(patient=self.patient, name="Yoga")

    def test_patient_activity_type_input_must_be_a_nonempty_name_object(self):
        response = self.request("post", {"name": ["Yoga"]})

        self.assertEqual(response.status_code, 400)

    def test_doctor_cannot_read_patient_activity_choices(self):
        response = self.request("get", role="doctor")

        self.assertEqual(response.status_code, 403)
        self.patient_filter.assert_not_called()


class AuthAndIsolationApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def call(self, view, role, method="get", path="/api/x", data=None, **kwargs):
        request = getattr(self.factory, method)(path, data=data, format="json")
        if role:
            force_authenticate(
                request,
                user=SimpleNamespace(id=9, role=role, is_authenticated=True),
            )
        return view(request, **kwargs)

    def test_unauthenticated_requests_are_rejected(self):
        for view in (lifestyle_logs, patient_list, doctor_notes):
            response = self.call(view, None)
            self.assertIn(response.status_code, (401, 403))

    def test_patient_cannot_use_doctor_only_endpoints(self):
        self.assertEqual(self.call(patient_list, "patient").status_code, 403)
        self.assertEqual(self.call(doctor_notes, "patient").status_code, 403)
        self.assertEqual(
            self.call(doctor_provider_goals, "patient", patient_id=1).status_code, 403
        )

    def test_doctor_cannot_create_patient_logs(self):
        response = self.call(
            lifestyle_logs,
            "doctor",
            "post",
            data={"type": "food", "date": "2026-10-04", "time": "08:00"},
        )
        self.assertEqual(response.status_code, 403)

    def test_patient_log_read_is_scoped_to_own_profile(self):
        with (
            patch("api.logs.PatientProfile.objects.filter") as patients,
            patch("api.logs.LifestyleLog.objects.filter") as logs,
        ):
            patients.return_value.first.return_value = SimpleNamespace(id=5)
            logs.return_value.select_related.return_value.order_by.return_value = []
            response = self.call(lifestyle_logs, "patient")

        self.assertEqual(response.status_code, 200)
        patients.assert_called_once_with(user_id=9)
        logs.assert_called_once_with(patient_id=5)

    def test_doctor_log_read_requires_patient_id(self):
        self.assertEqual(self.call(lifestyle_logs, "doctor").status_code, 400)

    def test_doctor_cannot_read_logs_of_unauthorized_patient(self):
        with (
            patch("api.logs.DoctorProfile.objects.filter") as doctors,
            patch("api.logs.authorized_patient_ids", return_value=[1]),
            patch("api.logs.PatientProfile.objects.filter") as patients,
            patch("api.logs.LifestyleLog.objects.filter") as logs,
        ):
            doctors.return_value.first.return_value = SimpleNamespace(id=2)
            patients.return_value.first.return_value = None
            response = self.call(
                lifestyle_logs, "doctor", path="/api/logs?patient_id=7"
            )

        self.assertEqual(response.status_code, 404)
        patients.assert_called_once_with(id=7, id__in=[1])
        logs.assert_not_called()

    def test_doctor_cannot_manage_goals_for_unauthorized_patient(self):
        with patch("api.goals.get_doctor_patient", return_value=(SimpleNamespace(id=2), None)):
            response = self.call(doctor_provider_goals, "doctor", patient_id=7)
        self.assertEqual(response.status_code, 404)

    def test_patient_list_only_queries_authorized_patients(self):
        with (
            patch("api.patients.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.patients.authorized_patient_ids", return_value=[1]),
            patch("api.patients.PatientProfile.objects.filter") as patients,
        ):
            patients.return_value.select_related.return_value.order_by.return_value = []
            response = self.call(patient_list, "doctor")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(patients.call_args.kwargs["id__in"], [1])
        self.assertTrue(patients.call_args.kwargs["monitoring_active"])

    def test_authorized_patient_ids_covers_manager_all_and_selected(self):
        with patch("api.patients.MonitoringRelationship.objects.filter") as relationships:
            authorized_patient_ids(2)

        condition = str(relationships.call_args.args[0])
        self.assertIn("managing_doctor_id", condition)
        self.assertIn("All Doctors", condition)
        self.assertIn("Selected Doctors", condition)
