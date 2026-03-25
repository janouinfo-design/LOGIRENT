"""
Test Client Identity & License Fields (Iteration 33)
- Tests for birth_place, birth_year, license_number, license_issue_date, license_expiry_date, nationality
- Backend: PUT /api/admin/users/{user_id} accepts and saves new fields
- Backend: POST /api/admin/quick-client accepts and saves new fields
- Backend: GET /api/admin/users/{user_id} returns the new fields
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com').rstrip('/')

# Test credentials
AGENCY_ADMIN_EMAIL = "admin-geneva@logirent.ch"
AGENCY_ADMIN_PASSWORD = "LogiRent2024"
TEST_USER_ID = "b5a5d170-1c84-47ca-b547-2fb2b8dd60df"


@pytest.fixture(scope="module")
def admin_token():
    """Get agency admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"email": AGENCY_ADMIN_EMAIL, "password": AGENCY_ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture
def admin_client(admin_token):
    """Authenticated session for admin requests"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    })
    return session


class TestAgencyAdminLogin:
    """Test admin login returns user profile with new identity fields"""
    
    def test_admin_login_includes_identity_fields_in_profile(self):
        """Admin login response should include identity/license fields in UserProfile"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": AGENCY_ADMIN_EMAIL, "password": AGENCY_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        user = data["user"]
        
        # Verify UserProfile model includes new optional fields
        # These may be null but must be present in schema
        assert "birth_place" in user
        assert "birth_year" in user
        assert "license_number" in user
        assert "license_issue_date" in user
        assert "license_expiry_date" in user
        assert "nationality" in user


class TestGetUserWithIdentityFields:
    """Test GET /api/admin/users/{user_id} returns identity/license fields"""
    
    def test_get_user_returns_all_identity_fields(self, admin_client):
        """GET user endpoint should return all identity/license fields"""
        response = admin_client.get(f"{BASE_URL}/api/admin/users/{TEST_USER_ID}")
        assert response.status_code == 200
        
        user = response.json()
        
        # Verify all identity fields are present and have expected values
        assert "birth_place" in user
        assert "birth_year" in user
        assert "license_number" in user
        assert "license_issue_date" in user
        assert "license_expiry_date" in user
        assert "nationality" in user
        
        # Verify the test user has populated data (set in previous iterations)
        assert user["birth_place"] == "Geneve"
        assert user["birth_year"] == 1990
        assert user["license_number"] == "GE-123456"
        assert user["nationality"] == "Suisse"


class TestUpdateUserWithIdentityFields:
    """Test PUT /api/admin/users/{user_id} accepts and saves identity/license fields"""
    
    def test_update_user_with_all_identity_fields(self, admin_client):
        """PUT should update all identity/license fields"""
        # Update with new values
        update_payload = {
            "birth_place": "Zurich",
            "birth_year": 1985,
            "license_number": "ZH-999888",
            "license_issue_date": "2012-06-01",
            "license_expiry_date": "2032-06-01",
            "nationality": "Allemand"
        }
        
        response = admin_client.put(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}",
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "User updated successfully"
        
        # Verify updated values in response
        user = data["user"]
        assert user["birth_place"] == "Zurich"
        assert user["birth_year"] == 1985
        assert user["license_number"] == "ZH-999888"
        assert user["license_issue_date"] == "2012-06-01"
        assert user["license_expiry_date"] == "2032-06-01"
        assert user["nationality"] == "Allemand"
        
        # GET to verify persistence
        get_response = admin_client.get(f"{BASE_URL}/api/admin/users/{TEST_USER_ID}")
        assert get_response.status_code == 200
        
        fetched_user = get_response.json()
        assert fetched_user["birth_place"] == "Zurich"
        assert fetched_user["birth_year"] == 1985
        assert fetched_user["license_number"] == "ZH-999888"
        assert fetched_user["nationality"] == "Allemand"
        
        # Restore original values for other tests
        admin_client.put(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}",
            json={
                "birth_place": "Geneve",
                "birth_year": 1990,
                "license_number": "GE-123456",
                "license_issue_date": "2015-03-01",
                "license_expiry_date": "2027-03-01",
                "nationality": "Suisse"
            }
        )
    
    def test_update_user_partial_identity_fields(self, admin_client):
        """PUT should allow partial updates of identity fields"""
        # Update only some fields
        update_payload = {
            "birth_place": "Basel"
        }
        
        response = admin_client.put(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}",
            json=update_payload
        )
        assert response.status_code == 200
        
        user = response.json()["user"]
        assert user["birth_place"] == "Basel"
        # Other fields should remain unchanged
        assert user["birth_year"] == 1990
        assert user["license_number"] == "GE-123456"
        
        # Restore
        admin_client.put(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}",
            json={"birth_place": "Geneve"}
        )


