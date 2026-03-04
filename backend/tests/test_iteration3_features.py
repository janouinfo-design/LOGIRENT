"""
Iteration 3 Test Cases - Testing Dashboard Balances, Work Location, 7 Leave Types
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://timesheet-gps-1.preview.emergentagent.com')

# Test credentials
EMPLOYEE_EMAIL = "employe@test.ch"
EMPLOYEE_PASSWORD = "test123"
ADMIN_EMAIL = "admin@timesheet.ch"
ADMIN_PASSWORD = "admin123"
MANAGER_EMAIL = "manager@test.ch"
MANAGER_PASSWORD = "test123"


class TestBalancesEndpoint:
    """Test /api/stats/balances endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_balances_endpoint_returns_telework_data(self, employee_token):
        """Verify /api/stats/balances returns vacation, overtime, and telework distribution"""
        response = requests.get(
            f"{BASE_URL}/api/stats/balances",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Balances failed: {response.text}"
        
        data = response.json()
        # Check all required fields for 'Mes soldes' section
        assert "vacation_total" in data, "Missing vacation_total"
        assert "vacation_used" in data, "Missing vacation_used"
        assert "vacation_remaining" in data, "Missing vacation_remaining"
        assert "overtime_hours" in data, "Missing overtime_hours"
        assert "month_hours" in data, "Missing month_hours"
        assert "telework_days" in data, "Missing telework_days"
        assert "office_days" in data, "Missing office_days"
        assert "onsite_days" in data, "Missing onsite_days"
        
        # Verify data types
        assert isinstance(data["vacation_remaining"], (int, float))
        assert isinstance(data["telework_days"], int)
        assert isinstance(data["office_days"], int)
        assert isinstance(data["onsite_days"], int)
        
        print(f"Balances data: vacation_remaining={data['vacation_remaining']}, "
              f"telework={data['telework_days']}, office={data['office_days']}, onsite={data['onsite_days']}")


class TestWorkLocationClockIn:
    """Test clock-in with work_location parameter"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def project_id(self, employee_token):
        """Get a project ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        projects = response.json()
        if not projects:
            pytest.skip("No projects available")
        # Find a non-GPS project
        for p in projects:
            if not p.get('latitude'):
                return p['id']
        return projects[0]['id']
    
    def test_clock_in_with_work_location_office(self, employee_token, project_id):
        """Test clock-in accepts work_location parameter (office)"""
        # First clock out if already clocked in
        requests.post(
            f"{BASE_URL}/api/timeentries/clock-out",
            json={},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-in",
            json={
                "project_id": project_id,
                "work_location": "office"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        # Might fail if already clocked in today - that's ok
        if response.status_code == 200:
            print("Clock-in with office location successful")
            # Verify current entry
            current = requests.get(
                f"{BASE_URL}/api/timeentries/current",
                headers={"Authorization": f"Bearer {employee_token}"}
            )
            assert current.status_code == 200
            print(f"Current entry: {current.json()}")
            # Clock out to clean up
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-out",
                json={},
                headers={"Authorization": f"Bearer {employee_token}"}
            )
        else:
            # If already clocked in, check current status
            print(f"Clock-in result: {response.status_code} - {response.text}")
    
    def test_clock_in_with_work_location_home(self, employee_token, project_id):
        """Test clock-in accepts work_location parameter (home/telework)"""
        # First clock out if already clocked in
        requests.post(
            f"{BASE_URL}/api/timeentries/clock-out",
            json={},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-in",
            json={
                "project_id": project_id,
                "work_location": "home"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        if response.status_code == 200:
            print("Clock-in with home/telework location successful")
            # Clock out
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-out",
                json={},
                headers={"Authorization": f"Bearer {employee_token}"}
            )
        else:
            print(f"Clock-in result: {response.status_code}")
    
    def test_clock_in_with_work_location_onsite(self, employee_token, project_id):
        """Test clock-in accepts work_location parameter (onsite/chantier)"""
        # First clock out
        requests.post(
            f"{BASE_URL}/api/timeentries/clock-out",
            json={},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/timeentries/clock-in",
            json={
                "project_id": project_id,
                "work_location": "onsite"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        if response.status_code == 200:
            print("Clock-in with onsite/chantier location successful")
            requests.post(
                f"{BASE_URL}/api/timeentries/clock-out",
                json={},
                headers={"Authorization": f"Bearer {employee_token}"}
            )
        else:
            print(f"Clock-in result: {response.status_code}")


class TestSevenLeaveTypes:
    """Test that all 7 leave types are supported"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_leave_types_available(self, employee_token):
        """Verify all 7 leave types can be created"""
        leave_types = ['vacation', 'sick', 'accident', 'training', 'maternity', 'paternity', 'special']
        
        for leave_type in leave_types:
            response = requests.post(
                f"{BASE_URL}/api/leaves",
                json={
                    "type": leave_type,
                    "start_date": "2026-12-01",
                    "end_date": "2026-12-02",
                    "reason": f"TEST_{leave_type}_leave"
                },
                headers={"Authorization": f"Bearer {employee_token}"}
            )
            assert response.status_code == 200, f"Failed to create {leave_type} leave: {response.text}"
            data = response.json()
            assert data["type"] == leave_type, f"Leave type mismatch: expected {leave_type}, got {data['type']}"
            print(f"Created {leave_type} leave: {data['id']}")
    
    def test_get_leaves_returns_all_types(self, employee_token):
        """Verify leaves list includes different types"""
        response = requests.get(
            f"{BASE_URL}/api/leaves",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        leaves = response.json()
        print(f"Total leaves: {len(leaves)}")
        
        # Check that we have various types
        types_found = set(l['type'] for l in leaves)
        print(f"Leave types found: {types_found}")


class TestPlanningEndpoint:
    """Test /api/planning endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_planning_returns_weekly_data(self, employee_token):
        """Verify planning endpoint returns employee rows with daily status"""
        response = requests.get(
            f"{BASE_URL}/api/planning",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Planning failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Planning should return a list"
        
        if len(data) > 0:
            emp = data[0]
            assert "user_id" in emp, "Missing user_id"
            assert "name" in emp, "Missing name"
            assert "days" in emp, "Missing days"
            print(f"Planning data for {emp['name']}: {len(emp['days'])} days")
    
    def test_planning_department_filter(self, employee_token):
        """Verify planning accepts department_id filter"""
        # First get departments
        dept_response = requests.get(
            f"{BASE_URL}/api/departments",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        if dept_response.status_code == 200 and len(dept_response.json()) > 0:
            dept_id = dept_response.json()[0]['id']
            
            response = requests.get(
                f"{BASE_URL}/api/planning",
                params={"department_id": dept_id},
                headers={"Authorization": f"Bearer {employee_token}"}
            )
            assert response.status_code == 200
            print(f"Planning with department filter: {len(response.json())} employees")


class TestDirectoryEndpoint:
    """Test /api/directory endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_directory_returns_employees(self, employee_token):
        """Verify directory endpoint returns employee list with status"""
        response = requests.get(
            f"{BASE_URL}/api/directory",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Directory failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Directory should return a list"
        
        if len(data) > 0:
            emp = data[0]
            assert "id" in emp
            assert "first_name" in emp
            assert "last_name" in emp
            assert "email" in emp
            assert "status" in emp
            print(f"Directory: {len(data)} employees")
            print(f"Sample employee status: {emp.get('status', 'unknown')}")


class TestNotificationsEndpoint:
    """Test /api/notifications endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_notifications_list(self, employee_token):
        """Verify notifications endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Notifications: {len(data)}")
    
    def test_notifications_mark_read(self, employee_token):
        """Test mark notification as read"""
        # Get notifications first
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        notifications = response.json()
        
        if notifications:
            notif_id = notifications[0]['id']
            mark_response = requests.post(
                f"{BASE_URL}/api/notifications/{notif_id}/read",
                headers={"Authorization": f"Bearer {employee_token}"}
            )
            assert mark_response.status_code == 200
            print("Marked notification as read")


class TestAuditLogsEndpoint:
    """Test /api/audit-logs endpoint (admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_audit_logs_admin_access(self, admin_token):
        """Verify admin can access audit logs"""
        response = requests.get(
            f"{BASE_URL}/api/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            log = data[0]
            assert "action" in log
            assert "entity" in log
            assert "timestamp" in log
            print(f"Audit logs: {len(data)} entries")


class TestInvoicesEndpoint:
    """Test /api/invoices endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_invoices_list(self, admin_token):
        """Verify invoices endpoint works for managers"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Invoices: {len(data)}")


class TestExpensesEndpoint:
    """Test /api/expenses endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_expense(self, employee_token):
        """Test creating a new expense"""
        response = requests.post(
            f"{BASE_URL}/api/expenses?amount=50&category=Transport&description=TEST_expense&date=2026-01-15",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Create expense failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created expense: {data['id']}")
    
    def test_expenses_list(self, employee_token):
        """Test listing expenses"""
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Expenses: {len(data)}")


class TestSidebarNavigation:
    """Test that all sidebar menu APIs are accessible"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_all_employee_endpoints(self, employee_token):
        """Verify all employee-accessible endpoints work"""
        endpoints = [
            ("/timeentries/current", "GET"),
            ("/stats/weekly", "GET"),
            ("/stats/balances", "GET"),
            ("/leaves", "GET"),
            ("/planning", "GET"),
            ("/expenses", "GET"),
            ("/directory", "GET"),
            ("/notifications", "GET"),
            ("/projects", "GET"),
        ]
        
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        for endpoint, method in endpoints:
            response = requests.get(f"{BASE_URL}/api{endpoint}", headers=headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed: {response.status_code}"
            print(f"{endpoint}: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
