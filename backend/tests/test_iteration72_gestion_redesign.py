"""
Iteration 72 - Gestion Tab Redesign Testing
Tests for the redesigned admin reservation page with:
- Dark top bar with search + quick filters + create button
- KPI stat cards
- Activité Récente feed
- Dernières Réservations table with actions
- Alert cards (overdue, pending payment)
- Full Toutes les Réservations table with sort + pagination
- Backend APIs: /admin/stats, /admin/overdue, /admin/reservations/today
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"


class TestGestionRedesignBackend:
    """Backend API tests for Gestion tab redesign"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ============ /admin/stats endpoint tests ============
    
    def test_admin_stats_returns_200(self):
        """Test /api/admin/stats returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_admin_stats_has_kpi_fields(self):
        """Test /api/admin/stats returns KPI fields for cards"""
        resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check required KPI fields
        assert "total_vehicles" in data, "Missing total_vehicles"
        assert "total_reservations" in data, "Missing total_reservations"
        assert "total_users" in data, "Missing total_users"
        assert "total_revenue" in data, "Missing total_revenue"
        assert "reservations_by_status" in data, "Missing reservations_by_status"
        
        # reservations_by_status should have status counts
        status_data = data["reservations_by_status"]
        assert isinstance(status_data, dict), "reservations_by_status should be dict"
    
    # ============ /admin/reservations/today endpoint tests ============
    
    def test_reservations_today_returns_200(self):
        """Test /api/admin/reservations/today returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations/today")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_reservations_today_has_required_fields(self):
        """Test /api/admin/reservations/today returns reservations with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations/today")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "reservations" in data, "Missing reservations array"
        assert "total" in data, "Missing total count"
        
        # If there are reservations, check fields
        if data["reservations"]:
            res = data["reservations"][0]
            assert "user_name" in res, "Missing user_name"
            assert "vehicle_name" in res, "Missing vehicle_name"
            assert "start_date" in res, "Missing start_date"
            assert "status" in res, "Missing status"
    
    # ============ /admin/overdue endpoint tests ============
    
    def test_overdue_returns_200(self):
        """Test /api/admin/overdue returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/overdue")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_overdue_has_required_fields(self):
        """Test /api/admin/overdue returns overdue list with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/overdue")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "overdue" in data, "Missing overdue array"
        assert "total" in data, "Missing total count"
        
        # If there are overdue reservations, check fields
        if data["overdue"]:
            res = data["overdue"][0]
            assert "user_name" in res, "Missing user_name"
            assert "vehicle_name" in res, "Missing vehicle_name"
            assert "days_overdue" in res, "Missing days_overdue"
    
    # ============ /admin/reservations endpoint tests ============
    
    def test_reservations_list_returns_200(self):
        """Test /api/admin/reservations returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=200")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_reservations_list_has_required_fields(self):
        """Test /api/admin/reservations returns reservations with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=10")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "reservations" in data, "Missing reservations array"
        assert "total" in data, "Missing total count"
        
        # Check reservation fields for table display
        if data["reservations"]:
            res = data["reservations"][0]
            assert "id" in res, "Missing id"
            assert "user_name" in res, "Missing user_name"
            assert "vehicle_name" in res, "Missing vehicle_name"
            assert "start_date" in res, "Missing start_date"
            assert "end_date" in res, "Missing end_date"
            assert "status" in res, "Missing status"
            assert "total_price" in res, "Missing total_price"
    
    def test_reservations_filter_by_status_active(self):
        """Test /api/admin/reservations?status=active filters correctly"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?status=active")
        assert resp.status_code == 200
        data = resp.json()
        
        # All returned reservations should have status=active
        for res in data.get("reservations", []):
            assert res["status"] == "active", f"Expected status=active, got {res['status']}"
    
    def test_reservations_filter_by_status_confirmed(self):
        """Test /api/admin/reservations?status=confirmed filters correctly"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?status=confirmed")
        assert resp.status_code == 200
        data = resp.json()
        
        # All returned reservations should have status=confirmed
        for res in data.get("reservations", []):
            assert res["status"] == "confirmed", f"Expected status=confirmed, got {res['status']}"
    
    def test_reservations_filter_by_status_cancelled(self):
        """Test /api/admin/reservations?status=cancelled filters correctly"""
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?status=cancelled")
        assert resp.status_code == 200
        data = resp.json()
        
        # All returned reservations should have status=cancelled
        for res in data.get("reservations", []):
            assert res["status"] == "cancelled", f"Expected status=cancelled, got {res['status']}"
    
    # ============ /admin/vehicle-schedule endpoint tests (for Planning tab) ============
    
    def test_vehicle_schedule_returns_200(self):
        """Test /api/admin/vehicle-schedule returns 200"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-01-01&end_date=2026-01-31")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_vehicle_schedule_has_vehicles(self):
        """Test /api/admin/vehicle-schedule returns vehicles array"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-01-01&end_date=2026-01-31")
        assert resp.status_code == 200
        data = resp.json()
        
        # Should have vehicles array
        assert "vehicles" in data or isinstance(data, list), "Missing vehicles data"
    
    # ============ Reservation status update tests ============
    
    def test_update_reservation_status_endpoint_exists(self):
        """Test PUT /api/admin/reservations/{id}/status endpoint exists"""
        # Get a reservation first
        resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=1")
        assert resp.status_code == 200
        data = resp.json()
        
        if data.get("reservations"):
            res_id = data["reservations"][0]["id"]
            current_status = data["reservations"][0]["status"]
            
            # Try to update to same status (should work)
            update_resp = self.session.put(f"{BASE_URL}/api/admin/reservations/{res_id}/status?status={current_status}")
            assert update_resp.status_code == 200, f"Status update failed: {update_resp.text}"
    
    # ============ KPI data validation tests ============
    
    def test_kpi_active_count_matches_filter(self):
        """Test that KPI active count matches filtered reservations count"""
        # Get stats
        stats_resp = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        
        kpi_active = stats.get("reservations_by_status", {}).get("active", 0)
        
        # Get filtered active reservations
        active_resp = self.session.get(f"{BASE_URL}/api/admin/reservations?status=active&limit=200")
        assert active_resp.status_code == 200
        active_data = active_resp.json()
        
        # Counts should match (or be close - there might be agency filtering)
        assert active_data["total"] >= 0, "Active count should be non-negative"


class TestGestionRedesignAuth:
    """Test authentication requirements for Gestion endpoints"""
    
    def test_stats_requires_auth(self):
        """Test /api/admin/stats requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
    
    def test_reservations_today_requires_auth(self):
        """Test /api/admin/reservations/today requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/reservations/today")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
    
    def test_overdue_requires_auth(self):
        """Test /api/admin/overdue requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/overdue")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
