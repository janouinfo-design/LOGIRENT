"""
Backend tests for document upload functionality (ID card and driver's license)
Tests the POST /api/auth/upload-id and POST /api/auth/upload-license endpoints
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wonderful-franklin-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "client1@test.com"
TEST_PASSWORD = "test1234"

# Simple 1x1 pixel JPEG for testing
TINY_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFgABAQEAAAAAAAAAAAAAAAAAAgEA/8QAGhAAAwADAQAAAAAAAAAAAAAAAAECAyERMf/aAAgBAQAAPwB4IxEkj//Z"


class TestDocumentUpload:
    """Test suite for document upload endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_image_path(self, tmp_path_factory):
        """Create a temporary test image file"""
        test_dir = tmp_path_factory.mktemp("test_images")
        img_path = test_dir / "test_image.jpg"
        img_path.write_bytes(base64.b64decode(TINY_JPEG_BASE64))
        return str(img_path)
    
    def test_upload_id_endpoint_returns_200(self, auth_token, test_image_path):
        """POST /api/auth/upload-id should accept file upload and return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_id.jpg", f, "image/jpeg")}
            response = requests.post(
                f"{BASE_URL}/api/auth/upload-id",
                headers=headers,
                files=files
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "id_photo" in data
        assert data["id_photo"].startswith("data:image/jpeg;base64,")
        print(f"ID upload successful: {data['message']}")
    
    def test_upload_license_endpoint_returns_200(self, auth_token, test_image_path):
        """POST /api/auth/upload-license should accept file upload and return 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_license.jpg", f, "image/jpeg")}
            response = requests.post(
                f"{BASE_URL}/api/auth/upload-license",
                headers=headers,
                files=files
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "license_photo" in data
        assert data["license_photo"].startswith("data:image/jpeg;base64,")
        print(f"License upload successful: {data['message']}")
    
    def test_upload_id_persists_in_profile(self, auth_token, test_image_path):
        """Uploaded ID should persist and be retrievable from profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Upload ID
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_id.jpg", f, "image/jpeg")}
            upload_response = requests.post(
                f"{BASE_URL}/api/auth/upload-id",
                headers=headers,
                files=files
            )
        assert upload_response.status_code == 200
        uploaded_photo = upload_response.json()["id_photo"]
        
        # Get profile and verify
        profile_response = requests.get(
            f"{BASE_URL}/api/auth/profile",
            headers=headers
        )
        assert profile_response.status_code == 200
        profile = profile_response.json()
        
        assert profile["id_photo"] == uploaded_photo, "ID photo not persisted correctly"
        print("ID photo persisted and retrieved successfully")
    
    def test_upload_license_persists_in_profile(self, auth_token, test_image_path):
        """Uploaded license should persist and be retrievable from profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Upload license
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_license.jpg", f, "image/jpeg")}
            upload_response = requests.post(
                f"{BASE_URL}/api/auth/upload-license",
                headers=headers,
                files=files
            )
        assert upload_response.status_code == 200
        uploaded_photo = upload_response.json()["license_photo"]
        
        # Get profile and verify
        profile_response = requests.get(
            f"{BASE_URL}/api/auth/profile",
            headers=headers
        )
        assert profile_response.status_code == 200
        profile = profile_response.json()
        
        assert profile["license_photo"] == uploaded_photo, "License photo not persisted correctly"
        print("License photo persisted and retrieved successfully")
    
    def test_upload_id_without_auth_returns_401(self, test_image_path):
        """Upload without auth token should return 401"""
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_id.jpg", f, "image/jpeg")}
            response = requests.post(
                f"{BASE_URL}/api/auth/upload-id",
                files=files
            )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated upload correctly rejected with 401")
    
    def test_upload_license_without_auth_returns_401(self, test_image_path):
        """Upload without auth token should return 401"""
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_license.jpg", f, "image/jpeg")}
            response = requests.post(
                f"{BASE_URL}/api/auth/upload-license",
                files=files
            )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated upload correctly rejected with 401")
    
    def test_upload_id_with_invalid_token_returns_401(self, test_image_path):
        """Upload with invalid token should return 401"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        with open(test_image_path, "rb") as f:
            files = {"file": ("test_id.jpg", f, "image/jpeg")}
            response = requests.post(
                f"{BASE_URL}/api/auth/upload-id",
                headers=headers,
                files=files
            )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid token correctly rejected with 401")


class TestProfileEndpoints:
    """Test suite for profile-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_profile_returns_user_with_photo_fields(self, auth_token):
        """GET /api/auth/profile should return user with id_photo and license_photo fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/auth/profile",
            headers=headers
        )
        
        assert response.status_code == 200
        profile = response.json()
        
        # Check required fields exist
        assert "id" in profile
        assert "email" in profile
        assert "name" in profile
        assert "id_photo" in profile
        assert "license_photo" in profile
        
        print(f"Profile retrieved: {profile['name']} ({profile['email']})")
        print(f"  id_photo: {'Present' if profile['id_photo'] else 'Not uploaded'}")
        print(f"  license_photo: {'Present' if profile['license_photo'] else 'Not uploaded'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
