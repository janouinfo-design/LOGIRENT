"""
Backend API tests for new TimeSheet features:
- /api/stats/balances - vacation, overtime, telework data
- /api/planning - employees with daily status
- /api/expenses - CRUD operations (create, list, approve, reject)
- /api/directory - all employees with current status
- /api/notifications - notification endpoints
- /api/invoices - invoice management (manager/admin)
- /api/audit-logs - audit log viewer (admin only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@timesheet.ch"
ADMIN_PASSWORD = "admin123"
EMPLOYEE_EMAIL = "employe@test.ch"
EMPLOYEE_PASSWORD = "test123"
MANAGER_EMAIL = "manager@test.ch"
MANAGER_PASSWORD = "test123"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful, role={data['user']['role']}")
    
    def test_employee_login(self):
        """Test employee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"PASS: Employee login successful")


class TestStatsBalances:
    """Tests for /api/stats/balances endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_balances(self, admin_token):
        """Test GET /api/stats/balances returns vacation, overtime, telework data"""
        response = requests.get(
            f"{BASE_URL}/api/stats/balances",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            'total_hours_year', 'overtime_hours', 'contract_hours_week',
            'vacation_total', 'vacation_used', 'vacation_remaining',
            'sick_days', 'month_hours', 'month_target',
            'telework_days', 'office_days', 'onsite_days'
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: /api/stats/balances returns all required fields")
        print(f"  - vacation_remaining: {data['vacation_remaining']}")
        print(f"  - overtime_hours: {data['overtime_hours']}")
        print(f"  - telework_days: {data['telework_days']}")


class TestPlanning:
    """Tests for /api/planning endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_planning(self, admin_token):
        """Test GET /api/planning returns employees with daily status"""
        response = requests.get(
            f"{BASE_URL}/api/planning",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Planning should return a list"
        print(f"PASS: /api/planning returns {len(data)} employees")
        
        # Check structure if data exists
        if len(data) > 0:
            emp = data[0]
            assert "user_id" in emp
            assert "name" in emp
            assert "days" in emp
            assert isinstance(emp["days"], dict)
            print(f"  - First employee: {emp['name']}")
            print(f"  - Days data: {len(emp['days'])} entries")
    
    def test_planning_with_date_range(self, admin_token):
        """Test planning with date range filter"""
        response = requests.get(
            f"{BASE_URL}/api/planning?start_date=2025-01-01&end_date=2025-01-07",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print("PASS: Planning with date range filter works")


class TestExpenses:
    """Tests for /api/expenses CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_expense(self, admin_token):
        """Test POST /api/expenses - create expense"""
        response = requests.post(
            f"{BASE_URL}/api/expenses?amount=75&category=Transport&description=TEST_expense_creation",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "message" in data
        print(f"PASS: Expense created with id={data['id']}")
        return data["id"]
    
    def test_list_expenses(self, admin_token):
        """Test GET /api/expenses - list expenses"""
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} expenses")
        
        # Verify structure if data exists
        if len(data) > 0:
            exp = data[0]
            assert "id" in exp
            assert "amount" in exp
            assert "category" in exp
            assert "status" in exp
    
    def test_approve_expense(self, admin_token):
        """Test POST /api/expenses/{id}/approve"""
        # First create an expense
        create_resp = requests.post(
            f"{BASE_URL}/api/expenses?amount=50&category=Repas&description=TEST_approve_expense",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        expense_id = create_resp.json()["id"]
        
        # Approve it
        response = requests.post(
            f"{BASE_URL}/api/expenses/{expense_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Expense {expense_id} approved")
    
    def test_reject_expense(self, admin_token):
        """Test POST /api/expenses/{id}/reject"""
        # First create an expense
        create_resp = requests.post(
            f"{BASE_URL}/api/expenses?amount=30&category=Autre&description=TEST_reject_expense",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        expense_id = create_resp.json()["id"]
        
        # Reject it
        response = requests.post(
            f"{BASE_URL}/api/expenses/{expense_id}/reject",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Expense {expense_id} rejected")


class TestDirectory:
    """Tests for /api/directory endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_directory(self, admin_token):
        """Test GET /api/directory returns all employees with current status"""
        response = requests.get(
            f"{BASE_URL}/api/directory",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Directory should return a list"
        print(f"PASS: /api/directory returns {len(data)} employees")
        
        # Check structure if data exists
        if len(data) > 0:
            emp = data[0]
            expected_fields = ["id", "first_name", "last_name", "email", "role", "status"]
            for field in expected_fields:
                assert field in emp, f"Missing field: {field}"
            print(f"  - First employee: {emp['first_name']} {emp['last_name']}, status={emp['status']}")


class TestNotifications:
    """Tests for /api/notifications endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_notifications(self, admin_token):
        """Test GET /api/notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} notifications")
    
    def test_get_unread_count(self, admin_token):
        """Test GET /api/notifications/count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "unread_count" in data
        print(f"PASS: Unread count = {data['unread_count']}")
    
    def test_mark_all_read(self, admin_token):
        """Test POST /api/notifications/read-all"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print("PASS: Mark all notifications read")


class TestInvoices:
    """Tests for /api/invoices endpoints (manager/admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_invoices_as_admin(self, admin_token):
        """Test GET /api/invoices as admin"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin listed {len(data)} invoices")
    
    def test_get_invoices_as_employee_forbidden(self, employee_token):
        """Test GET /api/invoices as employee should be forbidden"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Employee cannot access invoices (403)")


class TestAuditLogs:
    """Tests for /api/audit-logs endpoints (admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_audit_logs_as_admin(self, admin_token):
        """Test GET /api/audit-logs as admin"""
        response = requests.get(
            f"{BASE_URL}/api/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin listed {len(data)} audit logs")
        
        # Check structure if data exists
        if len(data) > 0:
            log = data[0]
            expected_fields = ["id", "user_id", "action", "entity", "timestamp"]
            for field in expected_fields:
                assert field in log, f"Missing field: {field}"
    
    def test_get_audit_logs_as_employee_forbidden(self, employee_token):
        """Test GET /api/audit-logs as employee should be forbidden"""
        response = requests.get(
            f"{BASE_URL}/api/audit-logs",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Employee cannot access audit logs (403)")


class TestReports:
    """Tests for /api/reports endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_download_pdf_report(self, admin_token):
        """Test GET /api/reports/pdf"""
        response = requests.get(
            f"{BASE_URL}/api/reports/pdf?month=1&year=2025",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "application/pdf" in response.headers.get("content-type", "")
        print("PASS: PDF report generated")
    
    def test_download_excel_report(self, admin_token):
        """Test GET /api/reports/excel"""
        response = requests.get(
            f"{BASE_URL}/api/reports/excel?month=1&year=2025",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print("PASS: Excel report generated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
