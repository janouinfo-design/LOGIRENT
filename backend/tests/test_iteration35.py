"""
Iteration 35 Tests - Signature Canvas, Reservation Status Change, 4-Column Grid
Tests for:
1. PUT /api/admin/reservations/{id}/status - Status change API
2. Contract signature endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReservationStatusChange:
    """Test inline status change functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_reservations(self):
        """Verify reservations list endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/admin/reservations", headers=self.headers)
        assert resp.status_code == 200, f"Failed to get reservations: {resp.text}"
        data = resp.json()
        assert "reservations" in data
        assert "total" in data
        print(f"Found {data['total']} reservations")
        
    def test_status_change_to_confirmed(self):
        """Test changing reservation status to confirmed"""
        # First get a reservation
        resp = requests.get(f"{BASE_URL}/api/admin/reservations?limit=5", headers=self.headers)
        assert resp.status_code == 200
        reservations = resp.json()["reservations"]
        assert len(reservations) > 0, "No reservations found"
        
        # Find a reservation that's not already confirmed
        test_res = None
        for r in reservations:
            if r["status"] != "confirmed":
                test_res = r
                break
        
        if not test_res:
            test_res = reservations[0]  # Use first one if all are confirmed
            
        res_id = test_res["id"]
        original_status = test_res["status"]
        print(f"Testing with reservation {res_id}, original status: {original_status}")
        
        # Change status to confirmed
        status_resp = requests.put(
            f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=confirmed",
            headers=self.headers
        )
        assert status_resp.status_code == 200, f"Status change failed: {status_resp.text}"
        assert "message" in status_resp.json()
        print(f"Status change response: {status_resp.json()}")
        
    def test_status_change_to_active(self):
        """Test changing reservation status to active"""
        # Get a reservation
        resp = requests.get(f"{BASE_URL}/api/admin/reservations?limit=5", headers=self.headers)
        assert resp.status_code == 200
        reservations = resp.json()["reservations"]
        
        if len(reservations) > 0:
            res_id = reservations[0]["id"]
            
            # Change to active
            status_resp = requests.put(
                f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=active",
                headers=self.headers
            )
            assert status_resp.status_code == 200
            print(f"Changed to active: {status_resp.json()}")
            
    def test_status_change_to_completed(self):
        """Test changing reservation status to completed"""
        resp = requests.get(f"{BASE_URL}/api/admin/reservations?limit=5", headers=self.headers)
        assert resp.status_code == 200
        reservations = resp.json()["reservations"]
        
        if len(reservations) > 0:
            res_id = reservations[0]["id"]
            
            status_resp = requests.put(
                f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=completed",
                headers=self.headers
            )
            assert status_resp.status_code == 200
            print(f"Changed to completed: {status_resp.json()}")
            
    def test_status_change_to_cancelled(self):
        """Test changing reservation status to cancelled"""
        resp = requests.get(f"{BASE_URL}/api/admin/reservations?limit=5", headers=self.headers)
        assert resp.status_code == 200
        reservations = resp.json()["reservations"]
        
        if len(reservations) > 1:
            res_id = reservations[1]["id"]  # Use second reservation to avoid conflicts
            
            status_resp = requests.put(
                f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=cancelled",
                headers=self.headers
            )
            assert status_resp.status_code == 200
            print(f"Changed to cancelled: {status_resp.json()}")
            
    def test_invalid_status(self):
        """Test that invalid status returns error"""
        resp = requests.get(f"{BASE_URL}/api/admin/reservations?limit=1", headers=self.headers)
        assert resp.status_code == 200
        reservations = resp.json()["reservations"]
        
        if len(reservations) > 0:
            res_id = reservations[0]["id"]
            
            status_resp = requests.put(
                f"{BASE_URL}/api/admin/reservations/{res_id}/status?status=invalid_status",
                headers=self.headers
            )
            assert status_resp.status_code == 400, "Should reject invalid status"
            print(f"Invalid status rejected correctly: {status_resp.json()}")


class TestContractSignature:
    """Test contract signature endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_contract(self):
        """Test getting contract by ID"""
        contract_id = "782f06d8-61b9-45b9-834b-561d04c9e680"
        resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
        
        # Contract may or may not exist
        if resp.status_code == 200:
            data = resp.json()
            assert "id" in data
            assert "status" in data
            assert "contract_data" in data
            print(f"Contract found: ID={data['id']}, status={data['status']}")
        else:
            print(f"Contract not found (expected for some test cases): {resp.status_code}")
            
    def test_contract_sign_endpoint_exists(self):
        """Verify contract sign endpoint exists"""
        contract_id = "782f06d8-61b9-45b9-834b-561d04c9e680"
        # Just verify the endpoint pattern exists - actual signing requires valid signature
        resp = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/sign",
            headers=self.headers,
            json={"signature_data": "data:image/png;base64,test"}
        )
        # Should not be 404 (endpoint exists)
        assert resp.status_code != 404, "Sign endpoint should exist"
        print(f"Sign endpoint response: {resp.status_code}")


class TestVehicleSchedule:
    """Test vehicle schedule endpoint for planning view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_vehicle_schedule(self):
        """Test vehicle schedule endpoint for Gantt chart"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-03-01&end_date=2026-03-31",
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed to get schedule: {resp.text}"
        data = resp.json()
        
        # Should return vehicles with reservations
        assert "vehicles" in data or isinstance(data, list)
        vehicles = data.get("vehicles", data)
        print(f"Schedule returned {len(vehicles)} vehicles")
        
        # Each vehicle should have reservations array
        for v in vehicles[:3]:
            assert "id" in v
            assert "brand" in v
            assert "reservations" in v
            print(f"Vehicle {v['brand']} {v.get('model', '')} has {len(v['reservations'])} reservations")
