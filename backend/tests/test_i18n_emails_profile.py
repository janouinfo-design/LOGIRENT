"""Tests for i18n multilingual emails and preferred_language profile API."""
import os
import sys
import pytest
import requests

sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or 'https://logirent-preview-3.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

CLIENT_EMAIL = "client1@logirent.ch"
CLIENT_PASSWORD = "LogiRent2024!"


# ---- Email generation tests (unit) ----
class TestEmailGeneration:
    def setup_method(self):
        from utils.email import (
            generate_reservation_confirmation_email,
            generate_price_offer_email,
            generate_status_change_email,
            status_change_subject,
        )
        self.gen_conf = generate_reservation_confirmation_email
        self.gen_offer = generate_price_offer_email
        self.gen_status = generate_status_change_email
        self.subj_status = status_change_subject
        self.vehicle = {"brand": "BMW", "model": "X5", "type": "SUV", "location": "Genève"}
        self.reservation = {
            "start_date": "2026-02-01T00:00:00Z",
            "end_date": "2026-02-05T00:00:00Z",
            "total_days": 4,
            "total_price": 800.0,
            "payment_method": "card",
        }

    def test_confirmation_email_fr(self):
        html = self.gen_conf("Alice", self.vehicle, self.reservation, "fr")
        assert "Réservation Confirmée" in html

    def test_confirmation_email_en(self):
        html = self.gen_conf("Alice", self.vehicle, self.reservation, "en")
        assert "Booking Confirmed" in html
        assert "Réservation Confirmée" not in html

    def test_confirmation_email_de(self):
        html = self.gen_conf("Alice", self.vehicle, self.reservation, "de")
        assert "Buchung Bestätigt" in html

    def test_price_offer_email_all_langs(self):
        html_fr = self.gen_offer("Alice", self.vehicle, self.reservation, 800.0, 700.0, "msg", "fr")
        html_en = self.gen_offer("Alice", self.vehicle, self.reservation, 800.0, 700.0, "msg", "en")
        html_de = self.gen_offer("Alice", self.vehicle, self.reservation, 800.0, 700.0, "msg", "de")
        assert "Offre de réservation" in html_fr
        assert "Booking offer" in html_en
        assert "Buchungsangebot" in html_de

    def test_status_change_email_all_langs(self):
        for lang, expected in [("fr", "Réservation Confirmée"),
                                ("en", "Booking Confirmed"),
                                ("de", "Buchung Bestätigt")]:
            html = self.gen_status("Alice", "BMW X5", "confirmed", self.reservation, lang)
            assert expected in html, f"lang={lang} missing '{expected}'"

    def test_status_change_subject_all_langs(self):
        assert "Réservation confirmée" in self.subj_status("confirmed", "BMW X5", "fr")
        assert "Booking confirmed" in self.subj_status("confirmed", "BMW X5", "en")
        assert "Buchung bestätigt" in self.subj_status("confirmed", "BMW X5", "de")


# ---- API: preferred_language ----
@pytest.fixture(scope="module")
def client_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD},
                      timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


class TestPreferredLanguageAPI:
    def _headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def test_put_and_get_preferred_language(self, client_token):
        # Set to 'de'
        r = requests.put(f"{BASE_URL}/api/auth/profile",
                         json={"preferred_language": "de"},
                         headers=self._headers(client_token), timeout=15)
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("preferred_language") == "de", f"Response: {data}"

        # GET verifies persistence
        r2 = requests.get(f"{BASE_URL}/api/auth/profile",
                          headers=self._headers(client_token), timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("preferred_language") == "de"

    def test_set_english(self, client_token):
        r = requests.put(f"{BASE_URL}/api/auth/profile",
                         json={"preferred_language": "en"},
                         headers=self._headers(client_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("preferred_language") == "en"

    def test_restore_french(self, client_token):
        # Cleanup: restore to fr as required
        r = requests.put(f"{BASE_URL}/api/auth/profile",
                         json={"preferred_language": "fr"},
                         headers=self._headers(client_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("preferred_language") == "fr"
