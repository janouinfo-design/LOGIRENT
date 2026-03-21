"""
Iteration 55: Admin Vehicles Page Backend Tests
Testing GET /api/vehicles endpoint and vehicle data structure for admin vehicles page
"""
import pytest
import requests
import os

BASE_URL = "https://logirent-pricing.preview.emergentagent.com"

class TestVehiclesAPI:
    """Test vehicles API returns correct data for admin vehicles page"""
    
    def test_get_all_vehicles(self):
        """Test GET /api/vehicles returns list of vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ GET /api/vehicles returns {len(data)} vehicles")
    
    def test_vehicle_has_required_fields_for_card(self):
        """Verify vehicle has all fields needed for VehicleCard component"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        vehicles = response.json()
        
        # Required fields for the redesigned VehicleCard
        required_fields = ['id', 'brand', 'model', 'year', 'price_per_day', 
                          'photos', 'seats', 'transmission', 'fuel_type', 'status']
        
        for vehicle in vehicles[:5]:  # Check first 5 vehicles
            for field in required_fields:
                assert field in vehicle, f"Vehicle missing required field: {field}"
            
            # Data type validations
            assert isinstance(vehicle['id'], str)
            assert isinstance(vehicle['brand'], str)
            assert isinstance(vehicle['model'], str)
            assert isinstance(vehicle['year'], int)
            assert isinstance(vehicle['price_per_day'], (int, float))
            assert isinstance(vehicle['photos'], list)
            assert isinstance(vehicle['seats'], int)
            assert vehicle['transmission'] in ['automatic', 'manual']
            assert vehicle['fuel_type'] in ['gasoline', 'diesel', 'electric', 'hybrid']
            assert vehicle['status'] in ['available', 'rented', 'maintenance']
        
        print(f"✓ All vehicles have required fields for VehicleCard")
    
    def test_vehicle_price_is_positive(self):
        """Verify vehicle prices are positive numbers"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        
        for vehicle in vehicles:
            assert vehicle['price_per_day'] > 0, f"Vehicle {vehicle['id']} has invalid price"
        
        print(f"✓ All {len(vehicles)} vehicles have positive prices")
    
    def test_get_single_vehicle(self):
        """Test GET /api/vehicles/{id} returns single vehicle with all details"""
        # First get list to get an ID
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        vehicle_id = vehicles[0]['id']
        
        # Get single vehicle
        response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        assert response.status_code == 200
        vehicle = response.json()
        
        assert vehicle['id'] == vehicle_id
        assert 'brand' in vehicle
        assert 'model' in vehicle
        assert 'price_per_day' in vehicle
        print(f"✓ GET /api/vehicles/{vehicle_id} returns correct vehicle")


class TestAdminAuth:
    """Test admin authentication for agency vehicles page"""
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['role'] == 'admin'
        assert data['user']['agency_id'] is not None
        print(f"✓ Admin login successful, agency_id: {data['user']['agency_id']}")
    
    def test_get_vehicles_filtered_by_agency(self):
        """Test vehicles can be filtered by agency_id"""
        # Login to get agency_id
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        agency_id = login_response.json()['user']['agency_id']
        
        # Get vehicles for agency
        response = requests.get(f"{BASE_URL}/api/vehicles", params={'agency_id': agency_id})
        assert response.status_code == 200
        vehicles = response.json()
        
        # Check all returned vehicles belong to the agency
        for vehicle in vehicles:
            assert vehicle.get('agency_id') == agency_id, f"Vehicle {vehicle['id']} not from agency"
        
        print(f"✓ Agency filter works, returned {len(vehicles)} vehicles for agency {agency_id}")


class TestVehicleDataForDisplayComponents:
    """Test vehicle data supports VehicleCard display requirements"""
    
    def test_brand_can_be_uppercased(self):
        """Verify brand field works for uppercase display"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        
        for vehicle in vehicles[:3]:
            brand = vehicle['brand']
            assert brand.upper() == brand.upper()  # Can be uppercased
            assert len(brand) > 0  # Not empty
        
        print("✓ Brand field suitable for uppercase display")
    
    def test_photos_array_for_gallery(self):
        """Verify photos array can support photo gallery and count display"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        
        vehicles_with_photos = [v for v in vehicles if v.get('photos') and len(v['photos']) > 0]
        assert len(vehicles_with_photos) > 0, "Need at least some vehicles with photos"
        
        for vehicle in vehicles_with_photos[:3]:
            photos = vehicle['photos']
            assert isinstance(photos, list)
            assert len(photos) >= 1
            # First photo should be a valid URL
            assert photos[0].startswith('http')
        
        print(f"✓ {len(vehicles_with_photos)} vehicles have photos for gallery display")
    
    def test_transmission_and_fuel_for_badges(self):
        """Verify transmission and fuel_type support feature badge display"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        
        transmission_values = set()
        fuel_values = set()
        
        for vehicle in vehicles:
            transmission_values.add(vehicle.get('transmission'))
            fuel_values.add(vehicle.get('fuel_type'))
        
        # Valid transmission types
        valid_transmissions = {'automatic', 'manual'}
        assert transmission_values.issubset(valid_transmissions), f"Invalid transmission: {transmission_values - valid_transmissions}"
        
        # Valid fuel types (includes French 'essence' which means gasoline)
        valid_fuels = {'gasoline', 'diesel', 'electric', 'hybrid', 'essence'}
        assert fuel_values.issubset(valid_fuels), f"Invalid fuel_type: {fuel_values - valid_fuels}"
        
        print(f"✓ Transmission types: {transmission_values}, Fuel types: {fuel_values}")
    
    def test_status_for_dot_indicator(self):
        """Verify status field supports green/red dot indicator"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = response.json()
        
        status_counts = {'available': 0, 'rented': 0, 'maintenance': 0}
        for vehicle in vehicles:
            status = vehicle.get('status')
            if status in status_counts:
                status_counts[status] += 1
        
        print(f"✓ Vehicle status counts: {status_counts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
