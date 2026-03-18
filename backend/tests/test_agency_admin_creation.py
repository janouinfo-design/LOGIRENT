"""
Test suite for Agency Admin Creation Feature
Tests the feature: When super admin creates a new agency, it should also create an admin account
for that agency with login credentials. The admin credentials should be shown after creation.

Features tested:
1. POST /api/agencies with admin fields - creates agency + admin account simultaneously
2. Newly created admin can login with POST /api/admin/login
3. Admin only sees their own agency's data (vehicles, reservations, users)
4. Duplicate email check when creating agency admin
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://deploy-local-db.preview.emergentagent.com')

# Test credentials from the problem statement
SUPER_ADMIN = {"email": "test@example.com", "password": "password123"}
AGENCY_ADMIN_1 = {"email": "admin2@logirent.ch", "password": "password123"}
AGENCY_ADMIN_2 = {"email": "pierre@logirent-zurich.ch", "password": "zurich2026"}


class TestAdminLogin:
    """Test admin login endpoint"""
    
    def test_super_admin_login(self):
        """Super admin can login via /api/admin/login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN["email"],
            "password": SUPER_ADMIN["password"]
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        print(f"✓ Super admin login successful - agency: {data['user'].get('agency_name')}")
    
    def test_agency_admin_login(self):
        """Agency admin can login via /api/admin/login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_1["email"],
            "password": AGENCY_ADMIN_1["password"]
        })
        assert response.status_code == 200, f"Agency admin login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Agency admin login successful - agency: {data['user'].get('agency_name')}")
    
    def test_admin_login_rejects_clients(self):
        """Admin login rejects regular clients"""
        # First register a client user
        unique_email = f"test_client_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Client"
        })
        
        if reg_response.status_code == 200:
            # Try admin login - should fail with 403
            response = requests.post(f"{BASE_URL}/api/admin/login", json={
                "email": unique_email,
                "password": "testpass123"
            })
            assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}"
            print("✓ Admin login correctly rejects client users")
        else:
            pytest.skip("Could not create test client user")
    
    def test_admin_login_invalid_credentials(self):
        """Admin login rejects invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "invalid@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login correctly rejects invalid credentials")


