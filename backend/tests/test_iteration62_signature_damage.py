"""
Iteration 62 - Testing Signature Canvas Fix and AI Damage Detection
Tests:
1. POST /api/inspections/analyze-damage - AI damage detection endpoint
2. PUT /api/contracts/{id}/sign - Contract signing with signature
3. GET /api/inspections/defaults - Default inspection checklist
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
AGENCY_ADMIN_EMAIL = "admin-geneva@logirent.ch"
AGENCY_ADMIN_PASSWORD = "LogiRent2024!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for agency admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": AGENCY_ADMIN_EMAIL, "password": AGENCY_ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDamageAnalysisAPI:
    """Tests for AI Damage Detection endpoint"""
    
    def test_analyze_damage_requires_auth(self):
        """Test that analyze-damage endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/inspections/analyze-damage",
            json={"image_data": "test", "context": "checkout"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_analyze_damage_requires_image_data(self, auth_headers):
        """Test that analyze-damage endpoint requires image_data"""
        response = requests.post(
            f"{BASE_URL}/api/inspections/analyze-damage",
            headers=auth_headers,
            json={"context": "checkout"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "image_data" in response.text.lower()
    
    def test_analyze_damage_with_valid_image(self, auth_headers):
        """Test analyze-damage with a valid base64 image"""
        # Small 1x1 pixel PNG in base64
        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/inspections/analyze-damage",
            headers=auth_headers,
            json={
                "image_data": test_image,
                "context": "checkout"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "damages_detected" in data, "Missing damages_detected field"
        assert "damages" in data, "Missing damages field"
        assert "overall_condition" in data, "Missing overall_condition field"
        assert "confidence" in data, "Missing confidence field"
        assert "summary" in data, "Missing summary field"
        
        # Verify data types
        assert isinstance(data["damages_detected"], bool), "damages_detected should be boolean"
        assert isinstance(data["damages"], list), "damages should be a list"
        assert isinstance(data["confidence"], (int, float)), "confidence should be numeric"
    
    def test_analyze_damage_with_checkin_context(self, auth_headers):
        """Test analyze-damage with checkin context"""
        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/inspections/analyze-damage",
            headers=auth_headers,
            json={
                "image_data": test_image,
                "context": "checkin"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "summary" in data


class TestInspectionDefaults:
    """Tests for inspection defaults endpoint"""
    
    def test_get_defaults_requires_auth(self):
        """Test that defaults endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/inspections/defaults")
        assert response.status_code in [401, 403]
    
    def test_get_defaults_returns_items(self, auth_headers):
        """Test that defaults endpoint returns checklist items"""
        response = requests.get(
            f"{BASE_URL}/api/inspections/defaults",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items field"
        assert isinstance(data["items"], list), "items should be a list"
        assert len(data["items"]) > 0, "items should not be empty"
        
        # Verify item structure
        item = data["items"][0]
        assert "name" in item, "Item missing name"
        assert "checked" in item, "Item missing checked"
        assert "condition" in item, "Item missing condition"


class TestContractSigning:
    """Tests for contract signing endpoint"""
    
    def test_sign_contract_requires_auth(self):
        """Test that sign endpoint requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/contracts/nonexistent-id/sign",
            json={"signature_data": "test"}
        )
        assert response.status_code in [401, 403]
    
    def test_sign_nonexistent_contract(self, auth_headers):
        """Test signing a non-existent contract returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/contracts/nonexistent-contract-id/sign",
            headers=auth_headers,
            json={"signature_data": "data:image/png;base64,test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_sign_contract_requires_signature_data(self, auth_headers):
        """Test that sign endpoint requires signature_data"""
        # First get a contract
        contracts_resp = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=auth_headers
        )
        
        if contracts_resp.status_code == 200:
            data = contracts_resp.json()
            contracts = data if isinstance(data, list) else data.get("contracts", [])
            if contracts:
                # Find an unsigned contract
                unsigned = [c for c in contracts if c.get("status") != "signed"]
                if unsigned:
                    contract_id = unsigned[0]["id"]
                    response = requests.put(
                        f"{BASE_URL}/api/contracts/{contract_id}/sign",
                        headers=auth_headers,
                        json={}
                    )
                    # Should fail without signature_data
                    assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"


class TestInspectionCRUD:
    """Tests for inspection CRUD operations"""
    
    def test_get_inspections_for_reservation(self, auth_headers):
        """Test getting inspections for a reservation"""
        # First get a reservation
        reservations_resp = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=5",
            headers=auth_headers
        )
        
        if reservations_resp.status_code == 200:
            reservations = reservations_resp.json().get("reservations", [])
            if reservations:
                reservation_id = reservations[0]["id"]
                
                response = requests.get(
                    f"{BASE_URL}/api/inspections/reservation/{reservation_id}",
                    headers=auth_headers
                )
                
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                data = response.json()
                assert "inspections" in data, "Missing inspections field"
                assert isinstance(data["inspections"], list), "inspections should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
