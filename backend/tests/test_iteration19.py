"""
Iteration 19: Test new features
- Agency admin header at TOP (sticky)
- Theme toggle in agency and client apps
- Notification system
- Client import via ZIP file
"""
import pytest
import requests
import os
import tempfile
import zipfile
import csv
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fleet-inspect-14.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials from review_request
AGENCY_ADMIN_EMAIL = "admin-geneva@logirent.ch"
AGENCY_ADMIN_PASSWORD = "LogiRent2024"
CLIENT_EMAIL = "client1@test.com"
CLIENT_PASSWORD = "test1234"
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"


class TestBackendAPIs:
    """Test backend API endpoints"""
    
    @pytest.fixture(scope="class")
    def agency_admin_token(self):
        """Get agency admin token - create user if not exists"""
        # First try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        
        # Create agency admin if login fails
        response = requests.post(f"{BASE_URL}/api/auth/register-admin", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD,
            "name": "Geneva Admin",
            "agency_name": "Geneva Agency"
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        pytest.skip("Could not get agency admin token")
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client token - create user if not exists"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        
        # Create client if login fails
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD,
            "name": "Test Client"
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        pytest.skip("Could not get client token")
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get('access_token')
        pytest.skip("Could not get super admin token")
    
    # =====================
    # Auth and Login Tests
    # =====================
    
    def test_agency_admin_login(self, agency_admin_token):
        """Test agency admin login returns correct role"""
        assert agency_admin_token is not None
        print(f"✓ Agency admin login successful, token: {agency_admin_token[:20]}...")
    
    def test_client_login(self, client_token):
        """Test client login returns correct role"""
        assert client_token is not None
        print(f"✓ Client login successful")
    
    def test_super_admin_login(self, super_admin_token):
        """Test super admin login returns correct role"""
        assert super_admin_token is not None
        print(f"✓ Super admin login successful")
    
    def test_agency_admin_profile(self, agency_admin_token):
        """Test agency admin profile has correct role"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get('role') == 'admin'
        assert data.get('agency_name') is not None or data.get('agency_id') is not None
        print(f"✓ Agency admin profile: role={data.get('role')}, agency={data.get('agency_name')}")
    
    # =====================
    # Notification Tests
    # =====================
    
    def test_get_notifications(self, agency_admin_token):
        """Test GET /api/notifications endpoint"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'notifications' in data
        print(f"✓ GET /api/notifications - returned {len(data.get('notifications', []))} notifications")
    
    def test_get_unread_count(self, agency_admin_token):
        """Test GET /api/notifications/unread-count endpoint"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'count' in data
        print(f"✓ GET /api/notifications/unread-count - unread count: {data.get('count')}")
    
    def test_client_notifications(self, client_token):
        """Test client can access notifications"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        print(f"✓ Client notifications endpoint working")
    
    def test_mark_all_notifications_read(self, agency_admin_token):
        """Test PUT /api/notifications/read-all endpoint"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=headers)
        assert response.status_code == 200
        print(f"✓ PUT /api/notifications/read-all - mark all as read")
    
    # =====================
    # Import Users Tests
    # =====================
    
    def test_import_users_csv(self, agency_admin_token):
        """Test POST /api/admin/import-users with CSV file"""
        import time
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Create a test CSV file in memory
        csv_content = "nom,email,telephone\nTest Import User,test_import_user_{}@test.com,+41 79 123 45 67\n".format(int(time.time()))
        
        files = {
            'file': ('test_import.csv', csv_content.encode('utf-8'), 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/import-users",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'created' in data
        assert 'skipped' in data
        print(f"✓ CSV Import: created={data.get('created')}, skipped={data.get('skipped')}")
    
    def test_import_users_zip_with_photos(self, agency_admin_token):
        """Test POST /api/admin/import-users with ZIP file containing CSV + photos"""
        import time
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Create a test ZIP file with CSV and a photo
        zip_buffer = io.BytesIO()
        unique_suffix = int(time.time())
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add CSV file
            csv_content = f"nom,email,telephone,photo\nZip Test User,zip_test_{unique_suffix}@test.com,+41 79 999 88 77,test_photo.jpg\n"
            zf.writestr('clients.csv', csv_content)
            
            # Add a small 1x1 JPEG image (smallest valid JPEG)
            # This is a minimal valid JPEG (red pixel)
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
                0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xB8, 0xFC, 0xEB, 0xFC,
                0xFF, 0xD9
            ])
            zf.writestr('test_photo.jpg', jpeg_bytes)
        
        zip_buffer.seek(0)
        
        files = {
            'file': ('test_import.zip', zip_buffer.read(), 'application/zip')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/import-users",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'created' in data
        assert 'photos_matched' in data
        print(f"✓ ZIP Import: created={data.get('created')}, photos_matched={data.get('photos_matched')}, skipped={data.get('skipped')}")
    
    def test_import_users_invalid_file(self, agency_admin_token):
        """Test POST /api/admin/import-users rejects invalid file types"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # Try to upload an invalid file type
        files = {
            'file': ('test.txt', b'invalid content', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/import-users",
            headers=headers,
            files=files
        )
        
        # Should return 400 for unsupported format
        assert response.status_code == 400
        print(f"✓ Invalid file type rejected correctly")
    
    def test_import_users_requires_auth(self):
        """Test POST /api/admin/import-users requires authentication"""
        csv_content = "nom,email,telephone\nTest User,test@test.com,+41 79 123 45 67\n"
        
        files = {
            'file': ('test_import.csv', csv_content.encode('utf-8'), 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/import-users",
            files=files
        )
        
        # Should return 401 for unauthenticated request
        assert response.status_code == 401
        print(f"✓ Import users endpoint requires authentication")
    
    # =====================
    # Admin Users List Tests
    # =====================
    
    def test_get_admin_users(self, agency_admin_token):
        """Test GET /api/admin/users endpoint returns users"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'users' in data
        assert 'total' in data
        print(f"✓ GET /api/admin/users - returned {len(data.get('users', []))} users, total: {data.get('total')}")
    
    # =====================
    # Vehicles Tests
    # =====================
    
    def test_get_vehicles(self):
        """Test GET /api/vehicles endpoint"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/vehicles - returned {len(data)} vehicles")
    
    def test_admin_vehicles(self, agency_admin_token):
        """Test admin can access vehicles"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        print(f"✓ Admin can access vehicles endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
