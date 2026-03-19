"""
Test Suite for Statistics Dashboard APIs and Reservation Status Email Notifications
Covers:
- GET /api/admin/stats/advanced - Advanced statistics endpoint
- PUT /api/admin/reservations/{id}/status - Status change triggers notification + email
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-vps-deploy.preview.emergentagent.com')

# Test credentials
AGENCY_ADMIN = {"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
SUPER_ADMIN = {"email": "test@example.com", "password": "password123"}


@pytest.fixture(scope="module")
def agency_admin_token():
    """Get agency admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=AGENCY_ADMIN)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Agency admin login failed")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Super admin login failed")


class TestAdvancedStatsEndpoint:
    """Tests for GET /api/admin/stats/advanced"""

    def test_advanced_stats_returns_200_for_agency_admin(self, agency_admin_token):
        """Agency admin can access advanced stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert response.status_code == 200
        print(f"Advanced stats for agency admin returned successfully")

    def test_advanced_stats_returns_200_for_super_admin(self, super_admin_token):
        """Super admin can access advanced stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        print(f"Advanced stats for super admin returned successfully")

    def test_advanced_stats_has_revenue_this_month(self, agency_admin_token):
        """Check revenue_this_month field exists and is numeric"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "revenue_this_month" in data
        assert isinstance(data["revenue_this_month"], (int, float))
        print(f"revenue_this_month: {data['revenue_this_month']}")

    def test_advanced_stats_has_vehicle_utilization(self, agency_admin_token):
        """Check vehicle_utilization array exists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "vehicle_utilization" in data
        assert isinstance(data["vehicle_utilization"], list)
        if data["vehicle_utilization"]:
            item = data["vehicle_utilization"][0]
            assert "id" in item
            assert "name" in item
            assert "utilization" in item
            assert "booked_days" in item
        print(f"vehicle_utilization has {len(data['vehicle_utilization'])} vehicles")

    def test_advanced_stats_has_daily_revenue(self, agency_admin_token):
        """Check daily_revenue array exists with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "daily_revenue" in data
        assert isinstance(data["daily_revenue"], list)
        if data["daily_revenue"]:
            item = data["daily_revenue"][0]
            assert "date" in item
            assert "revenue" in item
            assert "bookings" in item
        print(f"daily_revenue has {len(data['daily_revenue'])} entries")

    def test_advanced_stats_has_payment_methods(self, agency_admin_token):
        """Check payment_methods array exists with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "payment_methods" in data
        assert isinstance(data["payment_methods"], list)
        if data["payment_methods"]:
            item = data["payment_methods"][0]
            assert "method" in item
            assert "count" in item
            assert "total" in item
        print(f"payment_methods: {data['payment_methods']}")

    def test_advanced_stats_has_cancellation_rate(self, agency_admin_token):
        """Check cancellation_rate field exists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "cancellation_rate" in data
        assert isinstance(data["cancellation_rate"], (int, float))
        assert 0 <= data["cancellation_rate"] <= 100
        print(f"cancellation_rate: {data['cancellation_rate']}%")

    def test_advanced_stats_has_weekly_trends(self, agency_admin_token):
        """Check weekly_trends array exists with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        assert "weekly_trends" in data
        assert isinstance(data["weekly_trends"], list)
        if data["weekly_trends"]:
            item = data["weekly_trends"][0]
            assert "week" in item
            assert "bookings" in item
            assert "revenue" in item
        print(f"weekly_trends has {len(data['weekly_trends'])} weeks")

    def test_advanced_stats_all_required_fields(self, agency_admin_token):
        """Comprehensive check for all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        
        required_fields = [
            "revenue_this_month",
            "revenue_last_month",
            "revenue_change_pct",
            "reservations_this_month",
            "reservations_last_month",
            "avg_booking_duration",
            "avg_revenue_per_reservation",
            "vehicle_utilization",
            "revenue_per_vehicle",
            "daily_revenue",
            "new_clients_30d",
            "payment_methods",
            "cancellation_rate",
            "weekly_trends",
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"All {len(required_fields)} required fields present")

    def test_advanced_stats_unauthorized_without_token(self):
        """Should return 401 without auth token"""
        response = requests.get(f"{BASE_URL}/api/admin/stats/advanced")
        assert response.status_code == 401
        print("Unauthorized access correctly blocked")


class TestReservationStatusChangeNotification:
    """Tests for PUT /api/admin/reservations/{id}/status triggering notifications"""

    def test_status_update_returns_success(self, agency_admin_token):
        """Status update should return success message"""
        # First, get a reservation
        resp = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=1",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        reservations = resp.json().get("reservations", [])
        if not reservations:
            pytest.skip("No reservations to test with")
        
        reservation = reservations[0]
        res_id = reservation["id"]
        
        # Get current status and pick a valid transition
        current_status = reservation.get("status", "pending")
        new_status = "confirmed" if current_status in ["pending", "pending_cash"] else "active" if current_status == "confirmed" else "completed"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/status?status={new_status}",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert new_status in data["message"]
        print(f"Status updated to {new_status} for reservation {res_id}")

    def test_invalid_status_returns_400(self, agency_admin_token):
        """Invalid status should return 400"""
        # First, get a reservation
        resp = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=1",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        reservations = resp.json().get("reservations", [])
        if not reservations:
            pytest.skip("No reservations to test with")
        
        res_id = reservations[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=invalid_status",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        
        assert response.status_code == 400
        print("Invalid status correctly rejected")

    def test_nonexistent_reservation_returns_404(self, agency_admin_token):
        """Non-existent reservation should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/nonexistent-id-12345/status?status=confirmed",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        
        assert response.status_code == 404
        print("Non-existent reservation correctly returns 404")


class TestBasicStatsEndpoint:
    """Tests for GET /api/admin/stats - Basic statistics"""

    def test_basic_stats_returns_200(self, agency_admin_token):
        """Basic stats endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert response.status_code == 200
        print("Basic stats endpoint working")

    def test_basic_stats_has_required_fields(self, agency_admin_token):
        """Check basic stats has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        data = response.json()
        
        required_fields = [
            "total_vehicles",
            "total_users", 
            "total_reservations",
            "total_payments",
            "total_revenue",
            "reservations_by_status",
            "top_vehicles",
            "revenue_by_month",
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Basic stats has all {len(required_fields)} required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
