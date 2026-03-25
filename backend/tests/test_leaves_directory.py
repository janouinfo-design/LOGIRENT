"""
Backend Tests for Leaves (Absences) and Directory (Annuaire) Features
Tests PUT /api/leaves/{id}, DELETE /api/leaves/{id} endpoints
Tests GET /api/directory and PUT /api/users/{id} endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-payroll.preview.emergentagent.com')

class TestLeavesEndpoints:
    """Tests for leave/absence management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin to get token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json()['token']
        self.admin_id = login_resp.json()['user']['id']
        self.session.headers.update({'Authorization': f'Bearer {self.admin_token}'})
        
        # Login as employee for employee-specific tests
        emp_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employe@test.ch",
            "password": "test123"
        })
        if emp_login.status_code == 200:
            self.emp_token = emp_login.json()['token']
            self.emp_id = emp_login.json()['user']['id']
        else:
            self.emp_token = None
            self.emp_id = None
    
    def test_get_leaves_endpoint(self):
        """Test GET /api/leaves returns list of leaves"""
        response = self.session.get(f"{BASE_URL}/api/leaves")
        assert response.status_code == 200, f"GET /api/leaves failed: {response.text}"
        leaves = response.json()
        assert isinstance(leaves, list), "Response should be a list"
        print(f"Found {len(leaves)} leaves")
    
    def test_create_leave_endpoint(self):
        """Test POST /api/leaves creates a new leave"""
        leave_data = {
            "type": "vacation",
            "start_date": "2026-02-15",
            "end_date": "2026-02-20",
            "reason": "TEST_Leave_Create"
        }
        response = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert response.status_code == 200, f"POST /api/leaves failed: {response.text}"
        created = response.json()
        assert "id" in created, "Response should contain id"
        assert created["type"] == "vacation", "Type should match"
        assert created["status"] == "pending", "Initial status should be pending"
        self.created_leave_id = created["id"]
        print(f"Created leave with id: {self.created_leave_id}")
        return created["id"]
    
    def test_update_leave_endpoint(self):
        """Test PUT /api/leaves/{id} updates a leave"""
        # First create a leave
        leave_data = {
            "type": "vacation",
            "start_date": "2026-03-01",
            "end_date": "2026-03-05",
            "reason": "TEST_Leave_Update_Original"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert create_resp.status_code == 200, f"Failed to create leave: {create_resp.text}"
        leave_id = create_resp.json()["id"]
        
        # Now update it
        update_data = {
            "type": "sick",
            "start_date": "2026-03-02",
            "end_date": "2026-03-06",
            "reason": "TEST_Leave_Update_Modified"
        }
        update_resp = self.session.put(f"{BASE_URL}/api/leaves/{leave_id}", json=update_data)
        assert update_resp.status_code == 200, f"PUT /api/leaves/{leave_id} failed: {update_resp.text}"
        assert "message" in update_resp.json(), "Response should contain message"
        print(f"Successfully updated leave {leave_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/leaves/{leave_id}")
    
    def test_delete_leave_endpoint(self):
        """Test DELETE /api/leaves/{id} removes a leave"""
        # First create a leave
        leave_data = {
            "type": "training",
            "start_date": "2026-04-01",
            "end_date": "2026-04-03",
            "reason": "TEST_Leave_Delete"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert create_resp.status_code == 200, f"Failed to create leave: {create_resp.text}"
        leave_id = create_resp.json()["id"]
        
        # Now delete it
        delete_resp = self.session.delete(f"{BASE_URL}/api/leaves/{leave_id}")
        assert delete_resp.status_code == 200, f"DELETE /api/leaves/{leave_id} failed: {delete_resp.text}"
        
        # Verify deletion
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        deleted_ids = [l["id"] for l in leaves]
        assert leave_id not in deleted_ids, "Leave should be deleted"
        print(f"Successfully deleted leave {leave_id}")
    
    def test_update_leave_404_not_found(self):
        """Test PUT /api/leaves/{id} returns 404 for non-existent leave"""
        fake_id = "000000000000000000000000"
        update_data = {
            "type": "sick",
            "start_date": "2026-01-01",
            "end_date": "2026-01-02",
            "reason": "Test"
        }
        response = self.session.put(f"{BASE_URL}/api/leaves/{fake_id}", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returns 404 for non-existent leave")
    
    def test_delete_leave_404_not_found(self):
        """Test DELETE /api/leaves/{id} returns 404 for non-existent leave"""
        fake_id = "000000000000000000000000"
        response = self.session.delete(f"{BASE_URL}/api/leaves/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returns 404 for non-existent leave")
    
    def test_leave_crud_full_cycle(self):
        """Test full CRUD cycle: Create -> Read -> Update -> Delete"""
        # CREATE
        leave_data = {
            "type": "special",
            "start_date": "2026-05-01",
            "end_date": "2026-05-02",
            "reason": "TEST_CRUD_Cycle"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert create_resp.status_code == 200
        leave_id = create_resp.json()["id"]
        print(f"CREATE: Leave {leave_id} created")
        
        # READ - verify in list
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        found = [l for l in leaves if l["id"] == leave_id]
        assert len(found) == 1, "Leave should be in list"
        assert found[0]["reason"] == "TEST_CRUD_Cycle"
        print(f"READ: Leave {leave_id} found in list")
        
        # UPDATE
        update_data = {
            "type": "accident",
            "start_date": "2026-05-03",
            "end_date": "2026-05-05",
            "reason": "TEST_CRUD_Cycle_Updated"
        }
        update_resp = self.session.put(f"{BASE_URL}/api/leaves/{leave_id}", json=update_data)
        assert update_resp.status_code == 200
        print(f"UPDATE: Leave {leave_id} updated")
        
        # Verify update
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        found = [l for l in leaves if l["id"] == leave_id]
        assert found[0]["type"] == "accident", "Type should be updated to accident"
        assert found[0]["reason"] == "TEST_CRUD_Cycle_Updated", "Reason should be updated"
        print(f"UPDATE VERIFIED: Leave {leave_id} data is correct")
        
        # DELETE
        delete_resp = self.session.delete(f"{BASE_URL}/api/leaves/{leave_id}")
        assert delete_resp.status_code == 200
        
        # Verify deletion
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        found = [l for l in leaves if l["id"] == leave_id]
        assert len(found) == 0, "Leave should be deleted"
        print(f"DELETE: Leave {leave_id} deleted and verified")


class TestDirectoryEndpoints:
    """Tests for employee directory endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as manager to get token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as manager
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manager@test.ch",
            "password": "test123"
        })
        assert login_resp.status_code == 200, f"Manager login failed: {login_resp.text}"
        self.token = login_resp.json()['token']
        self.user_id = login_resp.json()['user']['id']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
    
    def test_get_directory_endpoint(self):
        """Test GET /api/directory returns list of employees"""
        response = self.session.get(f"{BASE_URL}/api/directory")
        assert response.status_code == 200, f"GET /api/directory failed: {response.text}"
        employees = response.json()
        assert isinstance(employees, list), "Response should be a list"
        assert len(employees) > 0, "Should have at least one employee"
        
        # Verify employee structure
        emp = employees[0]
        required_fields = ['id', 'first_name', 'last_name', 'email', 'role', 'status']
        for field in required_fields:
            assert field in emp, f"Employee should have {field} field"
        
        print(f"Found {len(employees)} employees in directory")
        return employees
    
    def test_directory_employee_search_fields(self):
        """Test that directory returns fields needed for search"""
        response = self.session.get(f"{BASE_URL}/api/directory")
        assert response.status_code == 200
        employees = response.json()
        
        for emp in employees:
            # Fields needed for search functionality
            assert 'first_name' in emp
            assert 'last_name' in emp
            assert 'email' in emp
            # Department may be null but should exist
            assert 'department' in emp or emp.get('department') is None
        
        print("All employees have search-required fields")
    
    def test_get_users_endpoint(self):
        """Test GET /api/users returns list (manager/admin only)"""
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"GET /api/users failed: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Response should be a list"
        print(f"Found {len(users)} users via /api/users")
    
    def test_update_user_endpoint(self):
        """Test PUT /api/users/{id} updates user data"""
        # Get current user list
        users_resp = self.session.get(f"{BASE_URL}/api/users")
        users = users_resp.json()
        
        # Find an employee to update (not admin/manager)
        target_user = None
        for u in users:
            if u['role'] == 'employee':
                target_user = u
                break
        
        if not target_user:
            pytest.skip("No employee user found to test update")
        
        original_phone = target_user.get('phone', '')
        
        # Update phone
        update_data = {"phone": "+41 79 TEST 001"}
        update_resp = self.session.put(f"{BASE_URL}/api/users/{target_user['id']}", json=update_data)
        assert update_resp.status_code == 200, f"PUT /api/users/{target_user['id']} failed: {update_resp.text}"
        print(f"Updated user {target_user['id']} phone")
        
        # Verify update via directory
        dir_resp = self.session.get(f"{BASE_URL}/api/directory")
        dir_users = dir_resp.json()
        updated = [u for u in dir_users if u['id'] == target_user['id']]
        assert len(updated) == 1
        assert updated[0]['phone'] == "+41 79 TEST 001", "Phone should be updated"
        print(f"Verified update in directory")
        
        # Restore original phone
        restore_data = {"phone": original_phone}
        self.session.put(f"{BASE_URL}/api/users/{target_user['id']}", json=restore_data)
    
    def test_update_user_contract_hours(self):
        """Test updating contract_hours via PUT /api/users/{id}"""
        users_resp = self.session.get(f"{BASE_URL}/api/users")
        users = users_resp.json()
        
        target_user = None
        for u in users:
            if u['role'] == 'employee':
                target_user = u
                break
        
        if not target_user:
            pytest.skip("No employee user found")
        
        original_hours = target_user.get('contract_hours', 42)
        
        # Update contract hours
        update_data = {"contract_hours": 40.0}
        update_resp = self.session.put(f"{BASE_URL}/api/users/{target_user['id']}", json=update_data)
        assert update_resp.status_code == 200, f"Failed to update contract hours: {update_resp.text}"
        
        # Verify via users endpoint
        users_resp = self.session.get(f"{BASE_URL}/api/users")
        users = users_resp.json()
        updated = [u for u in users if u['id'] == target_user['id']]
        assert len(updated) == 1
        assert updated[0]['contract_hours'] == 40.0, "Contract hours should be updated"
        print(f"Successfully updated contract_hours for user {target_user['id']}")
        
        # Restore
        self.session.put(f"{BASE_URL}/api/users/{target_user['id']}", json={"contract_hours": original_hours})


class TestLeaveFiltering:
    """Tests for leave filtering by status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()['token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
    
    def test_get_leaves_filter_by_status_pending(self):
        """Test GET /api/leaves?status=pending"""
        response = self.session.get(f"{BASE_URL}/api/leaves", params={"status": "pending"})
        assert response.status_code == 200
        leaves = response.json()
        for l in leaves:
            assert l["status"] == "pending", "All leaves should be pending"
        print(f"Found {len(leaves)} pending leaves")
    
    def test_get_leaves_filter_by_status_approved(self):
        """Test GET /api/leaves?status=approved"""
        response = self.session.get(f"{BASE_URL}/api/leaves", params={"status": "approved"})
        assert response.status_code == 200
        leaves = response.json()
        for l in leaves:
            assert l["status"] == "approved", "All leaves should be approved"
        print(f"Found {len(leaves)} approved leaves")
    
    def test_get_leaves_filter_by_status_rejected(self):
        """Test GET /api/leaves?status=rejected"""
        response = self.session.get(f"{BASE_URL}/api/leaves", params={"status": "rejected"})
        assert response.status_code == 200
        leaves = response.json()
        for l in leaves:
            assert l["status"] == "rejected", "All leaves should be rejected"
        print(f"Found {len(leaves)} rejected leaves")


class TestLeaveApprovalWorkflow:
    """Tests for leave approval/rejection workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()['token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
    
    def test_approve_leave(self):
        """Test POST /api/leaves/{id}/approve"""
        # Create a leave first
        leave_data = {
            "type": "vacation",
            "start_date": "2026-06-01",
            "end_date": "2026-06-05",
            "reason": "TEST_Approve_Workflow"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert create_resp.status_code == 200
        leave_id = create_resp.json()["id"]
        
        # Approve it
        approve_resp = self.session.post(f"{BASE_URL}/api/leaves/{leave_id}/approve")
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        
        # Verify status changed
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        found = [l for l in leaves if l["id"] == leave_id]
        assert found[0]["status"] == "approved", "Status should be approved"
        print(f"Successfully approved leave {leave_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/leaves/{leave_id}")
    
    def test_reject_leave(self):
        """Test POST /api/leaves/{id}/reject"""
        # Create a leave first
        leave_data = {
            "type": "special",
            "start_date": "2026-07-01",
            "end_date": "2026-07-02",
            "reason": "TEST_Reject_Workflow"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/leaves", json=leave_data)
        assert create_resp.status_code == 200
        leave_id = create_resp.json()["id"]
        
        # Reject it
        reject_resp = self.session.post(f"{BASE_URL}/api/leaves/{leave_id}/reject")
        assert reject_resp.status_code == 200, f"Reject failed: {reject_resp.text}"
        
        # Verify status changed
        leaves = self.session.get(f"{BASE_URL}/api/leaves").json()
        found = [l for l in leaves if l["id"] == leave_id]
        assert found[0]["status"] == "rejected", "Status should be rejected"
        print(f"Successfully rejected leave {leave_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/leaves/{leave_id}")


# Run pytest if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
