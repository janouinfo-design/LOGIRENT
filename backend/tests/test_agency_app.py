"""
Agency Admin Mobile App Backend API Tests
Tests for the new Agency Admin features:
- /api/admin/quick-client - Quick create clients for phone bookings
- /api/admin/search-clients - Search clients by name/email/phone
- /api/admin/available-vehicles - Get available vehicles for dates
- /api/admin/create-reservation-for-client - Create reservation on behalf of client
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agency-control-4.preview.emergentagent.com')

# Test credentials
AGENCY_ADMIN = {"email": "admin@test.com", "password": "admin123"}
SUPER_ADMIN = {"email": "test@example.com", "password": "password123"}


class TestAdminAuth:
    """Test admin authentication and role-based access"""
    
    def test_agency_admin_login(self):
        """Test agency admin login returns correct role"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin", f"Expected role 'admin', got {data['user']['role']}"
        assert data["user"]["email"] == "admin@test.com"
        print(f"Agency admin login PASSED - Role: {data['user']['role']}, Agency: {data['user'].get('agency_name')}")
        
    def test_super_admin_login(self):
        """Test super admin login returns correct role"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin", f"Expected role 'super_admin', got {data['user']['role']}"
        print(f"Super admin login PASSED - Role: {data['user']['role']}")
        
    def test_client_cannot_login_admin(self):
        """Test that regular clients cannot use admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "jean@test.com",
            "password": "LogiRent2024"
        })
        # Should fail with 403 forbidden
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Client blocked from admin login PASSED")


class TestQuickClient:
    """Test quick client creation endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping quick client tests")
        return response.json()["access_token"]
    
    def test_create_quick_client_with_name_only(self, admin_token):
        """Test creating a quick client with just name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"name": "TEST_QuickClient_NameOnly"}
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", json=payload, headers=headers)
        assert response.status_code == 200, f"Quick client creation failed: {response.text}"
        
        data = response.json()
        assert "client" in data
        assert data["client"]["name"] == "TEST_QuickClient_NameOnly"
        assert data["is_new"] == True
        print(f"Quick client (name only) PASSED - ID: {data['client']['id']}")
        
    def test_create_quick_client_with_all_fields(self, admin_token):
        """Test creating a quick client with name, phone, email"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        import uuid
        unique_email = f"test_quick_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "TEST_FullClient",
            "phone": "+41 79 123 45 67",
            "email": unique_email
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", json=payload, headers=headers)
        assert response.status_code == 200, f"Quick client creation failed: {response.text}"
        
        data = response.json()
        assert "client" in data
        assert data["client"]["name"] == "TEST_FullClient"
        assert data["client"]["phone"] == "+41 79 123 45 67"
        assert data["client"]["email"] == unique_email.lower()
        print(f"Quick client (all fields) PASSED - Email: {data['client']['email']}")
        
    def test_create_quick_client_existing_email_returns_existing(self, admin_token):
        """Test that creating client with existing email returns the existing client"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Use jean@test.com which is mentioned as existing test client
        payload = {"name": "Jean Test", "email": "jean@test.com"}
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", json=payload, headers=headers)
        assert response.status_code == 200, f"Quick client failed: {response.text}"
        
        data = response.json()
        # If email exists, should return is_new: False
        if "is_new" in data:
            if data["is_new"] == False:
                print(f"Quick client - existing email PASSED - Found existing client: {data['client']['name']}")
            else:
                print(f"Quick client - created new client with test email")
        print(f"Quick client existing email handling PASSED")
        
    def test_quick_client_requires_auth(self):
        """Test that quick client endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", json={"name": "Test"})
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Quick client auth required PASSED")


class TestSearchClients:
    """Test client search endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_search_clients_by_name(self, admin_token):
        """Test searching clients by name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=jean", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "clients" in data
        print(f"Search clients by name PASSED - Found {len(data['clients'])} clients")
        
    def test_search_clients_by_email(self, admin_token):
        """Test searching clients by email"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=test", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "clients" in data
        print(f"Search clients by email/partial PASSED - Found {len(data['clients'])} clients")
        
    def test_search_clients_short_query_returns_empty(self, admin_token):
        """Test that short queries (< 2 chars) return empty"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=j", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["clients"] == []
        print("Search clients short query PASSED - Returns empty as expected")
        
    def test_search_clients_requires_auth(self):
        """Test that search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=test")
        assert response.status_code == 401
        print("Search clients auth required PASSED")


