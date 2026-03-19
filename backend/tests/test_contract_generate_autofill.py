"""
Test: Contract Generation Auto-Fill - Iteration 34
Tests that POST /api/admin/contracts/generate auto-fills:
- Client identity fields: nationality, license_number, license_issue_date, license_expiry_date, birth_place, birth_year
- Vehicle fields: plate_number, color, chassis_number
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-vps-deploy.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"

# Known test data
CLIENT_WITH_IDENTITY = "b5a5d170-1c84-47ca-b547-2fb2b8dd60df"  # Has nationality=Suisse, license_number=GE-123456
VEHICLE_WITH_FIELDS = "4bd9f2fa-5265-4a1f-b31c-02acfb0fe92e"  # BMW Series 3 with plate_number, color, chassis


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def authenticated_client(admin_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestClientIdentityFieldsInContract:
    """Test client identity fields are auto-filled in contract generation"""
    
    def test_get_client_with_identity_fields(self, authenticated_client):
        """Verify test client has identity fields populated"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/users/{CLIENT_WITH_IDENTITY}")
        assert response.status_code == 200
        
        data = response.json()
        # Verify identity fields exist
        assert data.get("nationality") == "Suisse", "Client should have nationality=Suisse"
        assert data.get("license_number") == "GE-123456", "Client should have license_number=GE-123456"
        assert data.get("license_issue_date") == "2015-03-01", "Client should have license_issue_date"
        assert data.get("license_expiry_date") == "2027-03-01", "Client should have license_expiry_date"
        assert data.get("birth_place") == "Geneve", "Client should have birth_place=Geneve"
        assert data.get("birth_year") == 1990, "Client should have birth_year=1990"
        print(f"✓ Client {CLIENT_WITH_IDENTITY} has all identity fields")


class TestVehicleFieldsInContract:
    """Test vehicle fields are auto-filled in contract generation"""
    
    def test_get_vehicle_with_fields(self, authenticated_client):
        """Verify test vehicle has plate/color/chassis populated"""
        response = authenticated_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_WITH_FIELDS}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("plate_number") == "GE 6E750", "Vehicle should have plate_number"
        assert data.get("color") == "Bleu Metallise", "Vehicle should have color"
        assert data.get("chassis_number") == "VF1A008DF48C17043", "Vehicle should have chassis_number"
        print(f"✓ Vehicle {VEHICLE_WITH_FIELDS} has plate/color/chassis fields")


