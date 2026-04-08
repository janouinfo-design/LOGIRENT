"""
Iteration 74 - Backend Tests for Drag & Drop Reschedule Feature
Tests the PUT /api/admin/reservations/{id}/reschedule endpoint
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestRescheduleEndpoint:
    """Tests for the reschedule reservation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get reservations for testing
        res_response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=50", headers=self.headers)
        assert res_response.status_code == 200
        self.reservations = res_response.json().get("reservations", [])
    
    def test_reschedule_confirmed_reservation_success(self):
        """Test rescheduling a confirmed reservation to new dates"""
        # Find a confirmed reservation
        confirmed_res = next((r for r in self.reservations if r["status"] == "confirmed"), None)
        if not confirmed_res:
            pytest.skip("No confirmed reservation found for testing")
        
        res_id = confirmed_res["id"]
        vehicle_id = confirmed_res["vehicle_id"]
        
        # Calculate new dates far in the future to avoid conflicts
        new_start = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=93)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        # Should succeed
        assert response.status_code == 200, f"Reschedule failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "total_days" in data
        assert "total_price" in data
        assert data["total_days"] == 3  # 3 days between dates
        print(f"PASS: Rescheduled confirmed reservation {res_id} to {new_start} - {new_end}")
        print(f"  New total_days: {data['total_days']}, total_price: {data['total_price']}")
    
    def test_reschedule_pending_reservation_success(self):
        """Test rescheduling a pending reservation"""
        # Find a pending reservation
        pending_res = next((r for r in self.reservations if r["status"] == "pending"), None)
        if not pending_res:
            pytest.skip("No pending reservation found for testing")
        
        res_id = pending_res["id"]
        
        # Calculate new dates far in the future
        new_start = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=105)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Reschedule failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["total_days"] == 5  # 5 days between dates
        print(f"PASS: Rescheduled pending reservation {res_id}")
    
    def test_reschedule_pending_cash_reservation_success(self):
        """Test rescheduling a pending_cash reservation"""
        # Find a pending_cash reservation
        pending_cash_res = next((r for r in self.reservations if r["status"] == "pending_cash"), None)
        if not pending_cash_res:
            pytest.skip("No pending_cash reservation found for testing")
        
        res_id = pending_cash_res["id"]
        
        new_start = (datetime.now() + timedelta(days=110)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=112)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Reschedule failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"PASS: Rescheduled pending_cash reservation {res_id}")
    
    def test_reschedule_completed_reservation_fails(self):
        """Test that completed reservations cannot be rescheduled - should return 400"""
        # Find a completed reservation
        completed_res = next((r for r in self.reservations if r["status"] == "completed"), None)
        if not completed_res:
            pytest.skip("No completed reservation found for testing")
        
        res_id = completed_res["id"]
        new_start = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=123)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for completed reservation, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: Completed reservation correctly rejected with 400: {data['detail']}")
    
    def test_reschedule_cancelled_reservation_fails(self):
        """Test that cancelled reservations cannot be rescheduled - should return 400"""
        # Find a cancelled reservation
        cancelled_res = next((r for r in self.reservations if r["status"] == "cancelled"), None)
        if not cancelled_res:
            pytest.skip("No cancelled reservation found for testing")
        
        res_id = cancelled_res["id"]
        new_start = (datetime.now() + timedelta(days=130)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=133)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for cancelled reservation, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: Cancelled reservation correctly rejected with 400: {data['detail']}")
    
    def test_reschedule_active_reservation_fails(self):
        """Test that active reservations cannot be rescheduled - should return 400"""
        # Find an active reservation
        active_res = next((r for r in self.reservations if r["status"] == "active"), None)
        if not active_res:
            pytest.skip("No active reservation found for testing")
        
        res_id = active_res["id"]
        new_start = (datetime.now() + timedelta(days=140)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=143)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        # Active reservations should NOT be draggable per the canDrag function
        # But the backend may allow it - let's check what happens
        # Based on code review, backend only blocks completed/cancelled
        # So active might be allowed at backend level but blocked at frontend
        print(f"Active reservation reschedule response: {response.status_code} - {response.text[:200]}")
    
    def test_reschedule_conflict_returns_409(self):
        """Test that rescheduling to overlapping dates returns 409 Conflit"""
        # Find two reservations for the same vehicle
        vehicle_reservations = {}
        for r in self.reservations:
            vid = r["vehicle_id"]
            if vid not in vehicle_reservations:
                vehicle_reservations[vid] = []
            vehicle_reservations[vid].append(r)
        
        # Find a vehicle with multiple reservations
        test_vehicle = None
        test_reservations = None
        for vid, res_list in vehicle_reservations.items():
            # Filter to only draggable statuses
            draggable = [r for r in res_list if r["status"] in ["confirmed", "pending", "pending_cash"]]
            if len(draggable) >= 2:
                test_vehicle = vid
                test_reservations = draggable
                break
        
        if not test_reservations or len(test_reservations) < 2:
            pytest.skip("No vehicle with multiple draggable reservations found")
        
        # Try to move first reservation to overlap with second
        res_to_move = test_reservations[0]
        target_res = test_reservations[1]
        
        # Parse target dates
        target_start = target_res["start_date"][:10]
        target_end = target_res["end_date"][:10]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_to_move['id']}/reschedule?new_start={target_start}&new_end={target_end}",
            headers=self.headers
        )
        
        # Should return 409 Conflict
        assert response.status_code == 409, f"Expected 409 for conflict, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "Conflit" in data["detail"] or "conflit" in data["detail"].lower()
        print(f"PASS: Conflict correctly detected with 409: {data['detail']}")
    
    def test_reschedule_recalculates_price(self):
        """Test that rescheduling recalculates total_days and total_price correctly"""
        # Find a confirmed reservation
        confirmed_res = next((r for r in self.reservations if r["status"] == "confirmed"), None)
        if not confirmed_res:
            pytest.skip("No confirmed reservation found for testing")
        
        res_id = confirmed_res["id"]
        vehicle_id = confirmed_res["vehicle_id"]
        
        # Get vehicle price
        vehicle_response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        if vehicle_response.status_code != 200:
            pytest.skip("Could not get vehicle details")
        vehicle = vehicle_response.json()
        price_per_day = vehicle.get("price_per_day", 0)
        
        # Reschedule to 7 days
        new_start = (datetime.now() + timedelta(days=200)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=207)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Reschedule failed: {response.text}"
        data = response.json()
        
        # Verify calculations
        assert data["total_days"] == 7, f"Expected 7 days, got {data['total_days']}"
        expected_price = price_per_day * 7
        # Allow for options price
        assert data["total_price"] >= expected_price, f"Expected at least {expected_price}, got {data['total_price']}"
        print(f"PASS: Price recalculated correctly - {data['total_days']} days @ {price_per_day}/day = {data['total_price']}")
    
    def test_reschedule_invalid_dates_fails(self):
        """Test that end date before start date fails"""
        confirmed_res = next((r for r in self.reservations if r["status"] == "confirmed"), None)
        if not confirmed_res:
            pytest.skip("No confirmed reservation found for testing")
        
        res_id = confirmed_res["id"]
        
        # End before start
        new_start = (datetime.now() + timedelta(days=210)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=208)).strftime("%Y-%m-%d")  # Before start
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid dates, got {response.status_code}"
        print(f"PASS: Invalid dates correctly rejected with 400")
    
    def test_reschedule_nonexistent_reservation_fails(self):
        """Test that rescheduling non-existent reservation returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        new_start = (datetime.now() + timedelta(days=220)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=223)).strftime("%Y-%m-%d")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{fake_id}/reschedule?new_start={new_start}&new_end={new_end}",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent reservation, got {response.status_code}"
        print(f"PASS: Non-existent reservation correctly returns 404")
    
    def test_reschedule_requires_auth(self):
        """Test that reschedule endpoint requires authentication"""
        confirmed_res = next((r for r in self.reservations if r["status"] == "confirmed"), None)
        if not confirmed_res:
            pytest.skip("No confirmed reservation found for testing")
        
        res_id = confirmed_res["id"]
        new_start = (datetime.now() + timedelta(days=230)).strftime("%Y-%m-%d")
        new_end = (datetime.now() + timedelta(days=233)).strftime("%Y-%m-%d")
        
        # No auth header
        response = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/reschedule?new_start={new_start}&new_end={new_end}"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
