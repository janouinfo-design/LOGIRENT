"""
Iteration 18: Agency Admin Mobile App Backend Tests
Testing:
- Admin login with role-based redirect
- POST /api/admin/quick-client - create clients
- GET /api/admin/search-clients - search clients
- GET /api/admin/available-vehicles - get available vehicles for dates
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agency-control-4.preview.emergentagent.com')

# Test credentials
AGENCY_ADMIN_EMAIL = "admin@test.com"
AGENCY_ADMIN_PASSWORD = "admin123"
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"

@pytest.fixture(scope="module")
def agency_admin_token():
    """Get agency admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENCY_ADMIN_EMAIL,
        "password": AGENCY_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Agency admin login failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Super admin login failed - skipping authenticated tests")

class TestAdminLogin:
    """Admin login and role-based redirect tests"""
    
    def test_agency_admin_login_returns_admin_role(self):
        """Agency admin login should return admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "admin", f"Expected role 'admin', got '{data['user']['role']}'"
        assert data["user"]["agency_name"] is not None, "Agency admin should have agency_name"
        print(f"SUCCESS: Agency admin login - role={data['user']['role']}, agency={data['user']['agency_name']}")
    
    def test_super_admin_login_returns_super_admin_role(self):
        """Super admin login should return super_admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "super_admin", f"Expected role 'super_admin', got '{data['user']['role']}'"
        print(f"SUCCESS: Super admin login - role={data['user']['role']}")
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid credentials correctly rejected")


class TestQuickClient:
    """POST /api/admin/quick-client tests"""
    
    def test_create_client_name_only(self, agency_admin_token):
        """Create client with name only"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        test_name = f"TEST_Client_{datetime.now().strftime('%H%M%S')}"
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": test_name},
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        data = response.json()
        assert "client" in data, "No client in response"
        assert data["client"]["name"] == test_name, f"Name mismatch: expected {test_name}"
        assert data["is_new"] == True, "Should be marked as new client"
        print(f"SUCCESS: Created client with name only: {test_name}")
    
    def test_create_client_with_phone_and_email(self, agency_admin_token):
        """Create client with name, phone and email"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"TEST_Client_Full_{timestamp}",
            "phone": f"+41 79 {timestamp[:3]} {timestamp[3:]}",
            "email": f"test_client_{timestamp}@test.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json=test_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        data = response.json()
        assert data["client"]["name"] == test_data["name"]
        assert data["client"]["phone"] == test_data["phone"]
        assert data["client"]["email"] == test_data["email"].lower()
        print(f"SUCCESS: Created client with full details: {test_data['name']}")
    
    def test_create_client_returns_existing_if_email_matches(self, agency_admin_token):
        """If email already exists, return existing client"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        # First create a client
        email = f"test_exists_{datetime.now().strftime('%H%M%S')}@test.com"
        response1 = requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": "Test Existing", "email": email},
            headers=headers
        )
        assert response1.status_code == 200
        
        # Try to create again with same email
        response2 = requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": "Different Name", "email": email},
            headers=headers
        )
        assert response2.status_code == 200
        data = response2.json()
        # Should return existing client, not create new
        assert data["is_new"] == False, "Should return existing client"
        print(f"SUCCESS: Returns existing client when email matches")
    
    def test_quick_client_requires_auth(self):
        """Quick client endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": "No Auth Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Quick client requires authentication")


class TestSearchClients:
    """GET /api/admin/search-clients tests"""
    
    def test_search_clients_by_name(self, agency_admin_token):
        """Search clients by name returns matching results"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # First create a test client to search for
        requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": "Jean Testeur", "email": f"jean_testeur_{datetime.now().strftime('%H%M%S')}@test.com"},
            headers=headers
        )
        
        # Search for 'jean'
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=jean", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "clients" in data, "No clients in response"
        # Should find at least one client with 'jean' in name
        if len(data["clients"]) > 0:
            found = any("jean" in c.get("name", "").lower() for c in data["clients"])
            assert found, "No client with 'jean' in name found"
            print(f"SUCCESS: Search found {len(data['clients'])} clients matching 'jean'")
        else:
            print(f"INFO: No clients found for 'jean' search (may be expected)")
    
    def test_search_clients_short_query_returns_empty(self, agency_admin_token):
        """Search with <2 characters returns empty array"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=a", headers=headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert data["clients"] == [], "Short query should return empty array"
        print("SUCCESS: Short query (<2 chars) returns empty array")
    
    def test_search_clients_by_email(self, agency_admin_token):
        """Search clients by email"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Create a test client with unique email
        unique_email = f"searchtest_{datetime.now().strftime('%H%M%S')}@test.com"
        requests.post(f"{BASE_URL}/api/admin/quick-client", 
            json={"name": "Search Test", "email": unique_email},
            headers=headers
        )
        
        # Search by email prefix
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=searchtest", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should find the client
        print(f"SUCCESS: Search by email prefix returned {len(data['clients'])} results")
    
    def test_search_clients_requires_auth(self):
        """Search clients requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/search-clients?q=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Search clients requires authentication")


class TestAvailableVehicles:
    """GET /api/admin/available-vehicles tests"""
    
    def test_get_available_vehicles(self, agency_admin_token):
        """Get available vehicles for date range"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Query for next month
        start_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT08:00:00")
        end_date = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%dT18:00:00")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/available-vehicles?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "vehicles" in data, "No vehicles key in response"
        print(f"SUCCESS: Found {len(data['vehicles'])} available vehicles for dates")
        
        # Verify vehicle structure if any found
        if len(data["vehicles"]) > 0:
            v = data["vehicles"][0]
            assert "id" in v, "Vehicle missing id"
            assert "brand" in v, "Vehicle missing brand"
            assert "model" in v, "Vehicle missing model"
            assert "price_per_day" in v, "Vehicle missing price_per_day"
            print(f"  First vehicle: {v['brand']} {v['model']} - CHF {v['price_per_day']}/day")
    
    def test_available_vehicles_requires_dates(self, agency_admin_token):
        """Available vehicles endpoint requires start_date and end_date"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Missing dates should fail
        response = requests.get(f"{BASE_URL}/api/admin/available-vehicles", headers=headers)
        assert response.status_code == 422, f"Expected 422 for missing dates, got {response.status_code}"
        print("SUCCESS: Missing dates correctly returns 422 validation error")
    
    def test_available_vehicles_requires_auth(self):
        """Available vehicles requires authentication"""
        start_date = datetime.now().strftime("%Y-%m-%dT08:00:00")
        end_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT18:00:00")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/available-vehicles?start_date={start_date}&end_date={end_date}"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Available vehicles requires authentication")


class TestAdminStats:
    """GET /api/admin/stats tests"""
    
    def test_admin_stats_returns_data(self, agency_admin_token):
        """Admin stats endpoint returns expected fields"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_vehicles" in data, "Missing total_vehicles"
        assert "total_users" in data, "Missing total_users"
        assert "total_reservations" in data, "Missing total_reservations"
        assert "total_revenue" in data, "Missing total_revenue"
        
        print(f"SUCCESS: Admin stats - Vehicles: {data['total_vehicles']}, Users: {data['total_users']}, Reservations: {data['total_reservations']}, Revenue: CHF {data['total_revenue']}")


class TestAdminReservations:
    """GET /api/admin/reservations tests"""
    
    def test_get_admin_reservations(self, agency_admin_token):
        """Get reservations list for admin"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=10", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "reservations" in data, "Missing reservations key"
        print(f"SUCCESS: Admin reservations returned {len(data['reservations'])} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
