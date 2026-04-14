"""
Test suite for Vehicle Availability Calendar API
Tests the GET /api/vehicles/{vehicle_id}/availability endpoint
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test vehicle ID (Toyota Yaris Hybrid)
TEST_VEHICLE_ID = "fd354ff5-2aa6-421d-86f0-94016b1b1669"


class TestVehicleAvailabilityAPI:
    """Tests for vehicle availability endpoint"""
    
    def test_availability_endpoint_returns_200(self):
        """Test that availability endpoint returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Availability endpoint returns 200")
    
    def test_availability_response_structure(self):
        """Test that response contains required fields: booked_dates and reservations"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        data = response.json()
        
        assert "booked_dates" in data, "Response missing 'booked_dates' field"
        assert "reservations" in data, "Response missing 'reservations' field"
        assert isinstance(data["booked_dates"], list), "booked_dates should be a list"
        assert isinstance(data["reservations"], list), "reservations should be a list"
        print(f"PASS: Response structure is correct")
    
    def test_booked_dates_format(self):
        """Test that booked_dates are in YYYY-MM-DD format"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        data = response.json()
        
        for date_str in data["booked_dates"]:
            # Validate date format
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pytest.fail(f"Invalid date format: {date_str}, expected YYYY-MM-DD")
        print(f"PASS: All booked_dates are in correct format")
    
    def test_reservations_structure(self):
        """Test that reservations contain start_date, end_date, and status"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        data = response.json()
        
        for reservation in data["reservations"]:
            assert "start_date" in reservation, "Reservation missing 'start_date'"
            assert "end_date" in reservation, "Reservation missing 'end_date'"
            assert "status" in reservation, "Reservation missing 'status'"
        print(f"PASS: Reservations have correct structure")
    
    def test_april_2026_has_reservations(self):
        """Test that April 2026 has expected reservations (based on seed data)"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        data = response.json()
        
        # Should have booked dates
        assert len(data["booked_dates"]) > 0, "Expected booked dates in April 2026"
        
        # Should have reservations
        assert len(data["reservations"]) > 0, "Expected reservations in April 2026"
        
        # Verify specific booked dates (Apr 4-10 and Apr 20-22 based on API response)
        expected_booked = ["2026-04-04", "2026-04-05", "2026-04-06", "2026-04-07", 
                          "2026-04-08", "2026-04-09", "2026-04-10", 
                          "2026-04-20", "2026-04-21", "2026-04-22"]
        
        for date in expected_booked:
            assert date in data["booked_dates"], f"Expected {date} to be booked"
        
        print(f"PASS: April 2026 has expected reservations")
    
    def test_reservation_status_values(self):
        """Test that reservation status is a valid value"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=4&year=2026")
        data = response.json()
        
        valid_statuses = ["confirmed", "active", "pending", "pending_cash"]
        
        for reservation in data["reservations"]:
            assert reservation["status"] in valid_statuses, f"Invalid status: {reservation['status']}"
        
        print(f"PASS: All reservation statuses are valid")
    
    def test_availability_with_default_month(self):
        """Test availability endpoint without month/year parameters (uses current month)"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "booked_dates" in data
        assert "reservations" in data
        print(f"PASS: Default month/year works correctly")
    
    def test_availability_invalid_vehicle_id(self):
        """Test availability endpoint with invalid vehicle ID"""
        response = requests.get(f"{BASE_URL}/api/vehicles/invalid-vehicle-id/availability?month=4&year=2026")
        # Should return empty arrays for non-existent vehicle (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["booked_dates"] == [], "Expected empty booked_dates for invalid vehicle"
        assert data["reservations"] == [], "Expected empty reservations for invalid vehicle"
        print(f"PASS: Invalid vehicle ID returns empty arrays")
    
    def test_availability_future_month(self):
        """Test availability for a future month with no reservations"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}/availability?month=12&year=2027")
        assert response.status_code == 200
        
        data = response.json()
        # Future month should have empty or minimal reservations
        assert isinstance(data["booked_dates"], list)
        assert isinstance(data["reservations"], list)
        print(f"PASS: Future month availability works")


class TestVehicleDetailAPI:
    """Tests for vehicle detail endpoint"""
    
    def test_vehicle_detail_returns_200(self):
        """Test that vehicle detail endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Vehicle detail returns 200")
    
    def test_vehicle_detail_structure(self):
        """Test that vehicle detail contains required fields"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}")
        data = response.json()
        
        required_fields = ["id", "brand", "model", "price_per_day"]
        for field in required_fields:
            assert field in data, f"Vehicle missing '{field}' field"
        
        # Verify it's the Toyota Yaris Hybrid
        assert data["brand"] == "Toyota", f"Expected Toyota, got {data['brand']}"
        assert "Yaris" in data["model"], f"Expected Yaris in model, got {data['model']}"
        print(f"PASS: Vehicle detail has correct structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
