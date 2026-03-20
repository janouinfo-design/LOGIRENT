"""
Iteration 54: Backend API Tests for Homepage Layout Update
Tests the GET /api/vehicles endpoint and category filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVehiclesAPI:
    """Test vehicles endpoint for homepage display"""
    
    def test_get_all_vehicles(self):
        """GET /api/vehicles returns all vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        vehicles = response.json()
        assert isinstance(vehicles, list), "Response should be a list"
        assert len(vehicles) > 0, "Should have at least one vehicle"
        
        # Verify vehicle structure
        vehicle = vehicles[0]
        required_fields = ['id', 'brand', 'model', 'year', 'type', 'price_per_day', 'photos', 'seats', 'transmission', 'fuel_type', 'status']
        for field in required_fields:
            assert field in vehicle, f"Vehicle missing required field: {field}"
        
        print(f"SUCCESS: GET /api/vehicles returned {len(vehicles)} vehicles")
    
    def test_vehicle_has_correct_data_types(self):
        """Verify vehicle data types for frontend display"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        
        vehicles = response.json()
        vehicle = vehicles[0]
        
        # Data type assertions
        assert isinstance(vehicle['id'], str), "ID should be string"
        assert isinstance(vehicle['brand'], str), "Brand should be string"
        assert isinstance(vehicle['model'], str), "Model should be string"
        assert isinstance(vehicle['year'], int), "Year should be int"
        assert isinstance(vehicle['price_per_day'], (int, float)), "Price should be numeric"
        assert isinstance(vehicle['photos'], list), "Photos should be list"
        assert isinstance(vehicle['seats'], int), "Seats should be int"
        
        print("SUCCESS: Vehicle data types are correct")
    
    def test_filter_by_type_suv(self):
        """GET /api/vehicles?type=SUV filters correctly"""
        response = requests.get(f"{BASE_URL}/api/vehicles?type=SUV")
        
        assert response.status_code == 200
        
        vehicles = response.json()
        assert isinstance(vehicles, list)
        
        # All returned vehicles should be SUV type
        for v in vehicles:
            assert v['type'] == 'SUV', f"Expected SUV type, got {v['type']}"
        
        print(f"SUCCESS: SUV filter returned {len(vehicles)} SUVs")
    
    def test_filter_by_type_berline(self):
        """GET /api/vehicles?type=berline filters correctly"""
        response = requests.get(f"{BASE_URL}/api/vehicles?type=berline")
        
        assert response.status_code == 200
        
        vehicles = response.json()
        
        for v in vehicles:
            assert v['type'] == 'berline', f"Expected berline type, got {v['type']}"
        
        print(f"SUCCESS: Berline filter returned {len(vehicles)} vehicles")
    
    def test_filter_by_type_citadine(self):
        """GET /api/vehicles?type=citadine filters correctly"""
        response = requests.get(f"{BASE_URL}/api/vehicles?type=citadine")
        
        assert response.status_code == 200
        
        vehicles = response.json()
        
        for v in vehicles:
            assert v['type'] == 'citadine', f"Expected citadine type, got {v['type']}"
        
        print(f"SUCCESS: Citadine filter returned {len(vehicles)} vehicles")
    
    def test_filter_by_type_utilitaire(self):
        """GET /api/vehicles?type=utilitaire filters correctly"""
        response = requests.get(f"{BASE_URL}/api/vehicles?type=utilitaire")
        
        assert response.status_code == 200
        
        vehicles = response.json()
        
        for v in vehicles:
            assert v['type'] == 'utilitaire', f"Expected utilitaire type, got {v['type']}"
        
        print(f"SUCCESS: Utilitaire filter returned {len(vehicles)} vehicles")
    
    def test_get_single_vehicle(self):
        """GET /api/vehicles/{id} returns single vehicle for booking page"""
        # First get a vehicle ID
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        vehicle_id = vehicles[0]['id']
        
        # Get single vehicle
        response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        vehicle = response.json()
        assert vehicle['id'] == vehicle_id
        assert 'options' in vehicle, "Vehicle should have options for booking"
        
        print(f"SUCCESS: GET /api/vehicles/{vehicle_id} returned vehicle details")


class TestAuthAPI:
    """Test authentication for logged-in user experience"""
    
    def test_login_client(self):
        """POST /api/auth/login with client credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "jean.dupont@gmail.com",
            "password": "LogiRent2024!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'access_token' in data, "Response should have access_token"
        assert 'user' in data, "Response should have user"
        assert data['user']['email'] == 'jean.dupont@gmail.com'
        
        print("SUCCESS: Client login works correctly")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("SUCCESS: Invalid login returns 401")


class TestReservationsAPI:
    """Test reservations endpoint (used after clicking Détails -> booking)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "jean.dupont@gmail.com",
            "password": "LogiRent2024!"
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        pytest.skip("Authentication failed")
    
    def test_get_user_reservations(self, auth_token):
        """GET /api/reservations returns user's reservations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reservations", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        reservations = response.json()
        assert isinstance(reservations, list)
        
        print(f"SUCCESS: GET /api/reservations returned {len(reservations)} reservations")
    
    def test_reservations_require_auth(self):
        """GET /api/reservations without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/reservations")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("SUCCESS: Reservations endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
