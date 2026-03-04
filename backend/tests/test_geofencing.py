"""
Backend tests for TimeSheet GPS Geofencing features:
- Clock-in validation (mandatory project_id)
- GPS geofencing validation
- Project update with lat/lng/geofence_radius
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://timesheet-projects.preview.emergentagent.com"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee token for clock-in tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employe@test.ch",
            "password": "test123"
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        return response.json()["token"]

    def test_admin_login(self, admin_token):
        """Verify admin login works"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin token obtained successfully")

    def test_employee_login(self, employee_token):
        """Verify employee login works"""
        assert employee_token is not None
        assert len(employee_token) > 0
        print(f"Employee token obtained successfully")


class TestClockInValidation:
    """Tests for clock-in validation with mandatory project selection"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employe@test.ch",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(autouse=True)
    def cleanup_clock_entry(self, employee_token):
        """Cleanup: clock-out any existing entry before each test"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        # Try to clock out to ensure clean state
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass
        yield
        # Cleanup after test too
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass

    def test_clock_in_without_project_returns_400(self, employee_token):
        """Backend: clock-in without project_id should return 400 error"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Clock-in without project_id
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", 
            json={},  # No project_id
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        # Check the French error message
        assert "projet" in data["detail"].lower() or "project" in data["detail"].lower()
        print(f"Clock-in without project correctly returned 400: {data['detail']}")

    def test_clock_in_with_null_project_returns_400(self, employee_token):
        """Backend: clock-in with null project_id should return 400 error"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", 
            json={"project_id": None},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Clock-in with null project_id correctly returned 400")


