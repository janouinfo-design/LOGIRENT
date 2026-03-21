"""
Iteration 58 - Vehicle Pricing Tiers Feature Tests
Tests for:
- GET /api/admin/vehicles/{id}/pricing - Get pricing tiers for a vehicle
- PUT /api/admin/vehicles/{id}/pricing - Save/update pricing tiers
- GET /api/vehicles/{id} - Public endpoint returns pricing_tiers
- GET /api/admin/vehicle-schedule - Includes orphan_reservations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"
TEST_VEHICLE_ID = "fd354ff5-2aa6-421d-86f0-94016b1b1669"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def client_token():
    """Get client authentication token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Client login failed: {resp.status_code} - {resp.text}")


class TestVehiclePricingTiersBackend:
    """Tests for vehicle pricing tiers API endpoints"""

    def test_get_vehicle_pricing_tiers(self, admin_token):
        """Test GET /api/admin/vehicles/{id}/pricing returns pricing tiers"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pricing_tiers" in data, "Response should contain pricing_tiers"
        assert isinstance(data["pricing_tiers"], list), "pricing_tiers should be a list"
        
        # Vehicle should have existing pricing tiers
        if len(data["pricing_tiers"]) > 0:
            tier = data["pricing_tiers"][0]
            assert "id" in tier, "Tier should have id"
            assert "name" in tier, "Tier should have name"
            assert "price" in tier, "Tier should have price"
            assert "active" in tier, "Tier should have active status"
            print(f"Found {len(data['pricing_tiers'])} pricing tiers for vehicle")

    def test_update_vehicle_pricing_tiers(self, admin_token):
        """Test PUT /api/admin/vehicles/{id}/pricing saves pricing tiers"""
        # First get existing tiers
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        existing_tiers = get_resp.json().get("pricing_tiers", [])
        
        # Add a new test tier
        test_tiers = existing_tiers + [{
            "id": f"test_tier_{os.urandom(4).hex()}",
            "name": "TEST_Forfait Test",
            "kilometers": 500,
            "price": 199.99,
            "period": "semaine",
            "order": len(existing_tiers),
            "active": True
        }]
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pricing_tiers": test_tiers}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pricing_tiers" in data, "Response should contain pricing_tiers"
        assert "message" in data, "Response should contain message"
        
        # Verify the new tier was added
        saved_tiers = data["pricing_tiers"]
        test_tier_found = any(t.get("name") == "TEST_Forfait Test" for t in saved_tiers)
        assert test_tier_found, "Test tier should be saved"
        print(f"Successfully saved {len(saved_tiers)} pricing tiers")
        
        # Cleanup: Remove test tier
        cleanup_tiers = [t for t in saved_tiers if not t.get("name", "").startswith("TEST_")]
        requests.put(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pricing_tiers": cleanup_tiers}
        )

    def test_pricing_tiers_fields_validation(self, admin_token):
        """Test that all pricing tier fields are properly saved"""
        test_tier = {
            "id": f"test_validation_{os.urandom(4).hex()}",
            "name": "TEST_Validation Tier",
            "kilometers": 1000,
            "price": 299.50,
            "period": "mois",
            "order": 99,
            "active": False
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pricing_tiers": [test_tier]}
        )
        assert resp.status_code == 200
        
        saved_tier = resp.json()["pricing_tiers"][0]
        assert saved_tier["name"] == "TEST_Validation Tier"
        assert saved_tier["kilometers"] == 1000
        assert saved_tier["price"] == 299.50
        assert saved_tier["period"] == "mois"
        assert saved_tier["active"] == False
        print("All pricing tier fields validated correctly")
        
        # Cleanup
        requests.put(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"pricing_tiers": []}
        )

    def test_public_vehicle_endpoint_returns_pricing_tiers(self):
        """Test GET /api/vehicles/{id} returns pricing_tiers in vehicle data"""
        resp = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pricing_tiers" in data, "Public vehicle endpoint should return pricing_tiers"
        assert isinstance(data["pricing_tiers"], list), "pricing_tiers should be a list"
        print(f"Public vehicle endpoint returns {len(data['pricing_tiers'])} pricing tiers")

    def test_vehicle_schedule_includes_orphan_reservations(self, admin_token):
        """Test GET /api/admin/vehicle-schedule includes orphan_reservations"""
        from datetime import datetime
        
        start_date = datetime.now().strftime("%Y-%m-01")
        end_date = datetime.now().strftime("%Y-%m-28")
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "vehicles" in data, "Response should contain vehicles"
        assert "orphan_reservations" in data, "Response should contain orphan_reservations"
        assert isinstance(data["orphan_reservations"], list), "orphan_reservations should be a list"
        print(f"Vehicle schedule includes {len(data['orphan_reservations'])} orphan reservations")


class TestTodayReservationsEndpoint:
    """Tests for today's reservations endpoint"""

    def test_today_reservations_returns_data(self, admin_token):
        """Test GET /api/admin/reservations/today returns reservations"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reservations/today",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "reservations" in data, "Response should contain reservations"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["reservations"], list)
        
        # Check reservation structure if any exist
        if len(data["reservations"]) > 0:
            res = data["reservations"][0]
            assert "user_name" in res, "Reservation should have user_name"
            assert "vehicle_name" in res, "Reservation should have vehicle_name"
            assert "status" in res, "Reservation should have status"
        print(f"Today's reservations endpoint returned {data['total']} reservations")


class TestAdminReservationsEndpoint:
    """Tests for admin reservations endpoint"""

    def test_admin_reservations_list(self, admin_token):
        """Test GET /api/admin/reservations returns paginated list"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "reservations" in data
        assert "total" in data
        print(f"Admin reservations endpoint returned {len(data['reservations'])} of {data['total']} total")


class TestAdminStatsEndpoint:
    """Tests for admin stats endpoint"""

    def test_admin_stats(self, admin_token):
        """Test GET /api/admin/stats returns dashboard stats"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "total_vehicles" in data
        assert "total_reservations" in data
        assert "total_users" in data
        assert "total_revenue" in data
        print(f"Stats: {data['total_vehicles']} vehicles, {data['total_reservations']} reservations, CHF {data['total_revenue']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
