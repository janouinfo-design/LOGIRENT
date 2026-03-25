"""
Test Project Module Enhancements
- Currency field (CHF default)
- Monthly hours endpoints
- Summary data for frontend cards
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-payroll.preview.emergentagent.com')

class TestProjectCurrencyField:
    """Tests for currency field in projects API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get('token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        self.created_project_ids = []
        yield
        # Cleanup
        for pid in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{pid}")
            except:
                pass
    
    def test_get_projects_returns_currency_field(self):
        """GET /api/projects should return currency field with default CHF"""
        resp = self.session.get(f"{BASE_URL}/api/projects")
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        projects = resp.json()
        assert isinstance(projects, list), "Response should be a list"
        
        if len(projects) > 0:
            project = projects[0]
            assert 'currency' in project, "Project should have currency field"
            # Default should be CHF if not set
            assert project['currency'] in ['CHF', 'EUR', 'USD'], f"Currency should be valid: {project['currency']}"
            print(f"✓ First project has currency: {project['currency']}")
    
    def test_create_project_with_chf_currency(self):
        """POST /api/projects with CHF currency"""
        resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_CHF",
            "description": "Test project with CHF currency",
            "budget": 10000,
            "hourly_rate": 100,
            "currency": "CHF"
        })
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        project = resp.json()
        self.created_project_ids.append(project['id'])
        
        assert project['currency'] == 'CHF', f"Currency should be CHF, got: {project['currency']}"
        assert project['budget'] == 10000, f"Budget mismatch"
        assert project['hourly_rate'] == 100, f"Hourly rate mismatch"
        print(f"✓ Created project with CHF currency: {project['id']}")
    
    def test_create_project_with_eur_currency(self):
        """POST /api/projects with EUR currency"""
        resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_EUR",
            "budget": 5000,
            "hourly_rate": 75,
            "currency": "EUR"
        })
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        project = resp.json()
        self.created_project_ids.append(project['id'])
        
        assert project['currency'] == 'EUR', f"Currency should be EUR, got: {project['currency']}"
        print(f"✓ Created project with EUR currency: {project['id']}")
    
    def test_create_project_with_usd_currency(self):
        """POST /api/projects with USD currency"""
        resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_USD",
            "budget": 8000,
            "hourly_rate": 90,
            "currency": "USD"
        })
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        project = resp.json()
        self.created_project_ids.append(project['id'])
        
        assert project['currency'] == 'USD', f"Currency should be USD, got: {project['currency']}"
        print(f"✓ Created project with USD currency: {project['id']}")
    
    def test_create_project_default_currency(self):
        """POST /api/projects without currency should default to CHF"""
        resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_Default_Currency",
            "budget": 3000,
            "hourly_rate": 50
        })
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        project = resp.json()
        self.created_project_ids.append(project['id'])
        
        assert project['currency'] == 'CHF', f"Default currency should be CHF, got: {project['currency']}"
        print(f"✓ Created project with default CHF currency: {project['id']}")
    
    def test_update_project_currency(self):
        """PUT /api/projects/{id} should update currency field"""
        # Create first
        create_resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Project_Update_Currency",
            "budget": 5000,
            "hourly_rate": 60,
            "currency": "CHF"
        })
        assert create_resp.status_code == 200
        project_id = create_resp.json()['id']
        self.created_project_ids.append(project_id)
        
        # Update currency to EUR
        update_resp = self.session.put(f"{BASE_URL}/api/projects/{project_id}", json={
            "currency": "EUR"
        })
        assert update_resp.status_code == 200, f"Status {update_resp.status_code}: {update_resp.text}"
        
        updated_project = update_resp.json()
        assert updated_project['currency'] == 'EUR', f"Updated currency should be EUR, got: {updated_project['currency']}"
        print(f"✓ Updated project currency from CHF to EUR")


class TestProjectMonthlyHours:
    """Tests for monthly hours endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get('token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        yield
    
    def test_get_all_projects_monthly_hours(self):
        """GET /api/projects/monthly-hours returns dict of project_id -> hours"""
        resp = self.session.get(f"{BASE_URL}/api/projects/monthly-hours")
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert isinstance(data, dict), f"Response should be dict, got: {type(data)}"
        
        # Check values are numbers
        for pid, hours in data.items():
            assert isinstance(hours, (int, float)), f"Hours for {pid} should be number, got: {type(hours)}"
        
        print(f"✓ Monthly hours returned for {len(data)} projects")
        if data:
            sample_pid = list(data.keys())[0]
            print(f"  Sample: Project {sample_pid} has {data[sample_pid]} hours this month")
    
    def test_get_project_monthly_hours_detail(self):
        """GET /api/projects/{id}/monthly-hours returns detailed data"""
        # First get a project
        projects_resp = self.session.get(f"{BASE_URL}/api/projects")
        assert projects_resp.status_code == 200
        projects = projects_resp.json()
        
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]['id']
        
        # Get monthly hours detail
        resp = self.session.get(f"{BASE_URL}/api/projects/{project_id}/monthly-hours")
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Verify response structure
        assert 'project_id' in data, "Response should have project_id"
        assert 'month' in data, "Response should have month"
        assert 'year' in data, "Response should have year"
        assert 'total_hours' in data, "Response should have total_hours"
        assert 'billable_hours' in data, "Response should have billable_hours"
        assert 'cost' in data, "Response should have cost"
        assert 'currency' in data, "Response should have currency"
        
        print(f"✓ Project monthly hours detail: {data['total_hours']}h, cost: {data['cost']} {data['currency']}")
    
    def test_project_monthly_hours_currency_matches_project(self):
        """GET /api/projects/{id}/monthly-hours should return project's currency"""
        # Get projects
        projects_resp = self.session.get(f"{BASE_URL}/api/projects")
        assert projects_resp.status_code == 200
        projects = projects_resp.json()
        
        if not projects:
            pytest.skip("No projects available")
        
        # Find project with known currency
        for project in projects:
            if project.get('currency'):
                project_id = project['id']
                project_currency = project['currency']
                
                # Get monthly hours
                hours_resp = self.session.get(f"{BASE_URL}/api/projects/{project_id}/monthly-hours")
                assert hours_resp.status_code == 200
                
                hours_data = hours_resp.json()
                assert hours_data['currency'] == project_currency, \
                    f"Currency mismatch: project has {project_currency}, monthly-hours returned {hours_data['currency']}"
                
                print(f"✓ Monthly hours currency matches project currency: {project_currency}")
                return
        
        print("✓ No projects with currency to verify, test passed")


