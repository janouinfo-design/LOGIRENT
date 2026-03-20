"""
Test suite for Agency Slug URLs feature
Tests: Agency public endpoint, registration with agency_id, vehicle filtering by agency
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wonderful-franklin-2.preview.emergentagent.com').rstrip('/')

# Known test data
LOGIRENT_GENEVA_ID = "63683791-8741-445a-be42-9e74861bee89"
LOGIRENT_GENEVA_SLUG = "logirent-geneva"


class TestPublicAgencyEndpoint:
    """Tests for GET /api/public/agency/{slug}"""
    
    def test_agency_by_valid_slug(self):
        """Test 4: GET /api/public/agency/logirent-geneva returns agency data with slug"""
        response = requests.get(f"{BASE_URL}/api/public/agency/{LOGIRENT_GENEVA_SLUG}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Agency should have id"
        assert "name" in data, "Agency should have name"
        assert "slug" in data, "Agency should have slug"
        assert data["slug"] == LOGIRENT_GENEVA_SLUG, f"Slug should be {LOGIRENT_GENEVA_SLUG}"
        assert data["name"] == "LogiRent Geneva", "Name should be LogiRent Geneva"
        assert "vehicle_count" in data, "Agency should have vehicle_count"
        assert isinstance(data["vehicle_count"], int), "vehicle_count should be integer"
        print(f"PASS: Agency {data['name']} has {data['vehicle_count']} vehicles")
    
    def test_agency_nonexistent_slug(self):
        """Test 5: GET /api/public/agency/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/agency/nonexistent-slug-that-does-not-exist")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"PASS: Nonexistent slug returns 404 with message: {data['detail']}")


class TestRegisterWithAgencyId:
    """Tests for POST /api/auth/register with agency_id"""
    
    def test_register_with_valid_agency_id(self):
        """Test 6: POST /api/auth/register with agency_id creates user bound to agency"""
        # Generate unique email
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"test-agency-reg-{random_suffix}@test.com"
        
        payload = {
            "email": test_email,
            "password": "test1234",
            "name": "Test Agency User",
            "agency_id": LOGIRENT_GENEVA_ID
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "access_token" in data, "Should return access_token"
        assert "user" in data, "Should return user object"
        
        user = data["user"]
        assert user["email"] == test_email.lower(), "Email should match"
        assert user["agency_id"] == LOGIRENT_GENEVA_ID, "User should be bound to agency"
        assert user["agency_name"] == "LogiRent Geneva", "Agency name should be resolved"
        print(f"PASS: User {test_email} registered and bound to {user['agency_name']}")
    
    def test_register_with_invalid_agency_id(self):
        """Test registration with invalid agency_id should fail"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"test-invalid-agency-{random_suffix}@test.com"
        
        payload = {
            "email": test_email,
            "password": "test1234",
            "name": "Test User",
            "agency_id": "invalid-agency-id-that-does-not-exist"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Should return 400 for invalid agency
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Invalid agency_id returns 400")


class TestVehicleFilterByAgency:
    """Tests for vehicle filtering by agency_id"""
    
    def test_vehicles_filtered_by_agency(self):
        """Test 3: Vehicles filtered by agency_id returns only agency's vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles?agency_id={LOGIRENT_GENEVA_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        vehicles = response.json()
        assert isinstance(vehicles, list), "Should return list of vehicles"
        
        # Check all vehicles belong to the agency
        for vehicle in vehicles:
            assert vehicle.get("agency_id") == LOGIRENT_GENEVA_ID, f"Vehicle {vehicle['id']} should belong to agency"
        
        print(f"PASS: {len(vehicles)} vehicles returned for LogiRent Geneva")


class TestAgenciesListWithSlugs:
    """Tests for agencies list with slugs"""
    
    def test_agencies_have_slugs(self):
        """Test that all agencies have slug field (requires auth)"""
        # Login as super admin
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as super admin")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/agencies", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        agencies = response.json()
        assert len(agencies) > 0, "Should have at least one agency"
        
        for agency in agencies:
            assert "slug" in agency or agency.get("slug"), f"Agency {agency.get('name')} should have slug"
        
        print(f"PASS: {len(agencies)} agencies all have slugs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