class TestContractGenerateAutoFill:
    """Test POST /api/admin/contracts/generate auto-fills all fields"""
    
    @pytest.fixture(scope="class")
    def test_reservation_with_contract(self, authenticated_client):
        """Create a test reservation OR use existing one with client who has identity data and vehicle with fields, then generate contract"""
        
        # Check if existing reservation from Dec 2026 exists
        resp = authenticated_client.get(f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-12-01&end_date=2027-01-01")
        assert resp.status_code == 200
        
        vehicles = resp.json().get("vehicles", [])
        bmw_vehicle = next((v for v in vehicles if v.get("id") == VEHICLE_WITH_FIELDS), None)
        
        reservation_id = None
        if bmw_vehicle and bmw_vehicle.get("reservations"):
            for res in bmw_vehicle.get("reservations", []):
                # Use existing reservation
                reservation_id = res.get("id")
                print(f"✓ Using existing reservation: {reservation_id}")
                break
        
        if not reservation_id:
            # Create new one with far future dates
            start = datetime(2027, 8, 15, 8, 0, 0)
            end = datetime(2027, 8, 17, 18, 0, 0)
            
            payload = {
                "client_id": CLIENT_WITH_IDENTITY,
                "vehicle_id": VEHICLE_WITH_FIELDS,
                "start_date": start.strftime("%Y-%m-%dT08:00:00"),
                "end_date": end.strftime("%Y-%m-%dT18:00:00"),
                "options": [],
                "payment_method": "cash"
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/admin/create-reservation-for-client",
                json=payload
            )
            assert response.status_code == 200, f"Create reservation failed: {response.text}"
            reservation_id = response.json().get("reservation", {}).get("id")
            print(f"✓ Created new test reservation: {reservation_id}")
        
        assert reservation_id, "Reservation ID should exist"
        
        # Generate contract
        contract_resp = authenticated_client.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            json={"reservation_id": reservation_id, "language": "fr"}
        )
        assert contract_resp.status_code == 200, f"Contract generation failed: {contract_resp.text}"
        contract_id = contract_resp.json().get("contract_id")
        print(f"✓ Generated contract: {contract_id}")
        
        yield {"reservation_id": reservation_id, "contract_id": contract_id}
    
    def test_contract_generate_autofills_client_identity(self, authenticated_client, test_reservation_with_contract):
        """Test contract generation auto-fills client identity fields"""
        contract_id = test_reservation_with_contract["contract_id"]
        
        # Get the full contract
        contract_resp = authenticated_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert contract_resp.status_code == 200
        
        contract_data = contract_resp.json().get("contract_data", {})
        
        # Verify client identity auto-fill
        assert contract_data.get("client_nationality") == "Suisse", \
            f"Expected nationality='Suisse', got '{contract_data.get('client_nationality')}'"
        
        assert contract_data.get("client_license") == "GE-123456", \
            f"Expected license='GE-123456', got '{contract_data.get('client_license')}'"
        
        # License dates - could be in different formats
        assert contract_data.get("client_license_issued") in ["2015-03-01", "01/03/2015"], \
            f"Expected license_issued='2015-03-01', got '{contract_data.get('client_license_issued')}'"
        
        assert contract_data.get("client_license_valid") in ["2027-03-01", "01/03/2027"], \
            f"Expected license_valid='2027-03-01', got '{contract_data.get('client_license_valid')}'"
        
        # DOB format: "1990 - Geneve" or similar
        dob = contract_data.get("client_dob", "")
        assert "1990" in str(dob) or "Geneve" in str(dob), \
            f"Expected DOB to contain birth_year/place, got '{dob}'"
        
        print(f"✓ Contract auto-filled client identity fields:")
        print(f"  - nationality: {contract_data.get('client_nationality')}")
        print(f"  - license: {contract_data.get('client_license')}")
        print(f"  - license_issued: {contract_data.get('client_license_issued')}")
        print(f"  - license_valid: {contract_data.get('client_license_valid')}")
        print(f"  - dob: {contract_data.get('client_dob')}")
    
    def test_contract_generate_autofills_vehicle_fields(self, authenticated_client, test_reservation_with_contract):
        """Test contract generation auto-fills vehicle plate/color/chassis"""
        contract_id = test_reservation_with_contract["contract_id"]
        
        # Get the contract
        contract_resp = authenticated_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert contract_resp.status_code == 200
        
        contract_data = contract_resp.json().get("contract_data", {})
        
        # Verify vehicle fields auto-fill
        assert contract_data.get("vehicle_plate") == "GE 6E750", \
            f"Expected plate='GE 6E750', got '{contract_data.get('vehicle_plate')}'"
        
        assert contract_data.get("vehicle_color") == "Bleu Metallise", \
            f"Expected color='Bleu Metallise', got '{contract_data.get('vehicle_color')}'"
        
        assert contract_data.get("vehicle_chassis") == "VF1A008DF48C17043", \
            f"Expected chassis='VF1A008DF48C17043', got '{contract_data.get('vehicle_chassis')}'"
        
        print(f"✓ Contract auto-filled vehicle fields:")
        print(f"  - plate: {contract_data.get('vehicle_plate')}")
        print(f"  - color: {contract_data.get('vehicle_color')}")
        print(f"  - chassis: {contract_data.get('vehicle_chassis')}")


class TestExistingContractAutoFill:
    """Test the existing contract (782f06d8) to verify auto-fill worked"""
    
    def test_existing_contract_has_client_fields(self, authenticated_client):
        """Check existing contract 782f06d8 has client identity fields"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/contracts/782f06d8-61b9-45b9-834b-561d04c9e680"
        )
        assert response.status_code == 200
        
        contract_data = response.json().get("contract_data", {})
        
        # Existing contract should have these fields (may be updated manually)
        assert contract_data.get("client_nationality"), "Contract should have client_nationality"
        assert contract_data.get("client_license"), "Contract should have client_license"
        
        print(f"✓ Existing contract has client identity fields:")
        print(f"  - nationality: {contract_data.get('client_nationality')}")
        print(f"  - license: {contract_data.get('client_license')}")
        print(f"  - license_issued: {contract_data.get('client_license_issued')}")
        print(f"  - license_valid: {contract_data.get('client_license_valid')}")


class TestContractByReservationEndpoint:
    """Test GET /api/contracts/by-reservation/{reservation_id}"""
    
    def test_get_contract_by_reservation(self, authenticated_client):
        """Test fetching contract by reservation ID"""
        # Known reservation from existing contract
        reservation_id = "abccde0b-e50e-4c99-b3df-4751a9a9eec1"
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/contracts/by-reservation/{reservation_id}"
        )
        assert response.status_code == 200, f"Should find contract for reservation: {response.text}"
        
        data = response.json()
        assert data.get("reservation_id") == reservation_id
        assert data.get("id") == "782f06d8-61b9-45b9-834b-561d04c9e680"
        print(f"✓ GET /api/contracts/by-reservation works correctly")
    
    def test_get_contract_by_nonexistent_reservation(self, authenticated_client):
        """Test 404 for non-existent reservation"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/contracts/by-reservation/nonexistent-id-12345"
        )
        assert response.status_code == 404
        print(f"✓ Returns 404 for non-existent reservation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
