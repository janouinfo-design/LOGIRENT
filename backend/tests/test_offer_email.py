"""Test offer email generation."""
import sys
sys.path.insert(0, '/app/backend')

from utils.email import generate_price_offer_email


def test_offer_email_price_changed():
    client = "Jean Dupont"
    vehicle = {"brand": "BMW", "model": "Serie 3 320d", "type": "Berline", "location": "Geneva"}
    reservation = {
        "start_date": "2026-08-10T08:00:00",
        "end_date": "2026-08-12T18:00:00",
        "total_days": 3, "total_price": 350,
    }
    html = generate_price_offer_email(client, vehicle, reservation, old_price=400, new_price=350, message="Remise fidélité")
    assert "Nouveau prix propose" in html
    assert "CHF 400.00" in html
    assert "CHF 350.00" in html
    assert "Remise fidélité" in html
    print("✓ Offer email (price changed) OK")


def test_offer_email_price_same():
    client = "Marie Durand"
    vehicle = {"brand": "Tesla", "model": "Model 3", "type": "Electric", "location": "Zurich"}
    reservation = {
        "start_date": "2026-08-10T08:00:00",
        "end_date": "2026-08-12T18:00:00",
        "total_days": 3, "total_price": 500,
    }
    html = generate_price_offer_email(client, vehicle, reservation, old_price=500, new_price=500, message="")
    assert "CHF 500.00" in html
    assert "Nouveau prix propose" not in html
    print("✓ Offer email (same price) OK")


if __name__ == "__main__":
    test_offer_email_price_changed()
    test_offer_email_price_same()
