"""
Test cases for the Add Vehicle Modal fix.
Validates POST /api/admin/vehicles endpoint works correctly after fixing 
the status and documents default values issue.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://deploy-local-db.preview.emergentagent.com')


class TestAddVehicleEndpoint:
    """Tests for POST /api/admin/vehicles endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Return headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        }
    
    def test_admin_login_success(self, admin_token):
        """Verify admin login works and returns token"""
        assert admin_token is not None
        assert len(admin_token) > 50
        print(f"Admin login successful, token length: {len(admin_token)}")
    
    def test_create_vehicle_minimal_fields(self, auth_headers):
        """Test creating vehicle with only required fields - this was the bug fix"""
        unique_id = str(uuid.uuid4())[:8]
        vehicle_data = {
            "brand": f"TEST_Brand_{unique_id}",
            "model": f"Model_{unique_id}",
            "year": 2024,
            "type": "sedan",
            "price_per_day": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles",
            json=vehicle_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create vehicle failed: {response.text}"
        
        data = response.json()
        assert data["brand"] == vehicle_data["brand"]
        assert data["model"] == vehicle_data["model"]
        assert data["year"] == 2024
        assert data["price_per_day"] == 100
        
        # Key assertions - these were the bug fixes
        assert data["status"] == "available", "Default status should be 'available'"
        assert data["documents"] == [], "Default documents should be empty list"
        assert "id" in data
        assert data["agency_id"] is not None
        
        print(f"Vehicle created successfully: {data['id']}")
        return data["id"]
    
    def test_create_vehicle_all_fields(self, auth_headers):
        """Test creating vehicle with all optional fields"""
        unique_id = str(uuid.uuid4())[:8]
        vehicle_data = {
            "brand": f"TEST_AllFields_{unique_id}",
            "model": f"Model_{unique_id}",
            "year": 2024,
            "type": "suv",
            "price_per_day": 150,
            "seats": 7,
            "transmission": "automatic",
            "fuel_type": "hybrid",
            "plate_number": f"GE-TEST-{unique_id}",
            "color": "Silver",
            "location": "Zurich",
            "description": "Test vehicle with all fields"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles",
            json=vehicle_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create vehicle failed: {response.text}"
        
        data = response.json()
        assert data["brand"] == vehicle_data["brand"]
        assert data["seats"] == 7
        assert data["transmission"] == "automatic"
        assert data["fuel_type"] == "hybrid"
        assert data["plate_number"] == vehicle_data["plate_number"]
        assert data["color"] == "Silver"
        assert data["location"] == "Zurich"
        assert data["status"] == "available"
        assert data["documents"] == []
        
        print(f"Vehicle with all fields created: {data['id']}")
    
    def test_create_vehicle_unauthorized(self):
        """Test that creating vehicle without auth fails"""
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles",
            json={"brand": "Unauthorized", "model": "Test", "year": 2024, "type": "sedan", "price_per_day": 100},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401 or response.status_code == 403
        print("Unauthorized create vehicle correctly rejected")
    
    def test_get_vehicles_list(self, auth_headers):
        """Test getting vehicles list"""
        response = requests.get(
            f"{BASE_URL}/api/vehicles",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} vehicles")
    
    def test_get_single_vehicle(self, auth_headers):
        """Test getting a single vehicle by ID"""
        # First get list to find a vehicle ID
        list_response = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        vehicles = list_response.json()
        
        if vehicles:
            vehicle_id = vehicles[0]["id"]
            response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}", headers=auth_headers)
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == vehicle_id
            print(f"Got vehicle: {data['brand']} {data['model']}")
    
    def test_update_vehicle(self, auth_headers):
        """Test updating a vehicle"""
        # Create a test vehicle first
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/admin/vehicles",
            json={
                "brand": f"TEST_Update_{unique_id}",
                "model": "ToUpdate",
                "year": 2024,
                "type": "sedan",
                "price_per_day": 100
            },
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        vehicle_id = create_response.json()["id"]
        
        # Update the vehicle
        update_response = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}",
            json={
                "brand": f"TEST_Update_{unique_id}",
                "model": "Updated",
                "year": 2024,
                "type": "sedan",
                "price_per_day": 120,
                "status": "maintenance"
            },
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["model"] == "Updated"
        assert data["price_per_day"] == 120
        assert data["status"] == "maintenance"
        print(f"Vehicle updated successfully: {vehicle_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
