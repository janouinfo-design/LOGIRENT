"""
Test suite for Admin Calendar and Overdue endpoints
Tests the new calendar page functionality including:
- /api/admin/calendar - Calendar events with departure/return info
- /api/admin/overdue - Overdue reservations
- /api/admin/reservations - Reservation listing with status
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

# Get the base URL from environment variable
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://fleet-management-hub-9.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"


class TestAuthentication:
    """Test authentication endpoint"""
    
    def test_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAdminCalendar:
    """Test /api/admin/calendar endpoint"""
    
    def test_calendar_returns_events(self, auth_headers):
        """Test calendar endpoint returns events list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Calendar request failed: {response.text}"
        
        data = response.json()
        assert "events" in data
        assert "month" in data
        assert "year" in data
        assert isinstance(data["events"], list)
        
    def test_calendar_with_month_year_params(self, auth_headers):
        """Test calendar with specific month and year"""
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar?month=2&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["month"] == 2
        assert data["year"] == 2026
        
    def test_calendar_event_structure(self, auth_headers):
        """Test calendar event has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar?month=2&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        events = data["events"]
        
        if len(events) > 0:
            event = events[0]
            # Verify required fields in event
            required_fields = [
                "id", "user_name", "user_email", "vehicle_name",
                "start_date", "end_date", "status", "is_overdue"
            ]
            for field in required_fields:
                assert field in event, f"Missing field: {field}"
            
            # Verify data types
            assert isinstance(event["is_overdue"], bool)
            assert isinstance(event["days_overdue"], int)
            assert event["status"] in ["pending", "pending_cash", "confirmed", "active", "completed", "cancelled"]
            
    def test_calendar_without_auth_fails(self):
        """Test calendar endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/calendar")
        assert response.status_code == 401


class TestAdminOverdue:
    """Test /api/admin/overdue endpoint"""
    
    def test_overdue_returns_list(self, auth_headers):
        """Test overdue endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/overdue",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Overdue request failed: {response.text}"
        
        data = response.json()
        assert "overdue" in data
        assert "total" in data
        assert isinstance(data["overdue"], list)
        assert isinstance(data["total"], int)
        assert data["total"] == len(data["overdue"])
        
    def test_overdue_item_structure(self, auth_headers):
        """Test overdue item has correct structure if any exist"""
        response = requests.get(
            f"{BASE_URL}/api/admin/overdue",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["overdue"]) > 0:
            item = data["overdue"][0]
            required_fields = [
                "id", "user_name", "vehicle_name",
                "start_date", "end_date", "days_overdue", "status"
            ]
            for field in required_fields:
                assert field in item, f"Missing field in overdue item: {field}"
            
            # All overdue items should have status "active"
            assert item["status"] == "active"
            # Days overdue should be positive
            assert item["days_overdue"] >= 0
            
    def test_overdue_without_auth_fails(self):
        """Test overdue endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/overdue")
        assert response.status_code == 401


class TestAdminReservations:
    """Test /api/admin/reservations endpoint"""
    
    def test_reservations_list(self, auth_headers):
        """Test reservations list returns data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Reservations request failed: {response.text}"
        
        data = response.json()
        assert "reservations" in data
        assert "total" in data
        assert isinstance(data["reservations"], list)
        
    def test_reservations_contain_user_vehicle_info(self, auth_headers):
        """Test reservations are enriched with user and vehicle info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reservations"]) > 0:
            reservation = data["reservations"][0]
            # Verify enriched fields
            assert "user_name" in reservation
            assert "user_email" in reservation
            assert "vehicle_name" in reservation
            # Verify status field
            assert "status" in reservation
            assert reservation["status"] in ["pending", "pending_cash", "confirmed", "active", "completed", "cancelled"]
            
    def test_reservations_status_filter(self, auth_headers):
        """Test reservations can be filtered by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations?status=confirmed",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # All returned reservations should have confirmed status
        for reservation in data["reservations"]:
            assert reservation["status"] == "confirmed"
            
    def test_reservations_update_status(self, auth_headers):
        """Test updating reservation status"""
        # First get a reservation
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=1",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reservations"]) > 0:
            reservation_id = data["reservations"][0]["id"]
            original_status = data["reservations"][0]["status"]
            
            # Try to update status (just test the endpoint works)
            # We'll set it to the same status to avoid breaking anything
            response = requests.put(
                f"{BASE_URL}/api/admin/reservations/{reservation_id}/status?status={original_status}",
                headers=auth_headers
            )
            assert response.status_code == 200
            
    def test_reservations_update_payment_status(self, auth_headers):
        """Test updating payment status"""
        # First get a reservation
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=1",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reservations"]) > 0:
            reservation_id = data["reservations"][0]["id"]
            original_payment_status = data["reservations"][0].get("payment_status", "unpaid")
            
            # Try to update payment status (set to same value)
            response = requests.put(
                f"{BASE_URL}/api/admin/reservations/{reservation_id}/payment-status?payment_status={original_payment_status}",
                headers=auth_headers
            )
            assert response.status_code == 200


class TestAdminStats:
    """Test admin stats endpoint"""
    
    def test_stats_returns_data(self, auth_headers):
        """Test admin stats endpoint returns expected data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        required_fields = [
            "total_vehicles", "total_users", "total_reservations",
            "total_payments", "total_revenue", "reservations_by_status"
        ]
        for field in required_fields:
            assert field in data, f"Missing field in stats: {field}"
            
        # Verify types
        assert isinstance(data["total_vehicles"], int)
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_reservations"], int)
        assert isinstance(data["reservations_by_status"], dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