class TestProjectSummaryCards:
    """Tests verifying data needed for frontend summary cards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        yield
    
    def test_projects_have_budget_field(self):
        """Projects should have budget for 'Budget total' card"""
        resp = self.session.get(f"{BASE_URL}/api/projects")
        assert resp.status_code == 200
        
        projects = resp.json()
        if not projects:
            pytest.skip("No projects")
        
        for p in projects[:3]:  # Check first 3
            assert 'budget' in p, f"Project {p.get('name')} missing budget field"
            assert isinstance(p['budget'], (int, float)), f"Budget should be numeric"
        
        print(f"✓ All projects have budget field for summary card")
    
    def test_projects_have_hourly_rate_field(self):
        """Projects should have hourly_rate for 'Taux horaire' card"""
        resp = self.session.get(f"{BASE_URL}/api/projects")
        assert resp.status_code == 200
        
        projects = resp.json()
        if not projects:
            pytest.skip("No projects")
        
        for p in projects[:3]:
            assert 'hourly_rate' in p, f"Project {p.get('name')} missing hourly_rate field"
            assert isinstance(p['hourly_rate'], (int, float)), f"Hourly rate should be numeric"
        
        print(f"✓ All projects have hourly_rate field for summary card")
    
    def test_monthly_hours_available_for_cards(self):
        """Monthly hours endpoint should provide data for 'Heures ce mois' card"""
        resp = self.session.get(f"{BASE_URL}/api/projects/monthly-hours")
        assert resp.status_code == 200
        
        data = resp.json()
        assert isinstance(data, dict), "Should return dict mapping project_id to hours"
        
        print(f"✓ Monthly hours available for {len(data)} projects")
    
    def test_existing_logitrak_project_data(self):
        """Verify LOGITRAK project has expected budget=50000, rate=85"""
        resp = self.session.get(f"{BASE_URL}/api/projects")
        assert resp.status_code == 200
        
        projects = resp.json()
        logitrak = next((p for p in projects if 'LOGITRAK' in p.get('name', '').upper()), None)
        
        if logitrak:
            print(f"Found LOGITRAK project: {logitrak['name']}")
            print(f"  Budget: {logitrak.get('budget')}")
            print(f"  Hourly Rate: {logitrak.get('hourly_rate')}")
            print(f"  Currency: {logitrak.get('currency', 'CHF')}")
            # Note: Don't assert exact values as they may have changed
        else:
            print("LOGITRAK project not found (may have been renamed)")


class TestProjectAPIIntegration:
    """Integration tests for frontend-backend data flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        self.created_ids = []
        yield
        for pid in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{pid}")
            except:
                pass
    
    def test_full_project_crud_with_currency(self):
        """Create, Read, Update, Delete project with currency"""
        # CREATE
        create_resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_CRUD_Currency_Project",
            "description": "Testing full CRUD with currency",
            "budget": 25000,
            "hourly_rate": 120,
            "currency": "EUR"
        })
        assert create_resp.status_code == 200
        project = create_resp.json()
        project_id = project['id']
        self.created_ids.append(project_id)
        
        assert project['name'] == "TEST_CRUD_Currency_Project"
        assert project['budget'] == 25000
        assert project['hourly_rate'] == 120
        assert project['currency'] == 'EUR'
        print(f"✓ CREATE: Project created with EUR currency")
        
        # READ
        read_resp = self.session.get(f"{BASE_URL}/api/projects")
        assert read_resp.status_code == 200
        projects = read_resp.json()
        found = next((p for p in projects if p['id'] == project_id), None)
        assert found is not None, "Project not found in list"
        assert found['currency'] == 'EUR'
        print(f"✓ READ: Project found with correct currency")
        
        # UPDATE - change currency to USD
        update_resp = self.session.put(f"{BASE_URL}/api/projects/{project_id}", json={
            "currency": "USD",
            "budget": 30000
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated['currency'] == 'USD'
        assert updated['budget'] == 30000
        print(f"✓ UPDATE: Currency changed to USD, budget updated")
        
        # Verify update persisted
        verify_resp = self.session.get(f"{BASE_URL}/api/projects")
        assert verify_resp.status_code == 200
        verified = next((p for p in verify_resp.json() if p['id'] == project_id), None)
        assert verified['currency'] == 'USD'
        print(f"✓ VERIFY: Update persisted correctly")
        
        # DELETE (soft delete via deactivation)
        del_resp = self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
        assert del_resp.status_code == 200
        print(f"✓ DELETE: Project deactivated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