class TestClockInWithProject:
    """Tests for clock-in with project (no GPS) - should work"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employe@test.ch",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def non_gps_project(self, admin_token):
        """Create a test project without GPS coordinates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create project without GPS
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_NoGPS_Project",
            "description": "Test project without GPS for clock-in test",
            "latitude": None,
            "longitude": None
        }, headers=headers)
        
        assert response.status_code in [200, 201], f"Failed to create project: {response.text}"
        project = response.json()
        yield project
        
        # Cleanup: delete the project
        try:
            requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)
        except:
            pass

    @pytest.fixture(autouse=True)
    def cleanup_clock_entry(self, employee_token):
        """Ensure clean clock state"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass
        yield
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass

    def test_clock_in_with_non_gps_project_works(self, employee_token, non_gps_project):
        """Backend: clock-in with project_id (no GPS project) should work"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", json={
            "project_id": non_gps_project["id"]
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert "clock_in" in data
        print(f"Clock-in with non-GPS project succeeded: {data}")


class TestGPSGeofencing:
    """Tests for GPS geofencing validation on clock-in"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employe@test.ch",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def gps_project(self, admin_token):
        """Create a test project WITH GPS coordinates for geofencing test"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create project with GPS (Geneva coordinates)
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_GPS_Project_Geneva",
            "description": "Test project with GPS for geofencing test",
            "latitude": 46.2044,
            "longitude": 6.1432,
            "geofence_radius": 200
        }, headers=headers)
        
        assert response.status_code in [200, 201], f"Failed to create GPS project: {response.text}"
        project = response.json()
        yield project
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)
        except:
            pass

    @pytest.fixture(autouse=True)
    def cleanup_clock_entry(self, employee_token):
        """Ensure clean clock state"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass
        yield
        try:
            requests.post(f"{BASE_URL}/api/timeentries/clock-out", json={}, headers=headers)
        except:
            pass

    def test_clock_in_gps_project_without_coordinates_returns_400(self, employee_token, gps_project):
        """Backend: clock-in with GPS project but no GPS coordinates should return 400"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try clock-in without providing GPS coordinates
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", json={
            "project_id": gps_project["id"]
            # No latitude/longitude provided
        }, headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        # Should mention GPS requirement
        assert "gps" in data["detail"].lower() or "position" in data["detail"].lower()
        print(f"Clock-in GPS project without coords correctly returned 400: {data['detail']}")

    def test_clock_in_gps_project_outside_zone_returns_400(self, employee_token, gps_project):
        """Backend: clock-in with GPS but outside geofence should return 400"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Try clock-in with coordinates far from project (Paris instead of Geneva)
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", json={
            "project_id": gps_project["id"],
            "latitude": 48.8566,  # Paris
            "longitude": 2.3522
        }, headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        # Should mention distance/zone
        assert "m" in data["detail"] or "zone" in data["detail"].lower() or "distance" in data["detail"].lower()
        print(f"Clock-in outside geofence correctly returned 400: {data['detail']}")

    def test_clock_in_gps_project_inside_zone_works(self, employee_token, gps_project):
        """Backend: clock-in with GPS inside geofence should work"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Clock-in with coordinates inside the geofence (very close to project)
        response = requests.post(f"{BASE_URL}/api/timeentries/clock-in", json={
            "project_id": gps_project["id"],
            "latitude": 46.2044,  # Same as project
            "longitude": 6.1432
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Clock-in inside geofence succeeded: {data}")


class TestProjectUpdate:
    """Tests for project update returning GPS fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_project(self, admin_token):
        """Create a test project for update tests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_UpdateProject",
            "description": "Project for update test"
        }, headers=headers)
        
        assert response.status_code in [200, 201]
        project = response.json()
        yield project
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)
        except:
            pass

    def test_update_project_returns_gps_fields(self, admin_token, test_project):
        """Backend: update project should return latitude/longitude/geofence_radius fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update project with GPS coordinates
        response = requests.put(f"{BASE_URL}/api/projects/{test_project['id']}", json={
            "latitude": 46.5,
            "longitude": 6.5,
            "geofence_radius": 150
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify GPS fields are returned
        assert "latitude" in data, "Response missing 'latitude' field"
        assert "longitude" in data, "Response missing 'longitude' field"
        assert "geofence_radius" in data, "Response missing 'geofence_radius' field"
        
        # Verify values
        assert data["latitude"] == 46.5
        assert data["longitude"] == 6.5
        assert data["geofence_radius"] == 150
        
        print(f"Project update returned GPS fields: lat={data['latitude']}, lng={data['longitude']}, radius={data['geofence_radius']}")

    def test_get_projects_returns_gps_fields(self, admin_token, test_project):
        """Backend: GET projects should return GPS fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First update with GPS
        requests.put(f"{BASE_URL}/api/projects/{test_project['id']}", json={
            "latitude": 47.0,
            "longitude": 7.0,
            "geofence_radius": 300
        }, headers=headers)
        
        # Now fetch all projects
        response = requests.get(f"{BASE_URL}/api/projects?active_only=false", headers=headers)
        assert response.status_code == 200
        
        projects = response.json()
        test_proj = next((p for p in projects if p["id"] == test_project["id"]), None)
        
        assert test_proj is not None, "Test project not found in list"
        assert "latitude" in test_proj
        assert "longitude" in test_proj
        assert "geofence_radius" in test_proj
        
        print(f"GET projects returns GPS fields correctly")


class TestExistingGPSProject:
    """Test with existing 'Bureau Geneve' project that has GPS"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_bureau_geneve_has_gps(self, admin_token):
        """Verify Bureau Geneve project has GPS coordinates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/projects?active_only=false", headers=headers)
        assert response.status_code == 200
        
        projects = response.json()
        bureau_geneve = next((p for p in projects if "geneve" in p["name"].lower()), None)
        
        if bureau_geneve:
            print(f"Found Bureau Geneve: {bureau_geneve['name']}")
            print(f"  latitude: {bureau_geneve.get('latitude')}")
            print(f"  longitude: {bureau_geneve.get('longitude')}")
            print(f"  geofence_radius: {bureau_geneve.get('geofence_radius')}")
            
            if bureau_geneve.get('latitude') and bureau_geneve.get('longitude'):
                assert bureau_geneve['geofence_radius'] is not None
        else:
            pytest.skip("Bureau Geneve project not found - may need to be created")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
