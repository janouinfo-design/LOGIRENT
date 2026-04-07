"""
Iteration 71 - Reservation Tab Navigation Tests
Tests for the 3-tab reservation page: Aujourd'hui, Gestion, Planning
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"


class TestReservationTabsBackend:
    """Backend API tests for reservation tabs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ============ /admin/stats endpoint tests ============
    def test_admin_stats_returns_200(self):
        """Test /api/admin/stats returns 200 with KPI data"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200, f"Stats failed: {resp.text}"
        data = resp.json()
        
        # Verify KPI fields exist
        assert "total_vehicles" in data, "Missing total_vehicles"
        assert "total_reservations" in data, "Missing total_reservations"
        assert "total_users" in data, "Missing total_users"
        assert "total_revenue" in data, "Missing total_revenue"
        assert "reservations_by_status" in data, "Missing reservations_by_status"
        print(f"Stats: vehicles={data['total_vehicles']}, reservations={data['total_reservations']}, revenue={data['total_revenue']}")
    
    def test_admin_stats_reservations_by_status(self):
        """Test /api/admin/stats returns reservations_by_status breakdown"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        
        status_breakdown = data.get("reservations_by_status", {})
        # Check that it's a dict with status keys
        assert isinstance(status_breakdown, dict), "reservations_by_status should be a dict"
        print(f"Reservations by status: {status_breakdown}")
    
    # ============ /admin/reservations/today endpoint tests ============
    def test_today_reservations_returns_200(self):
        """Test /api/admin/reservations/today returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations/today")
        assert resp.status_code == 200, f"Today reservations failed: {resp.text}"
        data = resp.json()
        
        assert "reservations" in data, "Missing reservations field"
        assert "total" in data, "Missing total field"
        assert isinstance(data["reservations"], list), "reservations should be a list"
        print(f"Today reservations: {data['total']} found")
    
    def test_today_reservations_has_required_fields(self):
        """Test today reservations have required fields for display"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations/today")
        assert resp.status_code == 200
        data = resp.json()
        
        if data["reservations"]:
            res = data["reservations"][0]
            # Check required fields for Aujourd'hui tab display
            assert "id" in res, "Missing id"
            assert "user_name" in res, "Missing user_name"
            assert "vehicle_name" in res, "Missing vehicle_name"
            assert "start_date" in res, "Missing start_date"
            assert "end_date" in res, "Missing end_date"
            assert "status" in res, "Missing status"
            print(f"Sample today reservation: {res.get('user_name')} - {res.get('vehicle_name')} ({res.get('status')})")
    
    # ============ /admin/overdue endpoint tests ============
    def test_overdue_reservations_returns_200(self):
        """Test /api/admin/overdue returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/overdue")
        assert resp.status_code == 200, f"Overdue failed: {resp.text}"
        data = resp.json()
        
        assert "overdue" in data, "Missing overdue field"
        assert "total" in data, "Missing total field"
        assert isinstance(data["overdue"], list), "overdue should be a list"
        print(f"Overdue reservations: {data['total']} found")
    
    def test_overdue_has_days_overdue_field(self):
        """Test overdue reservations have days_overdue field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/overdue")
        assert resp.status_code == 200
        data = resp.json()
        
        if data["overdue"]:
            res = data["overdue"][0]
            assert "days_overdue" in res, "Missing days_overdue field"
            assert "user_name" in res, "Missing user_name"
            assert "vehicle_name" in res, "Missing vehicle_name"
            print(f"Sample overdue: {res.get('vehicle_name')} - {res.get('days_overdue')} days overdue")
    
    # ============ /admin/reservations endpoint tests (Gestion tab) ============
    def test_reservations_list_returns_200(self):
        """Test /api/admin/reservations returns 200 with pagination"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=200")
        assert resp.status_code == 200, f"Reservations list failed: {resp.text}"
        data = resp.json()
        
        assert "reservations" in data, "Missing reservations field"
        assert "total" in data, "Missing total field"
        print(f"Total reservations: {data['total']}")
    
    def test_reservations_list_has_required_fields(self):
        """Test reservations have required fields for Gestion tab cards"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=10")
        assert resp.status_code == 200
        data = resp.json()
        
        if data["reservations"]:
            res = data["reservations"][0]
            # Required fields for ReservationCard component
            assert "id" in res, "Missing id"
            assert "user_name" in res, "Missing user_name"
            assert "user_email" in res, "Missing user_email"
            assert "vehicle_name" in res, "Missing vehicle_name"
            assert "start_date" in res, "Missing start_date"
            assert "end_date" in res, "Missing end_date"
            assert "total_price" in res, "Missing total_price"
            assert "status" in res, "Missing status"
            assert "payment_status" in res, "Missing payment_status"
            print(f"Sample reservation: {res.get('user_name')} - {res.get('vehicle_name')} - CHF {res.get('total_price')}")
    
    def test_reservations_filter_by_status(self):
        """Test filtering reservations by status"""
        for status in ["confirmed", "active", "completed", "cancelled"]:
            resp = self.session.get(f"{BASE_URL}/api/admin/reservations?status={status}&limit=5")
            assert resp.status_code == 200, f"Filter by {status} failed"
            data = resp.json()
            # All returned reservations should have the filtered status
            for res in data["reservations"]:
                assert res["status"] == status, f"Expected status {status}, got {res['status']}"
            print(f"Filter '{status}': {len(data['reservations'])} reservations")
    
    # ============ /admin/vehicle-schedule endpoint tests (Planning tab) ============
    def test_vehicle_schedule_returns_200(self):
        """Test /api/admin/vehicle-schedule returns 200 for Gantt chart"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-04-01&end_date=2026-04-30")
        assert resp.status_code == 200, f"Vehicle schedule failed: {resp.text}"
        data = resp.json()
        
        # Should return vehicles with their reservations
        assert "vehicles" in data or isinstance(data, list), "Missing vehicles data"
        vehicles = data.get("vehicles", data) if isinstance(data, dict) else data
        print(f"Vehicle schedule: {len(vehicles)} vehicles")
    
    def test_vehicle_schedule_has_reservation_data(self):
        """Test vehicle schedule includes reservation data for Gantt bars"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-04-01&end_date=2026-04-30")
        assert resp.status_code == 200
        data = resp.json()
        
        vehicles = data.get("vehicles", data) if isinstance(data, dict) else data
        if vehicles:
            vehicle = vehicles[0]
            assert "id" in vehicle, "Missing vehicle id"
            assert "brand" in vehicle, "Missing brand"
            assert "model" in vehicle, "Missing model"
            assert "reservations" in vehicle, "Missing reservations array"
            print(f"Sample vehicle: {vehicle.get('brand')} {vehicle.get('model')} - {len(vehicle.get('reservations', []))} reservations")


class TestReservationStatusUpdate:
    """Test reservation status update for action modal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_reservation_for_modal(self):
        """Test getting a single reservation for action modal"""
        # First get list of reservations
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=1")
        assert resp.status_code == 200
        data = resp.json()
        
        if data["reservations"]:
            res_id = data["reservations"][0]["id"]
            # The modal uses the reservation data from the list, not a separate endpoint
            # Just verify the data has all fields needed for the modal
            res = data["reservations"][0]
            assert "user_name" in res
            assert "user_email" in res
            assert "vehicle_name" in res
            assert "status" in res
            assert "payment_status" in res
            print(f"Reservation for modal: {res_id} - {res.get('user_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
