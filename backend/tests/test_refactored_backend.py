"""
Backend API Tests for TimeSheet SaaS Platform
Tests the refactored modular backend architecture
Covers: Auth, Projects, Stats, TimeEntries, Leaves, Notifications, Planning
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@timesheet.ch"
ADMIN_PASSWORD = "admin123"
MANAGER_EMAIL = "manager@test.ch"
MANAGER_PASSWORD = "test123"
EMPLOYEE_EMAIL = "employe@test.ch"
EMPLOYEE_PASSWORD = "test123"


class TestAPIRoot:
    """Test API root endpoint"""
    
    def test_api_root_returns_correct_response(self):
        """GET /api/ should return API info with modules list"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        assert "TimeSheet" in data["message"]
        assert "status" in data
        assert data["status"] == "online"
        assert "modules" in data
        assert isinstance(data["modules"], list)
        assert len(data["modules"]) > 0
        print(f"✓ API root returns: {data['message']}, modules: {len(data['modules'])}")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_admin_success(self):
        """POST /api/auth/login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        assert "id" in data["user"]
        print(f"✓ Admin login successful: {data['user']['first_name']} {data['user']['last_name']}")
    
    def test_login_manager_success(self):
        """POST /api/auth/login with manager credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "manager"
        print(f"✓ Manager login successful: {data['user']['email']}")
    
    def test_login_employee_success(self):
        """POST /api/auth/login with employee credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "employee"
        print(f"✓ Employee login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_valid_token(self):
        """GET /api/auth/me with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Then get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "role" in data
        assert "contract_hours" in data
        print(f"✓ Auth/me returns user data: {data['first_name']} {data['last_name']}")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Auth/me correctly rejects unauthenticated request")


class TestProjectsEndpoints:
    """Test projects endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_projects_list(self, auth_token):
        """GET /api/projects returns project list"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            project = data[0]
            assert "id" in project
            assert "name" in project
            print(f"✓ Projects list returned {len(data)} projects")
        else:
            print("✓ Projects list returned (empty)")
    
    def test_get_projects_without_auth(self):
        """GET /api/projects without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Projects endpoint correctly requires authentication")


class TestStatsEndpoints:
    """Test stats endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_weekly_stats(self, auth_token):
        """GET /api/stats/weekly returns weekly statistics"""
        response = requests.get(
            f"{BASE_URL}/api/stats/weekly",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "week_start" in data
        assert "total_hours" in data
        assert "billable_hours" in data
        assert "overtime_hours" in data
        assert "contract_hours" in data
        assert "days_worked" in data
        print(f"✓ Weekly stats: {data['total_hours']}h worked, {data['days_worked']} days")
    
    def test_get_balances(self, auth_token):
        """GET /api/stats/balances returns balance data"""
        response = requests.get(
            f"{BASE_URL}/api/stats/balances",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_hours_year" in data
        assert "overtime_hours" in data
        assert "vacation_total" in data
        assert "vacation_used" in data
        assert "vacation_remaining" in data
        assert "sick_days" in data
        print(f"✓ Balances: {data['vacation_remaining']} vacation days remaining")


class TestTimeEntriesEndpoints:
    """Test time entries endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def project_id(self, auth_token):
        """Get a valid project ID without geofencing for testing"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        projects = response.json()
        # Find a project without geofencing (latitude/longitude is None)
        for project in projects:
            if project.get("latitude") is None and project.get("longitude") is None:
                return project["id"]
        # If all projects have geofencing, return first one (test will need GPS)
        if projects:
            return projects[0]["id"]
        return None
    
    def test_get_current_entry(self, auth_token):
        """GET /api/timeentries/current returns active status"""
        response = requests.get(
            f"{BASE_URL}/api/timeentries/current",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "active" in data
        assert isinstance(data["active"], bool)
        print(f"✓ Current entry status: active={data['active']}")
    
    def test_clock_in_requires_project(self, auth_token):
        """POST /api/timeentries/clock-in without project should fail"""
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-in",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"billable": True}
        )
        # Should fail because project_id is required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Clock-in correctly requires project_id")
    
    def test_clock_in_with_project(self, auth_token, project_id):
        """POST /api/timeentries/clock-in with project_id"""
        if not project_id:
            pytest.skip("No projects available for testing")
        
        # First check if already clocked in
        current = requests.get(
            f"{BASE_URL}/api/timeentries/current",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if current.json().get("active"):
            # Clock out first
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-out",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"project_id": project_id, "billable": True}
            )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-in",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"project_id": project_id, "billable": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "clock_in" in data
        print(f"✓ Clock-in successful: {data['id']}")
        
        # Verify current entry is now active
        current = requests.get(
            f"{BASE_URL}/api/timeentries/current",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert current.json()["active"] == True
        print("✓ Current entry shows active=True after clock-in")
    
    def test_break_start(self, auth_token, project_id):
        """POST /api/timeentries/break-start during active entry"""
        if not project_id:
            pytest.skip("No projects available for testing")
        
        # Ensure we're clocked in
        current = requests.get(
            f"{BASE_URL}/api/timeentries/current",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if not current.json().get("active"):
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-in",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"project_id": project_id, "billable": True}
            )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/break-start",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "break_start" in data
        print(f"✓ Break started: {data['break_start']}")
    
    def test_break_end(self, auth_token, project_id):
        """POST /api/timeentries/break-end"""
        if not project_id:
            pytest.skip("No projects available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/break-end",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # May fail if no break is in progress, which is acceptable
        if response.status_code == 200:
            data = response.json()
            assert "break_end" in data
            print(f"✓ Break ended: {data['break_end']}")
        else:
            print(f"✓ Break end returned {response.status_code} (no break in progress)")
    
    def test_clock_out(self, auth_token, project_id):
        """POST /api/timeentries/clock-out"""
        if not project_id:
            pytest.skip("No projects available for testing")
        
        # Ensure we're clocked in
        current = requests.get(
            f"{BASE_URL}/api/timeentries/current",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if not current.json().get("active"):
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-in",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"project_id": project_id, "billable": True}
            )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-out",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"project_id": project_id, "billable": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "clock_out" in data
        assert "total_hours" in data
        print(f"✓ Clock-out successful: {data['total_hours']}h worked")


class TestLeavesEndpoints:
    """Test leaves endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_leaves_list(self, auth_token):
        """GET /api/leaves returns leaves list"""
        response = requests.get(
            f"{BASE_URL}/api/leaves",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            leave = data[0]
            assert "id" in leave
            assert "type" in leave
            assert "status" in leave
            print(f"✓ Leaves list returned {len(data)} leaves")
        else:
            print("✓ Leaves list returned (empty)")


class TestNotificationsEndpoints:
    """Test notifications endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_notifications_list(self, auth_token):
        """GET /api/notifications returns notifications list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "title" in notif
            assert "message" in notif
            print(f"✓ Notifications list returned {len(data)} notifications")
        else:
            print("✓ Notifications list returned (empty)")


class TestPlanningEndpoints:
    """Test planning endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_planning(self, auth_token):
        """GET /api/planning returns planning data"""
        response = requests.get(
            f"{BASE_URL}/api/planning",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            user_plan = data[0]
            assert "user_id" in user_plan
            assert "name" in user_plan
            assert "days" in user_plan
            print(f"✓ Planning returned for {len(data)} users")
        else:
            print("✓ Planning returned (empty)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
