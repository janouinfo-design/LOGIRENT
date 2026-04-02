"""
Test suite for Vehicle Photos API - PUT /api/admin/vehicles/{id}/photos
Tests: photo update, delete (via update), reorder functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
VEHICLE_ID = "fa930c8f-4827-4022-bfe3-d34640d61457"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Use access_token (not token)
    return data.get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestVehiclePhotosAPI:
    """Test PUT /api/admin/vehicles/{id}/photos endpoint"""
    
    def test_get_vehicle_with_photos(self, api_client):
        """Verify vehicle exists and has photos"""
        response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        assert response.status_code == 200, f"Failed to get vehicle: {response.text}"
        
        data = response.json()
        assert data["id"] == VEHICLE_ID
        assert "photos" in data
        print(f"Vehicle has {len(data.get('photos', []))} photos")
    
    def test_update_photos_endpoint_exists(self, api_client):
        """Test that PUT /api/admin/vehicles/{id}/photos endpoint exists"""
        # Get current photos first
        get_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        current_photos = get_response.json().get("photos", [])
        
        # Try to update with same photos (no change)
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": current_photos}
        )
        assert response.status_code == 200, f"PUT photos endpoint failed: {response.text}"
        
        data = response.json()
        assert "photos" in data or "message" in data
        print(f"PUT photos response: {data}")
    
    def test_add_photo_via_update(self, api_client):
        """Test adding a new photo via PUT endpoint"""
        # Get current photos
        get_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        current_photos = get_response.json().get("photos", [])
        original_count = len(current_photos)
        
        # Add a test photo URL
        test_photo = "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=500&fit=crop&q=80"
        new_photos = current_photos + [test_photo]
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": new_photos}
        )
        assert response.status_code == 200, f"Add photo failed: {response.text}"
        
        # Verify photo was added
        verify_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        updated_photos = verify_response.json().get("photos", [])
        assert len(updated_photos) == original_count + 1, "Photo count should increase by 1"
        assert test_photo in updated_photos, "New photo should be in the list"
        print(f"Photo added successfully. Count: {original_count} -> {len(updated_photos)}")
    
    def test_reorder_photos(self, api_client):
        """Test reordering photos via PUT endpoint"""
        # Get current photos
        get_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        current_photos = get_response.json().get("photos", [])
        
        if len(current_photos) < 2:
            pytest.skip("Need at least 2 photos to test reorder")
        
        # Reverse the order
        reordered_photos = list(reversed(current_photos))
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": reordered_photos}
        )
        assert response.status_code == 200, f"Reorder failed: {response.text}"
        
        # Verify order changed
        verify_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        updated_photos = verify_response.json().get("photos", [])
        assert updated_photos == reordered_photos, "Photos should be in reversed order"
        print(f"Photos reordered successfully. First photo is now: {updated_photos[0][:50]}...")
    
    def test_delete_photo_via_update(self, api_client):
        """Test deleting a photo by removing it from the array"""
        # Get current photos
        get_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        current_photos = get_response.json().get("photos", [])
        original_count = len(current_photos)
        
        if original_count < 1:
            pytest.skip("No photos to delete")
        
        # Remove the last photo
        new_photos = current_photos[:-1]
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": new_photos}
        )
        assert response.status_code == 200, f"Delete photo failed: {response.text}"
        
        # Verify photo was removed
        verify_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        updated_photos = verify_response.json().get("photos", [])
        assert len(updated_photos) == original_count - 1, "Photo count should decrease by 1"
        print(f"Photo deleted successfully. Count: {original_count} -> {len(updated_photos)}")
    
    def test_restore_original_photo(self, api_client):
        """Restore the original photo for the vehicle"""
        original_photo = "https://images.unsplash.com/photo-1519245659620-e859806a8d7b?w=800&h=500&fit=crop&q=80"
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": [original_photo]}
        )
        assert response.status_code == 200, f"Restore failed: {response.text}"
        
        # Verify restoration
        verify_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        updated_photos = verify_response.json().get("photos", [])
        assert len(updated_photos) == 1
        assert updated_photos[0] == original_photo
        print("Original photo restored successfully")


class TestVehiclePhotosValidation:
    """Test validation and edge cases for photos endpoint"""
    
    def test_update_photos_empty_array(self, api_client):
        """Test setting photos to empty array"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": []}
        )
        assert response.status_code == 200, f"Empty photos update failed: {response.text}"
        
        # Verify photos are empty
        verify_response = api_client.get(f"{BASE_URL}/api/vehicles/{VEHICLE_ID}")
        updated_photos = verify_response.json().get("photos", [])
        assert len(updated_photos) == 0, "Photos should be empty"
        print("Photos cleared successfully")
    
    def test_update_photos_invalid_vehicle(self, api_client):
        """Test updating photos for non-existent vehicle"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/non-existent-id/photos",
            json={"photos": ["https://example.com/photo.jpg"]}
        )
        assert response.status_code == 404, "Should return 404 for non-existent vehicle"
        print("Correctly returns 404 for non-existent vehicle")
    
    def test_restore_photo_after_tests(self, api_client):
        """Cleanup: Restore original photo"""
        original_photo = "https://images.unsplash.com/photo-1519245659620-e859806a8d7b?w=800&h=500&fit=crop&q=80"
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/vehicles/{VEHICLE_ID}/photos",
            json={"photos": [original_photo]}
        )
        assert response.status_code == 200
        print("Test cleanup: Original photo restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
