"""
Iteration 20: GPS Tracking Feature Tests
Tests for:
- GET /api/admin/my-agency/navixy - Get agency's Navixy config  
- PUT /api/admin/my-agency/navixy - Update agency's Navixy config
- GET /api/navixy/positions - Get tracker positions for agency admin
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://fleet-management-hub-9.preview.emergentagent.com')

class TestAuth:
    """Authentication tests for GPS feature"""
    
    def test_login_geneva_admin(self):
        """Test login for Geneva agency admin who has Navixy configured"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        print(f"Geneva admin login SUCCESS: {data['user']['email']}")
        return data["access_token"]
    
    def test_login_lausanne_admin(self):
        """Test login for Lausanne admin who may NOT have Navixy configured"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        # This user may not exist in the test database
        if response.status_code == 401:
            pytest.skip("admin@test.com user doesn't exist in DB - skipping")
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"Test admin login SUCCESS: {data['user']['email']}, role: {data['user']['role']}")


class TestNavixyConfig:
    """Test Navixy configuration endpoints for agency admins"""
    
    @pytest.fixture
    def geneva_token(self):
        """Get auth token for Geneva agency admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        if response.status_code != 200:
            pytest.skip("Geneva admin login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_admin_token(self):
        """Get auth token for test admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Test admin login failed")
        return response.json()["access_token"]
    
    def test_get_navixy_config_geneva(self, geneva_token):
        """Test GET /api/admin/my-agency/navixy returns config for Geneva agency"""
        headers = {"Authorization": f"Bearer {geneva_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/my-agency/navixy", headers=headers)
        
        assert response.status_code == 200, f"Failed to get config: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "navixy_api_url" in data, "Missing navixy_api_url"
        assert "navixy_hash" in data, "Missing navixy_hash"
        assert "configured" in data, "Missing configured flag"
        
        # Geneva should have Navixy configured
        assert data["configured"] == True, "Geneva agency should have Navixy configured"
        assert data["navixy_api_url"] == "https://login.logitrak.fr/api-v2", f"Unexpected API URL: {data['navixy_api_url']}"
        
        print(f"Geneva Navixy config: configured={data['configured']}, url={data['navixy_api_url']}")
    
    def test_get_navixy_config_unauthorized(self):
        """Test GET /api/admin/my-agency/navixy without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/my-agency/navixy")
        assert response.status_code == 401, "Should require authentication"
        print("Unauthorized access correctly rejected")
    
    def test_update_navixy_config(self, geneva_token):
        """Test PUT /api/admin/my-agency/navixy updates config"""
        headers = {"Authorization": f"Bearer {geneva_token}", "Content-Type": "application/json"}
        
        # First get current config
        response = requests.get(f"{BASE_URL}/api/admin/my-agency/navixy", headers=headers)
        original_url = response.json()["navixy_api_url"]
        original_hash = response.json()["navixy_hash"]
        
        # Update config (use same values to not break things)
        update_data = {
            "navixy_api_url": original_url,
            "navixy_hash": original_hash
        }
        response = requests.put(f"{BASE_URL}/api/admin/my-agency/navixy", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert "message" in data, "No confirmation message"
        print(f"Config update SUCCESS: {data['message']}")
        
        # Verify config persisted
        response = requests.get(f"{BASE_URL}/api/admin/my-agency/navixy", headers=headers)
        data = response.json()
        assert data["navixy_api_url"] == original_url, "URL not persisted"
        assert data["navixy_hash"] == original_hash, "Hash not persisted"
        print("Config persistence verified")


class TestNavixyPositions:
    """Test Navixy GPS positions endpoint"""
    
    @pytest.fixture
    def geneva_token(self):
        """Get auth token for Geneva agency admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        if response.status_code != 200:
            pytest.skip("Geneva admin login failed")
        return response.json()["access_token"]
    
    def test_get_positions_success(self, geneva_token):
        """Test GET /api/navixy/positions returns tracker positions"""
        headers = {"Authorization": f"Bearer {geneva_token}"}
        response = requests.get(f"{BASE_URL}/api/navixy/positions", headers=headers, timeout=30)
        
        assert response.status_code == 200, f"Failed to get positions: {response.text}"
        positions = response.json()
        
        # Should be a list
        assert isinstance(positions, list), "Positions should be a list"
        
        # Geneva has 26 trackers according to context
        print(f"Retrieved {len(positions)} tracker positions")
        
        # Validate structure of first position if available
        if len(positions) > 0:
            pos = positions[0]
            assert "tracker_id" in pos, "Missing tracker_id"
            assert "label" in pos, "Missing label"
            assert "lat" in pos, "Missing lat"
            assert "lng" in pos, "Missing lng"
            assert "speed" in pos, "Missing speed"
            assert "connection_status" in pos, "Missing connection_status"
            assert "movement_status" in pos, "Missing movement_status"
            print(f"First tracker: {pos['label']} - status: {pos['connection_status']}/{pos['movement_status']}")
    
    def test_get_positions_unauthorized(self):
        """Test GET /api/navixy/positions without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/navixy/positions")
        assert response.status_code == 401, "Should require authentication"
        print("Unauthorized access correctly rejected")
    
    def test_get_positions_client_forbidden(self):
        """Test that regular clients cannot access GPS positions"""
        # Login as client
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "client1@test.com",
            "password": "test1234"
        })
        if login_resp.status_code != 200:
            pytest.skip("Client login failed - user may not exist")
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/navixy/positions", headers=headers)
        assert response.status_code == 403, f"Should return 403 for clients, got {response.status_code}"
        print("Client access correctly forbidden")


class TestNavixyTrackers:
    """Test Navixy trackers list endpoint"""
    
    @pytest.fixture
    def geneva_token(self):
        """Get auth token for Geneva agency admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        if response.status_code != 200:
            pytest.skip("Geneva admin login failed")
        return response.json()["access_token"]
    
    def test_get_trackers_list(self, geneva_token):
        """Test GET /api/navixy/trackers returns tracker list"""
        headers = {"Authorization": f"Bearer {geneva_token}"}
        response = requests.get(f"{BASE_URL}/api/navixy/trackers", headers=headers, timeout=15)
        
        assert response.status_code == 200, f"Failed to get trackers: {response.text}"
        trackers = response.json()
        
        assert isinstance(trackers, list), "Trackers should be a list"
        print(f"Retrieved {len(trackers)} trackers from Navixy")
        
        if len(trackers) > 0:
            t = trackers[0]
            assert "id" in t, "Missing id"
            assert "label" in t, "Missing label"
            print(f"First tracker: ID={t['id']}, label={t['label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