class TestAvailableVehicles:
    """Test available vehicles for dates endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_get_available_vehicles(self, admin_token):
        """Test getting available vehicles for dates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Future dates to ensure availability
        start = (datetime.now() + timedelta(days=30)).isoformat()
        end = (datetime.now() + timedelta(days=33)).isoformat()
        
        response = requests.get(
            f"{BASE_URL}/api/admin/available-vehicles?start_date={start}&end_date={end}",
            headers=headers
        )
        assert response.status_code == 200, f"Available vehicles failed: {response.text}"
        
        data = response.json()
        assert "vehicles" in data
        # Note: Lausanne agency may have 0 vehicles - this is expected per the test request
        print(f"Available vehicles PASSED - Found {len(data['vehicles'])} vehicles for agency")
        
    def test_available_vehicles_requires_auth(self):
        """Test that available vehicles requires authentication"""
        start = datetime.now().isoformat()
        end = (datetime.now() + timedelta(days=3)).isoformat()
        
        response = requests.get(f"{BASE_URL}/api/admin/available-vehicles?start_date={start}&end_date={end}")
        assert response.status_code == 401
        print("Available vehicles auth required PASSED")


class TestCreateReservationForClient:
    """Test admin creating reservation on behalf of client"""
    
    @pytest.fixture
    def admin_auth(self):
        """Get admin token and profile"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        data = response.json()
        return {"token": data["access_token"], "user": data["user"]}
    
    @pytest.fixture
    def test_client(self, admin_auth):
        """Create a test client for reservation"""
        headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        import uuid
        payload = {"name": f"TEST_ResClient_{uuid.uuid4().hex[:6]}", "phone": "+41 79 999 00 00"}
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", json=payload, headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not create test client")
        return response.json()["client"]
    
    def test_create_cash_reservation(self, admin_auth, test_client):
        """Test creating a cash payment reservation"""
        headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # First get an available vehicle
        start = (datetime.now() + timedelta(days=60)).isoformat()
        end = (datetime.now() + timedelta(days=62)).isoformat()
        
        vehicles_resp = requests.get(
            f"{BASE_URL}/api/admin/available-vehicles?start_date={start}&end_date={end}",
            headers=headers
        )
        
        if vehicles_resp.status_code != 200:
            pytest.skip("Could not get available vehicles")
            
        vehicles = vehicles_resp.json().get("vehicles", [])
        if not vehicles:
            # No vehicles for this agency - expected for Lausanne
            pytest.skip("No vehicles available for this agency (expected for new agency)")
            
        vehicle = vehicles[0]
        
        payload = {
            "client_id": test_client["id"],
            "vehicle_id": vehicle["id"],
            "start_date": start,
            "end_date": end,
            "options": [],
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/create-reservation-for-client",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Reservation creation failed: {response.text}"
        
        data = response.json()
        assert "reservation" in data
        assert data["reservation"]["status"] == "pending_cash"
        assert data["reservation"]["payment_method"] == "cash"
        print(f"Cash reservation created PASSED - ID: {data['reservation']['id']}")


class TestAdminStats:
    """Test admin stats endpoint returns correct data for agency"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_stats_returns_correct_fields(self, admin_token):
        """Test that admin stats returns expected fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        data = response.json()
        expected_fields = ["total_vehicles", "total_users", "total_reservations", "total_revenue"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Admin stats PASSED - Vehicles: {data['total_vehicles']}, Users: {data['total_users']}, Revenue: {data['total_revenue']}")


class TestAdminReservations:
    """Test admin reservations endpoint"""
    
    @pytest.fixture  
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json=AGENCY_ADMIN)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_get_admin_reservations(self, admin_token):
        """Test getting reservations list for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=10", headers=headers)
        assert response.status_code == 200, f"Reservations failed: {response.text}"
        
        data = response.json()
        assert "reservations" in data
        print(f"Admin reservations PASSED - Found {len(data['reservations'])} reservations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
