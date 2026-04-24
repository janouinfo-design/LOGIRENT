"""Test email generation for new reservation request admin alert."""
import sys
sys.path.insert(0, '/app/backend')

from utils.email import generate_new_request_admin_email


def test_admin_email_generation():
    client = {"name": "Jean Dupont", "email": "jean.dupont@gmail.com", "phone": "+41 79 123 45 67"}
    vehicle = {"brand": "BMW", "model": "Serie 3 320d", "type": "Berline", "location": "Geneva"}
    reservation = {
        "start_date": "2026-08-10T08:00:00",
        "end_date": "2026-08-12T18:00:00",
        "total_days": 3, "total_price": 360, "payment_method": "cash",
    }
    html = generate_new_request_admin_email(client, vehicle, reservation)
    assert "Nouvelle demande de reservation" in html
    assert "Jean Dupont" in html
    assert "BMW Serie 3 320d" in html
    assert "CHF 360" in html
    assert "Especes" in html
    assert "Traiter la demande" in html
    print("✓ Admin email generation OK")


if __name__ == "__main__":
    test_admin_email_generation()