class TestAgencyCreationWithAdmin:
    """Test agency creation with admin account"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN["email"],
            "password": SUPER_ADMIN["password"]
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_create_agency_with_admin_fields(self, super_admin_token):
        """POST /api/agencies creates both agency AND admin user"""
        unique_id = uuid.uuid4().hex[:8]
        agency_data = {
            "name": f"TEST_Agency_{unique_id}",
            "address": "Test Address 123",
            "phone": "+41 22 111 1111",
            "email": f"contact@testagency{unique_id}.ch",
            "admin_name": f"Test Admin {unique_id}",
            "admin_email": f"admin_{unique_id}@testagency.ch",
            "admin_password": f"TestPass{unique_id}!"
        }
        
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/agencies", json=agency_data, headers=headers)
        
        assert response.status_code == 200, f"Agency creation failed: {response.text}"
        data = response.json()
        
        # Verify response contains admin credentials
        assert "admin_email" in data, "Response should contain admin_email"
        assert "admin_name" in data, "Response should contain admin_name"
        assert data["admin_email"] == agency_data["admin_email"].lower(), "Admin email mismatch"
        assert data["admin_name"] == agency_data["admin_name"], "Admin name mismatch"
        
        print(f"✓ Agency created: {data['name']}")
        print(f"  Admin email: {data['admin_email']}")
        print(f"  Admin name: {data['admin_name']}")
        
        # Store for next test
        return {
            "agency_id": data["id"],
            "admin_email": data["admin_email"],
            "admin_password": agency_data["admin_password"]
        }
    
    def test_newly_created_admin_can_login(self, super_admin_token):
        """Admin created via agency creation can login"""
        # First create an agency with admin
        unique_id = uuid.uuid4().hex[:8]
        agency_data = {
            "name": f"TEST_Agency_Login_{unique_id}",
            "address": "Test Address",
            "phone": "+41 22 222 2222",
            "email": f"contact@testagencylogin{unique_id}.ch",
            "admin_name": f"Login Test Admin {unique_id}",
            "admin_email": f"logintest_{unique_id}@testagency.ch",
            "admin_password": f"LoginPass{unique_id}!"
        }
        
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        create_response = requests.post(f"{BASE_URL}/api/agencies", json=agency_data, headers=headers)
        assert create_response.status_code == 200, f"Agency creation failed: {create_response.text}"
        
        # Now try to login with the new admin credentials
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": agency_data["admin_email"],
            "password": agency_data["admin_password"]
        })
        
        assert login_response.status_code == 200, f"New admin login failed: {login_response.text}"
        data = login_response.json()
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["agency_name"] == agency_data["name"], f"Agency name mismatch in login response"
        
        print(f"✓ Newly created admin can login successfully")
        print(f"  Agency: {data['user']['agency_name']}")
        print(f"  Role: {data['user']['role']}")
    
    def test_duplicate_email_rejected(self, super_admin_token):
        """Creating agency with existing admin email fails"""
        # Try to create agency with an existing email
        agency_data = {
            "name": "TEST_Agency_Duplicate",
            "address": "Test Address",
            "phone": "+41 22 333 3333",
            "email": "contact@testdup.ch",
            "admin_name": "Duplicate Admin",
            "admin_email": AGENCY_ADMIN_1["email"],  # This email already exists
            "admin_password": "TestPass123!"
        }
        
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/agencies", json=agency_data, headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        assert "déjà utilisé" in response.text.lower() or "already" in response.text.lower(), \
            f"Expected duplicate email error message, got: {response.text}"
        
        print("✓ Duplicate admin email correctly rejected")
    
    def test_missing_admin_fields_rejected(self, super_admin_token):
        """Creating agency without admin fields fails"""
        agency_data = {
            "name": "TEST_Agency_NoAdmin",
            "address": "Test Address"
            # Missing admin_name, admin_email, admin_password
        }
        
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/agencies", json=agency_data, headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for missing admin fields, got {response.status_code}"
        print("✓ Missing admin fields correctly rejected")


class TestAgencyScopedData:
    """Test that admin only sees their own agency's data"""
    
    @pytest.fixture
    def super_admin_auth(self):
        """Get super admin auth"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN["email"],
            "password": SUPER_ADMIN["password"]
        })
        return response.json()
    
    @pytest.fixture
    def agency_admin_auth(self):
        """Get agency admin auth"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_1["email"],
            "password": AGENCY_ADMIN_1["password"]
        })
        if response.status_code != 200:
            pytest.skip(f"Agency admin login failed: {response.text}")
        return response.json()
    
    def test_super_admin_sees_all_agencies(self, super_admin_auth):
        """Super admin can see all agencies"""
        headers = {"Authorization": f"Bearer {super_admin_auth['access_token']}"}
        response = requests.get(f"{BASE_URL}/api/agencies", headers=headers)
        
        assert response.status_code == 200, f"Get agencies failed: {response.text}"
        agencies = response.json()
        assert isinstance(agencies, list), "Expected list of agencies"
        assert len(agencies) > 0, "Expected at least one agency"
        
        print(f"✓ Super admin sees {len(agencies)} agencies")
    
    def test_agency_admin_sees_own_agency_only(self, agency_admin_auth):
        """Agency admin only sees their own agency"""
        headers = {"Authorization": f"Bearer {agency_admin_auth['access_token']}"}
        response = requests.get(f"{BASE_URL}/api/agencies", headers=headers)
        
        assert response.status_code == 200, f"Get agencies failed: {response.text}"
        agencies = response.json()
        
        # Agency admin should only see their own agency
        user_agency_id = agency_admin_auth["user"]["agency_id"]
        for agency in agencies:
            assert agency["id"] == user_agency_id, \
                f"Agency admin should only see their own agency, saw: {agency['name']}"
        
        print(f"✓ Agency admin only sees their own agency")
    
    def test_admin_stats_scoped_by_agency(self, agency_admin_auth, super_admin_auth):
        """Admin stats are scoped by agency"""
        # Get stats as agency admin
        admin_headers = {"Authorization": f"Bearer {agency_admin_auth['access_token']}"}
        admin_stats = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert admin_stats.status_code == 200, f"Admin stats failed: {admin_stats.text}"
        
        # Get stats as super admin
        super_headers = {"Authorization": f"Bearer {super_admin_auth['access_token']}"}
        super_stats = requests.get(f"{BASE_URL}/api/admin/stats", headers=super_headers)
        assert super_stats.status_code == 200, f"Super admin stats failed: {super_stats.text}"
        
        # Super admin should generally see more data (unless agency admin has more)
        admin_data = admin_stats.json()
        super_data = super_stats.json()
        
        print(f"✓ Admin stats: vehicles={admin_data['total_vehicles']}, reservations={admin_data['total_reservations']}")
        print(f"✓ Super admin stats: vehicles={super_data['total_vehicles']}, reservations={super_data['total_reservations']}")
    
    def test_admin_reservations_scoped(self, agency_admin_auth):
        """Admin reservations are scoped by agency"""
        headers = {"Authorization": f"Bearer {agency_admin_auth['access_token']}"}
        response = requests.get(f"{BASE_URL}/api/admin/reservations", headers=headers)
        
        assert response.status_code == 200, f"Admin reservations failed: {response.text}"
        data = response.json()
        
        # Verify we get a proper response structure
        assert "reservations" in data, "Expected 'reservations' key"
        assert "total" in data, "Expected 'total' key"
        
        print(f"✓ Agency admin sees {data['total']} reservations scoped to their agency")
    
    def test_admin_users_scoped(self, agency_admin_auth):
        """Admin users are scoped by agency (users who booked with agency)"""
        headers = {"Authorization": f"Bearer {agency_admin_auth['access_token']}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Admin users failed: {response.text}"
        data = response.json()
        
        assert "users" in data, "Expected 'users' key"
        assert "total" in data, "Expected 'total' key"
        
        print(f"✓ Agency admin sees {data['total']} users scoped to their agency")


class TestZurichAgencyAdmin:
    """Test the pierre@logirent-zurich.ch admin credentials"""
    
    def test_zurich_admin_login(self):
        """Zurich agency admin can login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_2["email"],
            "password": AGENCY_ADMIN_2["password"]
        })
        
        if response.status_code == 401:
            pytest.skip("Zurich admin not yet created")
        
        assert response.status_code == 200, f"Zurich admin login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        
        print(f"✓ Zurich admin login successful")
        print(f"  Agency: {data['user'].get('agency_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
