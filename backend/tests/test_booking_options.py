"""
Test suite for Admin-configurable booking options per agency
Tests:
- GET /api/admin/booking-options (admin auth required)
- PUT /api/admin/booking-options (admin auth required)
- GET /api/agencies/{agency_id}/booking-options (public endpoint)
- Vehicle schedule still works with all vehicles
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"
AGENCY_ID = "8678c286-2421-4423-ad05-69f03ef2414f"
VEHICLE_ID = "fd354ff5-2aa6-421d-86f0-94016b1b1669"  # Toyota Yaris Hybrid


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def client_token():
    """Get client authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Client login failed: {response.text}")
    return response.json().get("access_token")


class TestAdminBookingOptions:
    """Test admin-only booking options endpoints"""

    def test_get_booking_options_requires_auth(self):
        """GET /api/admin/booking-options should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/booking-options")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ GET /api/admin/booking-options requires auth (status: {response.status_code})")

    def test_get_booking_options_as_admin(self, admin_token):
        """GET /api/admin/booking-options should return array of options"""
        response = requests.get(
            f"{BASE_URL}/api/admin/booking-options",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "options" in data, "Response should contain 'options' array"
        options = data["options"]
        assert isinstance(options, list), "Options should be a list"
        
        # Verify default options structure
        if len(options) > 0:
            first_option = options[0]
            assert "name" in first_option, "Each option should have 'name'"
            assert "price_per_day" in first_option, "Each option should have 'price_per_day'"
            assert "enabled" in first_option, "Each option should have 'enabled'"
            print(f"✓ GET /api/admin/booking-options returns {len(options)} options")
            for opt in options:
                print(f"  - {opt['name']}: CHF {opt['price_per_day']}/jour (enabled: {opt['enabled']})")
        else:
            print(f"✓ GET /api/admin/booking-options returns empty options array (defaults will be used)")

    def test_put_booking_options_requires_auth(self):
        """PUT /api/admin/booking-options should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/booking-options",
            json={"options": [{"name": "Test", "price_per_day": 5, "enabled": True}]}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ PUT /api/admin/booking-options requires auth (status: {response.status_code})")

    def test_update_booking_options(self, admin_token):
        """PUT /api/admin/booking-options should update agency's booking options"""
        # Define test options
        test_options = [
            {"name": "GPS", "price_per_day": 10, "enabled": True},
            {"name": "Siège enfant", "price_per_day": 8, "enabled": True},
            {"name": "Conducteur supplémentaire", "price_per_day": 15, "enabled": True},
            {"name": "TEST_Option Disabled", "price_per_day": 5, "enabled": False},
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/booking-options",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"options": test_options}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contains updated options
        assert "options" in data, "Response should contain 'options'"
        assert len(data["options"]) == 4, f"Expected 4 options, got {len(data['options'])}"
        print(f"✓ PUT /api/admin/booking-options updated {len(data['options'])} options")
        
        # Verify persistence by fetching again
        get_response = requests.get(
            f"{BASE_URL}/api/admin/booking-options",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert len(get_data["options"]) == 4, "Options should persist after update"
        print(f"✓ Options persisted correctly after update")


class TestPublicBookingOptions:
    """Test public booking options endpoint for agencies"""

    def test_public_endpoint_no_auth_required(self):
        """GET /api/agencies/{agency_id}/booking-options should work without auth"""
        response = requests.get(f"{BASE_URL}/api/agencies/{AGENCY_ID}/booking-options")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "options" in data, "Response should contain 'options' array"
        print(f"✓ GET /api/agencies/{AGENCY_ID}/booking-options works without auth")

    def test_public_endpoint_returns_enabled_options_only(self):
        """Public endpoint should only return enabled options"""
        response = requests.get(f"{BASE_URL}/api/agencies/{AGENCY_ID}/booking-options")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        options = data["options"]
        # All returned options should be enabled
        for opt in options:
            # The enabled field might be True or missing (defaults to True)
            enabled = opt.get("enabled", True)
            assert enabled is True or enabled == True, f"Option '{opt['name']}' should be enabled but got enabled={enabled}"
        
        # Check that disabled option is filtered out
        option_names = [o["name"] for o in options]
        assert "TEST_Option Disabled" not in option_names, "Disabled option 'TEST_Option Disabled' should not appear in public endpoint"
        print(f"✓ Public endpoint returns only enabled options (count: {len(options)})")
        for opt in options:
            print(f"  - {opt['name']}: CHF {opt['price_per_day']}/jour")

    def test_public_endpoint_with_nonexistent_agency(self):
        """Public endpoint should return 404 for non-existent agency"""
        response = requests.get(f"{BASE_URL}/api/agencies/nonexistent-agency-id/booking-options")
        assert response.status_code == 404, f"Expected 404 for non-existent agency, got {response.status_code}"
        print(f"✓ GET /api/agencies/nonexistent-agency-id/booking-options returns 404")

    def test_public_endpoint_default_fallback(self):
        """If no options configured, should return default options"""
        response = requests.get(f"{BASE_URL}/api/agencies/{AGENCY_ID}/booking-options")
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least some options (either configured or defaults)
        assert len(data["options"]) >= 1, "Should return at least one option (configured or default)"
        print(f"✓ Public endpoint returns options (fallback or configured): {len(data['options'])} options")


class TestVehicleSchedule:
    """Test that vehicle schedule still returns all vehicles"""

    def test_vehicle_schedule_returns_all_vehicles(self, admin_token):
        """GET /api/admin/vehicle-schedule should return all 6 vehicles"""
        # Using a wide date range to capture all vehicles
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={
                "start_date": "2025-01-01",
                "end_date": "2026-12-31"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "vehicles" in data, "Response should contain 'vehicles'"
        vehicles = data["vehicles"]
        
        # Should return at least 6 vehicles (as per previous tests)
        assert len(vehicles) >= 6, f"Expected at least 6 vehicles, got {len(vehicles)}"
        print(f"✓ GET /api/admin/vehicle-schedule returns {len(vehicles)} vehicles")
        for v in vehicles[:6]:
            reservations_count = len(v.get("reservations", []))
            print(f"  - {v.get('brand', 'N/A')} {v.get('model', 'N/A')}: {reservations_count} reservations")


class TestClientBookingOptionsUsage:
    """Test that client can see booking options when making reservations"""

    def test_vehicle_endpoint_contains_agency_id(self, client_token):
        """Verify vehicle has agency_id for frontend to fetch options"""
        response = requests.get(
            f"{BASE_URL}/api/vehicles/{VEHICLE_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        vehicle = response.json()
        
        # Vehicle should have agency_id for frontend to fetch agency-specific options
        assert "agency_id" in vehicle, "Vehicle should have 'agency_id' field"
        assert vehicle["agency_id"] is not None, "Vehicle agency_id should not be None"
        print(f"✓ Vehicle {VEHICLE_ID[:8]}... has agency_id: {vehicle['agency_id'][:8]}...")


class TestCleanupOptions:
    """Cleanup test options after tests"""

    def test_cleanup_test_options(self, admin_token):
        """Remove TEST_ prefixed options after testing"""
        # First get current options
        get_response = requests.get(
            f"{BASE_URL}/api/admin/booking-options",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if get_response.status_code != 200:
            print("⚠ Could not fetch options for cleanup")
            return
        
        current_options = get_response.json().get("options", [])
        
        # Filter out TEST_ prefixed options
        clean_options = [o for o in current_options if not o.get("name", "").startswith("TEST_")]
        
        # If we removed options, update
        if len(clean_options) < len(current_options):
            response = requests.put(
                f"{BASE_URL}/api/admin/booking-options",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"options": clean_options}
            )
            assert response.status_code == 200, f"Cleanup failed: {response.text}"
            print(f"✓ Cleaned up TEST_ options. Remaining: {len(clean_options)}")
        else:
            print(f"✓ No TEST_ options to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
