from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.stress_nlp import classify_reflection, normalize_reflection, preprocess
from api.stress_views import stress_classification


class StressNormalizationTests(SimpleTestCase):
    def test_guided_answers_are_joined_in_order_with_punctuation(self):
        text = normalize_reflection("Work is heavy || I sleep poorly.|| ||  ||Please check in")
        self.assertEqual(text, "Work is heavy. I sleep poorly. Please check in.")

    def test_blank_or_unusable_input_is_never_labeled(self):
        for detail in ("", "  ||  || ", "...", "!!! ||", None):
            self.assertEqual(classify_reflection(detail), (None, "unable_to_classify"))

    def test_negation_is_kept_and_separator_removed(self):
        self.assertEqual(preprocess("I can't sleep || it's bad"), "i can not sleep it's bad")

    def test_short_answer_is_classified_with_a_valid_label(self):
        label, status = classify_reflection("Kinakabahan ako")
        self.assertEqual(status, "ok")
        self.assertIn(label, ("NO_STRESS", "MILD_STRESS", "MODERATE_STRESS", "HIGH_STRESS"))

    def test_missing_model_reports_model_unavailable(self):
        with patch("api.stress_nlp._load_model", side_effect=FileNotFoundError):
            self.assertEqual(classify_reflection("I feel tired"), (None, "model_unavailable"))


class StressClassificationApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def call(self, role, patient_id=7, data=None):
        request = self.factory.post("/api/x", data=data or {"log_id": 3}, format="json")
        if role:
            force_authenticate(request, user=SimpleNamespace(id=9, role=role, is_authenticated=True))
        return stress_classification(request, patient_id=patient_id)

    def test_unauthenticated_request_is_rejected(self):
        self.assertIn(self.call(None).status_code, (401, 403))

    def test_patient_cannot_request_classification(self):
        self.assertEqual(self.call("patient").status_code, 403)

    def test_unauthorized_patient_returns_404_without_reading_logs(self):
        with (
            patch("api.stress_views.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.stress_views.authorized_patient_ids", return_value=[1]),
            patch("api.stress_views.PatientProfile.objects.filter") as patients,
            patch("api.stress_views.LifestyleLog.objects.filter") as logs,
        ):
            patients.return_value.first.return_value = None
            response = self.call("doctor")
        self.assertEqual(response.status_code, 404)
        logs.assert_not_called()

    def test_invalid_log_id_is_rejected(self):
        with (
            patch("api.stress_views.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.stress_views.authorized_patient_ids", return_value=[7]),
            patch("api.stress_views.PatientProfile.objects.filter") as patients,
        ):
            patients.return_value.first.return_value = SimpleNamespace(id=7)
            response = self.call("doctor", data={"log_id": "3"})
        self.assertEqual(response.status_code, 400)

    def test_authorized_doctor_gets_label_without_confidence(self):
        with (
            patch("api.stress_views.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.stress_views.authorized_patient_ids", return_value=[7]),
            patch("api.stress_views.PatientProfile.objects.filter") as patients,
            patch("api.stress_views.LifestyleLog.objects.filter") as logs,
        ):
            patients.return_value.first.return_value = SimpleNamespace(id=7)
            logs.return_value.first.return_value = SimpleNamespace(id=3, detail="I am so overwhelmed || cannot sleep")
            response = self.call("doctor")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"log_id", "patient_id", "label", "status", "model_version"})
        self.assertEqual(response.data["status"], "ok")
        logs.assert_called_once_with(id=3, patient_id=7, type="stress")

    def test_blank_reflection_returns_unable_to_classify(self):
        with (
            patch("api.stress_views.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.stress_views.authorized_patient_ids", return_value=[7]),
            patch("api.stress_views.PatientProfile.objects.filter") as patients,
            patch("api.stress_views.LifestyleLog.objects.filter") as logs,
        ):
            patients.return_value.first.return_value = SimpleNamespace(id=7)
            logs.return_value.first.return_value = SimpleNamespace(id=3, detail=" ||  || ")
            response = self.call("doctor")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["label"])
        self.assertEqual(response.data["status"], "unable_to_classify")

    def test_missing_model_returns_503_without_label(self):
        with (
            patch("api.stress_views.get_doctor_profile", return_value=SimpleNamespace(id=2)),
            patch("api.stress_views.authorized_patient_ids", return_value=[7]),
            patch("api.stress_views.PatientProfile.objects.filter") as patients,
            patch("api.stress_views.LifestyleLog.objects.filter") as logs,
            patch("api.stress_nlp._load_model", side_effect=FileNotFoundError),
        ):
            patients.return_value.first.return_value = SimpleNamespace(id=7)
            logs.return_value.first.return_value = SimpleNamespace(id=3, detail="I feel tired")
            response = self.call("doctor")
        self.assertEqual(response.status_code, 503)
        self.assertIsNone(response.data["label"])
