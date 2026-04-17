"""
Iteration 78 - Testing:
1. Admin client creation with custom password field
2. Auto-generated password when no password provided
3. Client login with admin-set password
4. Duplicate email check returns existing client
5. DELETE test client cleanup
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"


class TestAdminLogin:
    """Test admin login endpoint"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"✓ Admin login successful: {data['user']['email']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login correctly rejects invalid credentials")


class TestQuickClientCreation:
    """Test admin quick client creation with password field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_client_ids = []
    
    def test_create_client_with_custom_password(self):
        """Test creating client with admin-specified password"""
        test_email = f"test-custom-{uuid.uuid4().hex[:8]}@test.com"
        custom_password = "MyCustomPass123!"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Test Custom Password",
                "email": test_email,
                "password": custom_password,
                "phone": "+41 79 123 4567"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["is_new"] == True, "Expected is_new=True for new client"
        assert "client" in data, "No client in response"
        assert "generated_password" in data, "No generated_password in response"
        assert data["generated_password"] == custom_password, f"Password mismatch: expected {custom_password}, got {data['generated_password']}"
        
        client = data["client"]
        assert client["email"] == test_email.lower()
        self.created_client_ids.append(client["id"])
        
        print(f"✓ Client created with custom password: {test_email}")
        
        # Verify client can login with the custom password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": custom_password
        })
        assert login_response.status_code == 200, f"Client login failed: {login_response.text}"
        print(f"✓ Client can login with admin-set password")
        
        # Cleanup
        self._delete_client(client["id"])
    
    def test_create_client_auto_generated_password(self):
        """Test creating client without password - should auto-generate 8-char password"""
        test_email = f"test-auto-{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Test Auto Password",
                "email": test_email,
                "phone": "+41 79 987 6543"
                # No password field
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        assert data["is_new"] == True
        assert "generated_password" in data
        generated_pwd = data["generated_password"]
        
        # Verify auto-generated password is 8 characters
        assert len(generated_pwd) == 8, f"Expected 8-char password, got {len(generated_pwd)}: {generated_pwd}"
        assert generated_pwd.isalnum(), f"Password should be alphanumeric: {generated_pwd}"
        
        client = data["client"]
        self.created_client_ids.append(client["id"])
        
        print(f"✓ Client created with auto-generated password: {generated_pwd}")
        
        # Verify client can login with auto-generated password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": generated_pwd
        })
        assert login_response.status_code == 200, f"Client login with auto-generated password failed: {login_response.text}"
        print(f"✓ Client can login with auto-generated password")
        
        # Cleanup
        self._delete_client(client["id"])
    
    def test_create_client_empty_password_auto_generates(self):
        """Test creating client with empty password string - should auto-generate"""
        test_email = f"test-empty-{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Test Empty Password",
                "email": test_email,
                "password": "",  # Empty string
                "phone": "+41 79 111 2222"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        assert data["is_new"] == True
        generated_pwd = data["generated_password"]
        assert len(generated_pwd) == 8, f"Expected 8-char password for empty input, got {len(generated_pwd)}"
        
        client = data["client"]
        print(f"✓ Empty password correctly triggers auto-generation: {generated_pwd}")
        
        # Cleanup
        self._delete_client(client["id"])
    
    def test_duplicate_email_returns_existing_client(self):
        """Test that creating client with existing email returns existing client"""
        # First, create a new client
        test_email = f"test-dup-{uuid.uuid4().hex[:8]}@test.com"
        
        response1 = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Original Client",
                "email": test_email,
                "password": "OriginalPass123"
            },
            headers=self.headers
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["is_new"] == True
        original_id = data1["client"]["id"]
        
        # Try to create another client with same email
        response2 = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Duplicate Client",
                "email": test_email,
                "password": "DifferentPass456"
            },
            headers=self.headers
        )
        
        assert response2.status_code == 200, f"Duplicate check failed: {response2.text}"
        data2 = response2.json()
        
        # Should return existing client, not create new
        assert data2["is_new"] == False, "Expected is_new=False for duplicate email"
        assert data2["client"]["id"] == original_id, "Should return same client ID"
        
        print(f"✓ Duplicate email correctly returns existing client")
        
        # Cleanup
        self._delete_client(original_id)
    
    def test_create_client_with_identity_fields(self):
        """Test creating client with all identity fields"""
        test_email = f"test-full-{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={
                "name": "Jean Test",
                "email": test_email,
                "password": "FullTest123!",
                "phone": "+41 79 333 4444",
                "address": "Rue de Test 10, 1000 Lausanne",
                "nationality": "Suisse",
                "date_of_birth": "15-03-1990",
                "birth_place": "Geneve",
                "license_number": "CH-123456",
                "license_issue_date": "01-01-2015",
                "license_expiry_date": "01-01-2030"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create client with identity fields failed: {response.text}"
        data = response.json()
        
        assert data["is_new"] == True
        client = data["client"]
        
        # Verify identity fields are saved
        assert client["nationality"] == "Suisse"
        assert client["birth_place"] == "Geneve"
        assert client["license_number"] == "CH-123456"
        
        print(f"✓ Client created with all identity fields")
        
        # Cleanup
        self._delete_client(client["id"])
    
    def _delete_client(self, client_id: str):
        """Helper to delete test client"""
        try:
            # Use admin endpoint to delete user
            response = requests.delete(
                f"{BASE_URL}/api/admin/users/{client_id}",
                headers=self.headers
            )
            if response.status_code in [200, 204, 404]:
                print(f"  → Cleaned up test client: {client_id}")
        except Exception as e:
            print(f"  → Warning: Could not delete client {client_id}: {e}")


class TestClientLogin:
    """Test client login with various scenarios"""
    
    def test_existing_client_login(self):
        """Test login with existing client credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        print(f"✓ Existing client login successful: {CLIENT_EMAIL}")
    
    def test_client_login_invalid_password(self):
        """Test client login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Client login correctly rejects invalid password")


class TestStatusLabelsAPI:
    """Test that reservation API returns correct status values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_reservations_have_valid_status(self):
        """Test that reservations API returns valid status values"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get reservations failed: {response.text}"
        data = response.json()
        
        valid_statuses = ['pending', 'pending_cash', 'confirmed', 'active', 'completed', 'cancelled']
        
        reservations = data.get("reservations", [])
        for res in reservations:
            status = res.get("status")
            assert status in valid_statuses, f"Invalid status: {status}"
        
        print(f"✓ All {len(reservations)} reservations have valid status values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