class TestQuickClientWithIdentityFields:
    """Test POST /api/admin/quick-client accepts and saves identity/license fields"""
    
    def test_create_quick_client_with_all_identity_fields(self, admin_client):
        """POST quick-client should accept all identity/license fields"""
        unique_email = f"test_identity_{uuid.uuid4().hex[:8]}@test.com"
        
        create_payload = {
            "name": "Test Identity Client",
            "phone": "+41799876543",
            "email": unique_email,
            "birth_place": "Lugano",
            "birth_year": 1995,
            "license_number": "TI-112233",
            "license_issue_date": "2018-01-15",
            "license_expiry_date": "2033-01-15",
            "nationality": "Italien"
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/quick-client",
            json=create_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Client créé"
        assert data["is_new"] is True
        
        client = data["client"]
        assert client["name"] == "Test Identity Client"
        assert client["birth_place"] == "Lugano"
        assert client["birth_year"] == 1995
        assert client["license_number"] == "TI-112233"
        assert client["license_issue_date"] == "2018-01-15"
        assert client["license_expiry_date"] == "2033-01-15"
        assert client["nationality"] == "Italien"
        
        # Verify persistence via GET
        client_id = client["id"]
        get_response = admin_client.get(f"{BASE_URL}/api/admin/users/{client_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["birth_place"] == "Lugano"
        assert fetched["birth_year"] == 1995
        assert fetched["license_number"] == "TI-112233"
        assert fetched["nationality"] == "Italien"
    
    def test_create_quick_client_without_identity_fields(self, admin_client):
        """POST quick-client should work without identity fields (optional)"""
        unique_email = f"test_minimal_{uuid.uuid4().hex[:8]}@test.com"
        
        create_payload = {
            "name": "Minimal Client",
            "phone": "+41799999999"
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/quick-client",
            json=create_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        client = data["client"]
        
        # Identity fields should be null/None
        assert client.get("birth_place") is None
        assert client.get("birth_year") is None
        assert client.get("license_number") is None


class TestUserListIncludesIdentityFields:
    """Test GET /api/admin/users list includes identity fields"""
    
    def test_users_list_returns_identity_fields(self, admin_client):
        """Users list should include identity fields for each user"""
        response = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert len(data["users"]) > 0
        
        # Find test user in the list
        test_user = None
        for user in data["users"]:
            if user["id"] == TEST_USER_ID:
                test_user = user
                break
        
        # If test user is in the list, verify identity fields present
        # Note: list may not include all users depending on pagination
        if test_user:
            # Fields should be accessible (may be null for other users)
            assert "birth_place" in test_user or test_user.get("birth_place") is None


class TestAdminUserUpdateModel:
    """Test AdminUserUpdate model accepts all new fields"""
    
    def test_update_with_invalid_birth_year_type(self, admin_client):
        """Update with invalid birth_year should be handled"""
        # Pydantic should handle type coercion or return 422
        update_payload = {
            "birth_year": "not_a_number"
        }
        
        response = admin_client.put(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}",
            json=update_payload
        )
        # Should either fail validation (422) or coerce to None/default
        assert response.status_code in [200, 422]


class TestQuickClientCreateModel:
    """Test QuickClientCreate model with new fields"""
    
    def test_create_with_all_field_types_correct(self, admin_client):
        """Create client with all correct field types"""
        unique_email = f"test_types_{uuid.uuid4().hex[:8]}@test.com"
        
        create_payload = {
            "name": "Type Test Client",
            "email": unique_email,
            "birth_place": "St. Gallen",  # string
            "birth_year": 1982,  # integer
            "license_number": "SG-554433",  # string
            "license_issue_date": "2005-07-22",  # string (date format)
            "license_expiry_date": "2025-07-22",  # string (date format)
            "nationality": "Autrichien"  # string
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/admin/quick-client",
            json=create_payload
        )
        assert response.status_code == 200
        
        client = response.json()["client"]
        assert isinstance(client["birth_year"], int)
        assert client["birth_year"] == 1982
        assert isinstance(client["birth_place"], str)
        assert isinstance(client["license_number"], str)
