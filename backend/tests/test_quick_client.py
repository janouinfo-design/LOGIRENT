"""
Tests for Quick Client Creation Feature
- POST /api/admin/quick-client - Creates client with auto-generated password
- POST /api/admin/clients/{id}/documents - Uploads license/ID photos
- Welcome email with QR code (check logs)
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"


class TestQuickClientCreation:
    """Tests for the quick client creation flow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_create_quick_client_returns_generated_password(self, auth_headers):
        """Test POST /api/admin/quick-client creates client with auto-generated password"""
        unique_email = f"testclient_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {
            "name": "Test Client Quick",
            "phone": "+41 79 123 4567",
            "email": unique_email,
            "address": "Test Address 123, Geneva",
            "nationality": "Suisse",
            "date_of_birth": "1990-05-15",
            "license_number": "CH-TEST-123",
            "license_issue_date": "2015-01-01",
            "license_expiry_date": "2030-01-01"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "client" in data, "Response missing 'client' field"
        assert "is_new" in data, "Response missing 'is_new' field"
        assert "generated_password" in data, "Response missing 'generated_password' field"
        
        # Verify is_new is True for new client
        assert data["is_new"] == True, f"Expected is_new=True, got {data['is_new']}"
        
        # Verify generated password exists and has valid length
        password = data["generated_password"]
        assert password is not None, "Generated password is None"
        assert len(password) == 8, f"Expected 8-char password, got {len(password)} chars: '{password}'"
        
        # Verify client data
        client = data["client"]
        assert client["email"] == unique_email.lower(), f"Email mismatch"
        assert client["name"] == "Test Client Quick", f"Name mismatch"
        assert client["role"] == "client", f"Role should be 'client'"
        assert "id" in client, "Client missing 'id' field"
        
        # Store client id for later tests
        self.__class__.created_client_id = client["id"]
        self.__class__.created_client_email = unique_email.lower()
        
        print(f"✓ Created client with ID: {client['id']}")
        print(f"✓ Generated password: {password} (8 chars)")
    
    def test_02_existing_client_returns_is_new_false(self, auth_headers):
        """Test that existing client returns is_new=false without generated_password"""
        # Use the previously created client's email
        existing_email = getattr(self.__class__, 'created_client_email', None)
        if not existing_email:
            pytest.skip("No previously created client")
        
        payload = {
            "name": "Same Client",
            "email": existing_email
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # For existing client, is_new should be False
        assert data["is_new"] == False, f"Expected is_new=False for existing client"
        assert "client" in data, "Response missing 'client' field"
        
        print(f"✓ Existing client detected, is_new=False")
    
    def test_03_create_client_without_email(self, auth_headers):
        """Test client creation without email (generates local email)"""
        payload = {
            "name": "No Email Client",
            "phone": "+41 79 999 8888"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        assert data["is_new"] == True
        assert "generated_password" in data
        assert "@logirent.local" in data["client"]["email"], "Should have @logirent.local email"
        
        self.__class__.no_email_client_id = data["client"]["id"]
        print(f"✓ Created client without email, got local email: {data['client']['email']}")
    
    def test_04_create_client_with_name_only(self, auth_headers):
        """Test minimal client creation with name only"""
        payload = {
            "name": "Minimal Client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        assert data["is_new"] == True
        assert "generated_password" in data
        assert len(data["generated_password"]) == 8
        
        print(f"✓ Created minimal client with name only")


class TestDocumentUpload:
    """Tests for document upload functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers for JSON requests"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def file_auth_headers(self, admin_token):
        """Get authorization headers for file uploads (no Content-Type)"""
        return {
            "Authorization": f"Bearer {admin_token}"
        }
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_headers):
        """Create a test client for document uploads"""
        unique_email = f"doctest_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Document Test Client",
            "email": unique_email
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_new"] == True
        return data["client"]
    
    def create_test_image(self):
        """Create a minimal valid JPEG image for testing"""
        # Minimal 1x1 red JPEG
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ])
        return jpeg_bytes
    
    def test_01_upload_license_front(self, file_auth_headers, test_client):
        """Test uploading license front photo"""
        client_id = test_client["id"]
        
        files = {
            "file": ("license_front.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=license_front",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "path" in data, "Response missing 'path' field"
        assert "doc_type" in data, "Response missing 'doc_type' field"
        assert data["doc_type"] == "license_front"
        assert "logirent/clients/" in data["path"]
        
        print(f"✓ Uploaded license_front, path: {data['path']}")
    
    def test_02_upload_license_back(self, file_auth_headers, test_client):
        """Test uploading license back photo"""
        client_id = test_client["id"]
        
        files = {
            "file": ("license_back.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=license_back",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["doc_type"] == "license_back"
        print(f"✓ Uploaded license_back, path: {data['path']}")
    
    def test_03_upload_id_front(self, file_auth_headers, test_client):
        """Test uploading ID card front photo"""
        client_id = test_client["id"]
        
        files = {
            "file": ("id_front.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=id_front",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["doc_type"] == "id_front"
        print(f"✓ Uploaded id_front, path: {data['path']}")
    
    def test_04_upload_id_back(self, file_auth_headers, test_client):
        """Test uploading ID card back photo"""
        client_id = test_client["id"]
        
        files = {
            "file": ("id_back.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=id_back",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["doc_type"] == "id_back"
        print(f"✓ Uploaded id_back, path: {data['path']}")
    
    def test_05_upload_invalid_doc_type(self, file_auth_headers, test_client):
        """Test uploading with invalid doc_type returns error"""
        client_id = test_client["id"]
        
        files = {
            "file": ("test.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=invalid_type",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid doc_type, got {response.status_code}"
        print(f"✓ Invalid doc_type correctly rejected with 400")
    
    def test_06_upload_to_nonexistent_client(self, file_auth_headers):
        """Test uploading to non-existent client returns 404"""
        fake_client_id = "nonexistent-client-id-12345"
        
        files = {
            "file": ("test.jpg", self.create_test_image(), "image/jpeg")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/{fake_client_id}/documents?doc_type=license_front",
            headers=file_auth_headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent client, got {response.status_code}"
        print(f"✓ Non-existent client correctly rejected with 404")


class TestAuthRequired:
    """Tests for authentication requirements"""
    
    def test_quick_client_requires_auth(self):
        """Test that quick-client endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/quick-client",
            json={"name": "Test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Quick-client endpoint requires authentication")
    
    def test_document_upload_requires_auth(self):
        """Test that document upload endpoint requires authentication"""
        files = {"file": ("test.jpg", b"test", "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/admin/clients/some-id/documents?doc_type=license_front",
            files=files
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Document upload endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
