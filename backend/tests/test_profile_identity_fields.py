"""
Test suite for identity fields in profile APIs
Tests: PUT /api/auth/profile, PUT /api/admin/users/{user_id}, POST /api/admin/quick-client
Fields: date_of_birth, birth_place, license_number, license_issue_date, license_expiry_date, nationality
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "client1@test.com"
CLIENT_PASSWORD = "test1234"
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"


@pytest.fixture(scope="module")
def client_token():
    """Get client auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    assert response.status_code == 200, f"Client login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def client_user_id(client_token):
    """Get client user ID"""
    response = requests.get(f"{BASE_URL}/api/auth/profile", headers={
        "Authorization": f"Bearer {client_token}"
    })
    assert response.status_code == 200
    return response.json()["id"]


class TestClientProfileIdentityFields:
    """Tests for PUT /api/auth/profile with identity fields"""
    
    def test_update_profile_with_all_identity_fields(self, client_token):
        """Test updating profile with all identity fields"""
        test_data = {
            "name": "Test Client",
            "date_of_birth": "15-03-1990",
            "birth_place": "Genève",
            "license_number": "GE-TEST-123456",
            "license_issue_date": "2015-06-01",
            "license_expiry_date": "2030-06-01",
            "nationality": "Suisse"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            json=test_data,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        
        # Verify all identity fields are returned
        assert data.get("date_of_birth") == test_data["date_of_birth"], f"date_of_birth mismatch: {data.get('date_of_birth')}"
        assert data.get("birth_place") == test_data["birth_place"], f"birth_place mismatch: {data.get('birth_place')}"
        assert data.get("license_number") == test_data["license_number"], f"license_number mismatch: {data.get('license_number')}"
        assert data.get("license_issue_date") == test_data["license_issue_date"], f"license_issue_date mismatch: {data.get('license_issue_date')}"
        assert data.get("license_expiry_date") == test_data["license_expiry_date"], f"license_expiry_date mismatch: {data.get('license_expiry_date')}"
        assert data.get("nationality") == test_data["nationality"], f"nationality mismatch: {data.get('nationality')}"
        print(f"✓ Profile updated with all identity fields")
    
    def test_get_profile_returns_identity_fields(self, client_token):
        """Test GET /api/auth/profile returns identity fields"""
        response = requests.get(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify identity fields exist in response (may be null if not set)
        assert "date_of_birth" in data, "date_of_birth field missing from profile"
        assert "birth_place" in data, "birth_place field missing from profile"
        assert "license_number" in data, "license_number field missing from profile"
        assert "license_issue_date" in data, "license_issue_date field missing from profile"
        assert "license_expiry_date" in data, "license_expiry_date field missing from profile"
        assert "nationality" in data, "nationality field missing from profile"
        print(f"✓ GET profile returns all identity fields")
    
    def test_partial_update_identity_fields(self, client_token):
        """Test partial update of identity fields"""
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            json={"nationality": "France"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("nationality") == "France", f"Partial update failed: {data.get('nationality')}"
        print(f"✓ Partial update of identity field works")


class TestAdminUserUpdateIdentityFields:
    """Tests for PUT /api/admin/users/{user_id} with identity fields"""
    
    def test_admin_update_user_identity_fields(self, admin_token, client_user_id):
        """Test admin can update user identity fields"""
        test_data = {
            "birth_place": "Lausanne",
            "date_of_birth": "20-05-1985",
            "license_number": "VD-ADMIN-789012",
            "license_issue_date": "2010-01-15",
            "license_expiry_date": "2025-01-15",
            "nationality": "Belgique"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{client_user_id}",
            json=test_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin update failed: {response.text}"
        data = response.json()
        user = data.get("user", {})
        
        # Verify fields were updated
        assert user.get("birth_place") == test_data["birth_place"]
        assert user.get("date_of_birth") == test_data["date_of_birth"]
        assert user.get("license_number") == test_data["license_number"]
        assert user.get("license_issue_date") == test_data["license_issue_date"]
        assert user.get("license_expiry_date") == test_data["license_expiry_date"]
        assert user.get("nationality") == test_data["nationality"]
        print(f"✓ Admin updated user identity fields successfully")
    
    def test_admin_get_user_returns_identity_fields(self, admin_token, client_user_id):
        """Test GET /api/admin/users/{user_id} returns identity fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{client_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify identity fields exist
        assert "date_of_birth" in data, "date_of_birth missing from admin user detail"
        assert "birth_place" in data, "birth_place missing from admin user detail"
        assert "license_number" in data, "license_number missing from admin user detail"
        assert "license_issue_date" in data, "license_issue_date missing from admin user detail"
        assert "license_expiry_date" in data, "license_expiry_date missing from admin user detail"
        assert "nationality" in data, "nationality missing from admin user detail"
        print(f"✓ Admin GET user returns all identity fields")


class TestQuickClientCreateIdentityFields:
    """Tests for POST /api/admin/quick-client with date_of_birth"""
    
    def test_create_quick_client_with_date_of_birth(self, admin_token):
        """Test creating quick client with date_of_birth (not birth_year)"""
        unique_id = str(uuid.uuid4())[:8]
        test_data = {
            "name": f"Test QuickClient {unique_id}",
            "phone": "+41 79 123 4567",
            "email": f"quicktest_{unique_id}@test.com",
            "birth_place": "Zürich",
            "date_of_birth": "10-12-1995",  # DD-MM-YYYY format
            "license_number": f"ZH-{unique_id}",
            "license_issue_date": "2018-03-20",
            "license_expiry_date": "2028-03-20",
            "nationality": "Allemand"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json=test_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Quick client create failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "client" in data, "No client in response"
        client = data["client"]
        
        # Verify date_of_birth was stored (not birth_year)
        assert client.get("date_of_birth") == test_data["date_of_birth"], f"date_of_birth mismatch: {client.get('date_of_birth')}"
        assert client.get("birth_place") == test_data["birth_place"]
        assert client.get("license_number") == test_data["license_number"]
        assert client.get("license_issue_date") == test_data["license_issue_date"]
        assert client.get("license_expiry_date") == test_data["license_expiry_date"]
        assert client.get("nationality") == test_data["nationality"]
        
        # Verify NO birth_year field exists
        assert "birth_year" not in client, "birth_year should not exist in response"
        print(f"✓ Quick client created with date_of_birth (not birth_year)")
    
    def test_quick_client_minimal_fields(self, admin_token):
        """Test creating quick client with minimal required fields"""
        unique_id = str(uuid.uuid4())[:8]
        test_data = {
            "name": f"Minimal Client {unique_id}",
            "phone": "+41 79 999 8888"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json=test_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Minimal quick client failed: {response.text}"
        data = response.json()
        client = data.get("client", {})
        
        # date_of_birth should be None, not birth_year
        assert client.get("date_of_birth") is None or client.get("date_of_birth") == ""
        assert "birth_year" not in client
        print(f"✓ Minimal quick client created without birth_year")


class TestAuthEndpoints:
    """Basic auth endpoint tests"""
    
    def test_client_login(self):
        """Test client login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Client login successful")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Admin login successful")
    
    def test_invalid_login(self):
        """Test invalid login returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print(f"✓ Invalid login correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
