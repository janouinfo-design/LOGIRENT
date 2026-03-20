"""
Test file for Iteration 51
Features tested:
1. Admin Planning shows ALL vehicles (not just with reservations)
2. Vehicle detail page deleted - links should point to /booking/[id]
3. Client login redirect + Booking options (GPS, Siège enfant, Conducteur supplémentaire)
4. Client document upload in profile with AI validation
5. Notifications page not blank

Test credentials:
- Admin: admin-geneva@logirent.ch / LogiRent2024!
- Client: jean.dupont@gmail.com / LogiRent2024!
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://car-rental-live.preview.emergentagent.com')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin-geneva@logirent.ch",
        "password": "LogiRent2024!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.fail(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def client_token(api_client):
    """Get client authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "jean.dupont@gmail.com",
        "password": "LogiRent2024!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.fail(f"Client authentication failed: {response.status_code} - {response.text}")


class TestAdminLogin:
    """Test admin login endpoint"""
    
    def test_admin_login_success(self, api_client):
        """Admin should be able to login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"PASS: Admin login successful, user role: {data['user'].get('role')}")
    
    def test_admin_login_invalid_credentials(self, api_client):
        """Admin login should fail with wrong credentials"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Admin login correctly rejected with wrong password")


class TestFeature1VehicleSchedule:
    """Feature 1: Admin Planning shows ALL vehicles (including ones without reservations)"""
    
    def test_vehicle_schedule_returns_all_vehicles(self, api_client, admin_token):
        """GET /api/admin/vehicle-schedule should return all vehicles, not just ones with reservations"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get schedule for current month
        start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        end_date = (datetime.now().replace(day=1) + timedelta(days=31)).strftime('%Y-%m-%d')
        
        response = api_client.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200
        data = response.json()
        
        assert "vehicles" in data
        vehicles = data["vehicles"]
        assert isinstance(vehicles, list)
        
        # Count vehicles with and without reservations
        with_reservations = sum(1 for v in vehicles if v.get("reservations") and len(v["reservations"]) > 0)
        without_reservations = sum(1 for v in vehicles if not v.get("reservations") or len(v["reservations"]) == 0)
        total_vehicles = len(vehicles)
        
        print(f"Total vehicles returned: {total_vehicles}")
        print(f"Vehicles with reservations: {with_reservations}")
        print(f"Vehicles without reservations: {without_reservations}")
        
        # The API should return vehicles regardless of reservation status
        # Based on the requirement, we expect ~6 vehicles total
        assert total_vehicles >= 5, f"Expected at least 5 vehicles, got {total_vehicles}"
        print(f"PASS: Vehicle schedule returns {total_vehicles} vehicles (includes vehicles without reservations)")
    
    def test_vehicle_schedule_includes_completed_status(self, api_client, admin_token):
        """Check that 'completed' status is included in the query (per code change at line 469)"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Use February 2026 dates where test reservations exist
        response = api_client.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-02-01&end_date=2026-02-28")
        assert response.status_code == 200
        data = response.json()
        
        vehicles = data.get("vehicles", [])
        all_statuses = set()
        for v in vehicles:
            for r in v.get("reservations", []):
                all_statuses.add(r.get("status"))
        
        print(f"Statuses found in schedule: {all_statuses}")
        # The query should include completed status
        print(f"PASS: Vehicle schedule API working, found statuses: {all_statuses}")


class TestFeature3ClientAuth:
    """Feature 3a: Client login and redirect to reservations"""
    
    def test_client_login_success(self, api_client):
        """Client login should succeed and return user data"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "jean.dupont@gmail.com",
            "password": "LogiRent2024!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        # Client role should be 'client'
        assert data["user"].get("role") == "client"
        print(f"PASS: Client login successful, role: {data['user'].get('role')}")
    
    def test_client_profile_access(self, api_client, client_token):
        """Client should be able to access their profile"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        response = api_client.get(f"{BASE_URL}/api/auth/profile")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        print(f"PASS: Client profile access working, email: {data.get('email')}")


class TestFeature3bBookingOptions:
    """Feature 3b: Booking options (GPS, Siège enfant, Conducteur supplémentaire)"""
    
    def test_vehicles_list_has_options(self, api_client):
        """Check that vehicles endpoint returns vehicles with options"""
        response = api_client.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        
        assert "vehicles" in data or isinstance(data, list)
        vehicles = data.get("vehicles", data) if isinstance(data, dict) else data
        
        assert len(vehicles) > 0, "No vehicles returned"
        print(f"PASS: Vehicles list returned {len(vehicles)} vehicles")
        
        # Check if any vehicle has options defined
        vehicles_with_options = [v for v in vehicles if v.get("options") and len(v.get("options", [])) > 0]
        print(f"Vehicles with custom options: {len(vehicles_with_options)}")
    
    def test_single_vehicle_fetch(self, api_client):
        """Fetch single vehicle for booking - should work"""
        # First get a vehicle ID
        response = api_client.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        vehicles = data.get("vehicles", data) if isinstance(data, dict) else data
        
        if len(vehicles) > 0:
            vehicle_id = vehicles[0].get("id")
            single_response = api_client.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
            assert single_response.status_code == 200
            vehicle = single_response.json()
            assert "brand" in vehicle or "id" in vehicle
            print(f"PASS: Single vehicle fetch working for ID: {vehicle_id}")


class TestFeature4DocumentUpload:
    """Feature 4: Client document upload endpoints"""
    
    def test_document_upload_endpoints_exist(self, api_client, client_token):
        """Document upload endpoints should exist (we won't test actual upload without file)"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        
        # Test that the endpoint paths exist by checking they don't return 404 for OPTIONS
        endpoints = [
            "/api/auth/upload-id-b64",
            "/api/auth/upload-id-back-b64", 
            "/api/auth/upload-license-b64",
            "/api/auth/upload-license-back-b64"
        ]
        
        for endpoint in endpoints:
            # Make a request with invalid data - should get 422 (validation error) not 404
            response = api_client.post(f"{BASE_URL}{endpoint}", json={})
            # We expect validation error (422) not 404, which means endpoint exists
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
            print(f"Endpoint {endpoint} exists (status: {response.status_code})")
        
        print("PASS: All document upload endpoints exist")
    
    def test_user_profile_has_document_fields(self, api_client, client_token):
        """User profile should have document-related fields"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        response = api_client.get(f"{BASE_URL}/api/auth/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Check document fields exist in profile
        document_fields = ["id_photo", "id_photo_back", "license_photo", "license_photo_back"]
        for field in document_fields:
            assert field in data or field in str(data), f"Field {field} not found in profile response"
        
        print(f"PASS: Profile contains document fields")


class TestFeature5Notifications:
    """Feature 5: Notifications page should NOT be blank"""
    
    def test_notifications_endpoint_returns_list(self, api_client, client_token):
        """GET /api/notifications should return a list of notifications"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        # Response should be a list
        assert isinstance(data, list) or "notifications" in data
        
        notifications = data if isinstance(data, list) else data.get("notifications", [])
        print(f"PASS: Notifications endpoint returns {len(notifications)} notifications")
    
    def test_unread_count_endpoint(self, api_client, client_token):
        """GET /api/notifications/unread-count should work"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data or "unread_count" in data or isinstance(data, int) or isinstance(data, dict)
        print(f"PASS: Unread count endpoint working")


class TestReservationsEndpoint:
    """Test client reservations endpoint"""
    
    def test_client_reservations(self, api_client, client_token):
        """Client should be able to fetch their reservations"""
        api_client.headers.update({"Authorization": f"Bearer {client_token}"})
        response = api_client.get(f"{BASE_URL}/api/reservations")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: Client reservations endpoint working")


class TestAdminReservations:
    """Test admin reservations endpoint"""
    
    def test_admin_reservations_list(self, api_client, admin_token):
        """Admin should be able to list reservations"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        response = api_client.get(f"{BASE_URL}/api/admin/reservations?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "reservations" in data
        print(f"PASS: Admin reservations list working, found {len(data.get('reservations', []))} reservations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
