"""
Test file for Phase 4-6 features:
- Messaging (conversations, send/receive messages)
- HR Documents (create, list)
- Schedules (create, list employee schedules)
- Payroll (variables, Swiss exports: Cresus CSV, Abacus XML, WinBiz Excel)
- Analytics Dashboard (monthly hours, project hours, location distribution)
- Subscription Plans (3 plans: Basic, Pro, Enterprise)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestAuth:
    """Authentication tests to get admin token for protected endpoints"""
    
    def test_admin_login(self, api_client):
        """Login as admin to access manager/admin endpoints"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@timesheet.ch",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        print(f"Admin login successful: {data['user']['email']}")
        return data["token"]


class TestMessaging:
    """Messaging endpoints tests - conversations and messages"""
    
    def test_create_conversation(self, admin_client, admin_user_id):
        """Create a new conversation"""
        response = admin_client.post(
            f"{BASE_URL}/api/messages/conversations",
            params={"name": "TEST_Conversation"},
            json=[admin_user_id]  # participants list
        )
        assert response.status_code == 200, f"Create conversation failed: {response.text}"
        data = response.json()
        assert "id" in data, "No conversation id returned"
        print(f"Created conversation: {data['id']}")
        return data["id"]
    
    def test_list_conversations(self, admin_client):
        """List all conversations for user"""
        response = admin_client.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200, f"List conversations failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} conversations")
        return data
    
    def test_send_message(self, admin_client, test_conversation_id):
        """Send a message to a conversation"""
        response = admin_client.post(
            f"{BASE_URL}/api/messages/send",
            params={"conversation_id": test_conversation_id, "content": "TEST_Hello from pytest"}
        )
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        assert "id" in data, "No message id returned"
        print(f"Sent message: {data['id']}")
        return data["id"]
    
    def test_get_messages(self, admin_client, test_conversation_id):
        """Get messages from a conversation"""
        response = admin_client.get(f"{BASE_URL}/api/messages/{test_conversation_id}")
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} messages in conversation")
        # Verify message structure
        if len(data) > 0:
            msg = data[-1]
            assert "id" in msg, "Message missing id"
            assert "sender_id" in msg, "Message missing sender_id"
            assert "content" in msg, "Message missing content"
            assert "is_mine" in msg, "Message missing is_mine field"
        return data


class TestDocuments:
    """HR Documents endpoints tests"""
    
    def test_create_document(self, admin_client):
        """Create a new HR document"""
        response = admin_client.post(
            f"{BASE_URL}/api/documents",
            params={
                "title": "TEST_Contrat de travail",
                "category": "Contrat",
                "content": "Contenu du contrat de test"
            }
        )
        assert response.status_code == 200, f"Create document failed: {response.text}"
        data = response.json()
        assert "id" in data, "No document id returned"
        print(f"Created document: {data['id']}")
        return data["id"]
    
    def test_list_documents(self, admin_client):
        """List all HR documents"""
        response = admin_client.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200, f"List documents failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} documents")
        # Verify document structure
        if len(data) > 0:
            doc = data[0]
            assert "id" in doc, "Document missing id"
            assert "title" in doc, "Document missing title"
            assert "category" in doc, "Document missing category"
        return data
    
    def test_list_documents_by_category(self, admin_client):
        """List documents filtered by category"""
        response = admin_client.get(f"{BASE_URL}/api/documents", params={"category": "Contrat"})
        assert response.status_code == 200, f"List documents by category failed: {response.text}"
        data = response.json()
        # All returned documents should be in the specified category
        for doc in data:
            assert doc["category"] == "Contrat", f"Document has wrong category: {doc['category']}"
        print(f"Found {len(data)} documents in category 'Contrat'")
        return data


class TestSchedules:
    """Employee schedules endpoints tests"""
    
    def test_create_schedule(self, admin_client, admin_user_id):
        """Create a schedule for an employee"""
        response = admin_client.post(
            f"{BASE_URL}/api/schedules",
            params={
                "user_id": admin_user_id,
                "schedule_type": "fixed",
                "monday_start": "08:00",
                "monday_end": "17:00",
                "tuesday_start": "08:00",
                "tuesday_end": "17:00",
                "wednesday_start": "08:00",
                "wednesday_end": "17:00",
                "thursday_start": "08:00",
                "thursday_end": "17:00",
                "friday_start": "08:00",
                "friday_end": "16:00",
                "flex_weekly_hours": 42.0
            }
        )
        assert response.status_code == 200, f"Create schedule failed: {response.text}"
        data = response.json()
        assert "id" in data, "No schedule id returned"
        print(f"Created schedule: {data['id']}")
        return data["id"]
    
    def test_list_schedules(self, admin_client):
        """List all schedules"""
        response = admin_client.get(f"{BASE_URL}/api/schedules")
        assert response.status_code == 200, f"List schedules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} schedules")
        # Verify schedule structure
        if len(data) > 0:
            sched = data[0]
            assert "id" in sched, "Schedule missing id"
            assert "user_id" in sched, "Schedule missing user_id"
            assert "schedule_type" in sched, "Schedule missing schedule_type"
            assert "days" in sched, "Schedule missing days"
        return data
    
    def test_list_schedules_by_user(self, admin_client, admin_user_id):
        """List schedules for specific user"""
        response = admin_client.get(f"{BASE_URL}/api/schedules", params={"user_id": admin_user_id})
        assert response.status_code == 200, f"List schedules by user failed: {response.text}"
        data = response.json()
        # All returned schedules should be for the specified user
        for sched in data:
            assert sched["user_id"] == admin_user_id, f"Schedule has wrong user_id: {sched['user_id']}"
        print(f"Found {len(data)} schedules for user {admin_user_id}")
        return data


class TestPayroll:
    """Payroll endpoints tests - variables and Swiss software exports"""
    
    def test_get_payroll_variables(self, admin_client):
        """Get payroll variables for a month"""
        response = admin_client.get(
            f"{BASE_URL}/api/payroll/variables",
            params={"month": 3, "year": 2026}
        )
        assert response.status_code == 200, f"Get payroll variables failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} employees in payroll")
        # Verify payroll structure
        if len(data) > 0:
            emp = data[0]
            assert "user_id" in emp, "Payroll missing user_id"
            assert "name" in emp, "Payroll missing name"
            assert "total_hours" in emp, "Payroll missing total_hours"
            assert "overtime_hours" in emp, "Payroll missing overtime_hours"
            assert "sick_days" in emp, "Payroll missing sick_days"
            assert "vacation_days" in emp, "Payroll missing vacation_days"
            assert "expense_total" in emp, "Payroll missing expense_total"
            print(f"Payroll data: {emp['name']} - {emp['total_hours']}h total, {emp['overtime_hours']}h overtime")
        return data
    
    def test_export_cresus_csv(self, admin_client):
        """Export payroll in Cresus CSV format"""
        response = admin_client.get(
            f"{BASE_URL}/api/payroll/export/cresus",
            params={"month": 3, "year": 2026}
        )
        assert response.status_code == 200, f"Export Cresus failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", ""), f"Wrong content type: {response.headers.get('content-type')}"
        # Check CSV content
        content = response.text
        assert "Numero;Nom;Heures;Supp;Nuit;Maladie;Vacances;Frais;Brut" in content, "CSV header missing"
        print(f"Cresus CSV export successful: {len(content)} bytes")
        return content
    
    def test_export_abacus_xml(self, admin_client):
        """Export payroll in Abacus XML format"""
        response = admin_client.get(
            f"{BASE_URL}/api/payroll/export/abacus",
            params={"month": 3, "year": 2026}
        )
        assert response.status_code == 200, f"Export Abacus failed: {response.text}"
        assert "application/xml" in response.headers.get("content-type", ""), f"Wrong content type: {response.headers.get('content-type')}"
        # Check XML content
        content = response.text
        assert "<?xml version" in content, "XML declaration missing"
        assert "<AbaPayroll>" in content, "AbaPayroll root element missing"
        assert "</AbaPayroll>" in content, "AbaPayroll closing tag missing"
        print(f"Abacus XML export successful: {len(content)} bytes")
        return content
    
    def test_export_winbiz_excel(self, admin_client):
        """Export payroll in WinBiz Excel format"""
        response = admin_client.get(
            f"{BASE_URL}/api/payroll/export/winbiz",
            params={"month": 3, "year": 2026}
        )
        assert response.status_code == 200, f"Export WinBiz failed: {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type, f"Wrong content type: {content_type}"
        # Excel files are binary, just check we got content
        assert len(response.content) > 0, "Empty Excel file"
        print(f"WinBiz Excel export successful: {len(response.content)} bytes")
        return True


class TestAnalytics:
    """Analytics dashboard endpoints tests"""
    
    def test_get_analytics_dashboard(self, admin_client):
        """Get analytics dashboard data"""
        response = admin_client.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200, f"Get analytics failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "monthly" in data, "Missing monthly data"
        assert "project_hours" in data, "Missing project_hours"
        assert "location_distribution" in data, "Missing location_distribution"
        assert "total_employees" in data, "Missing total_employees"
        assert "active_projects" in data, "Missing active_projects"
        
        # Verify monthly data structure
        assert isinstance(data["monthly"], list), "monthly should be a list"
        if len(data["monthly"]) > 0:
            month_data = data["monthly"][0]
            assert "month" in month_data, "Missing month name"
            assert "total_hours" in month_data, "Missing total_hours"
            assert "billable_hours" in month_data, "Missing billable_hours"
        
        # Verify location distribution
        loc_dist = data["location_distribution"]
        assert "office" in loc_dist, "Missing office in location_distribution"
        assert "home" in loc_dist, "Missing home in location_distribution"
        assert "onsite" in loc_dist, "Missing onsite in location_distribution"
        
        print(f"Analytics: {data['total_employees']} employees, {data['active_projects']} projects")
        print(f"Monthly data points: {len(data['monthly'])}")
        print(f"Location distribution: {loc_dist}")
        return data
    
    def test_analytics_with_months_param(self, admin_client):
        """Get analytics with custom months parameter"""
        response = admin_client.get(
            f"{BASE_URL}/api/analytics/dashboard",
            params={"months": 3}
        )
        assert response.status_code == 200, f"Get analytics with months failed: {response.text}"
        data = response.json()
        # Should return 3 months of data
        assert len(data["monthly"]) == 3, f"Expected 3 months, got {len(data['monthly'])}"
        print(f"Analytics (3 months): {[m['month'] for m in data['monthly']]}")
        return data


class TestSubscriptions:
    """Subscription plans endpoints tests"""
    
    def test_get_plans(self, admin_client):
        """Get subscription plans - should return 3 plans"""
        response = admin_client.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200, f"Get plans failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 3, f"Expected 3 plans, got {len(data)}"
        
        # Verify plan structure
        plan_ids = [p["id"] for p in data]
        assert "basic" in plan_ids, "Missing basic plan"
        assert "pro" in plan_ids, "Missing pro plan"
        assert "enterprise" in plan_ids, "Missing enterprise plan"
        
        for plan in data:
            assert "id" in plan, "Plan missing id"
            assert "name" in plan, "Plan missing name"
            assert "price" in plan, "Plan missing price"
            assert "features" in plan, "Plan missing features"
            assert isinstance(plan["features"], list), "Features should be a list"
            print(f"Plan: {plan['name']} - {plan['price']} CHF/{plan.get('per', 'month')}")
        
        return data
    
    def test_get_current_subscription(self, admin_client):
        """Get current subscription"""
        response = admin_client.get(f"{BASE_URL}/api/subscriptions/current")
        assert response.status_code == 200, f"Get current subscription failed: {response.text}"
        data = response.json()
        
        assert "plan" in data, "Missing plan"
        assert "status" in data, "Missing status"
        print(f"Current subscription: {data['plan']} ({data['status']})")
        return data


# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@timesheet.ch",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping tests")


@pytest.fixture(scope="module")
def admin_user_id(api_client, admin_token):
    """Get admin user ID"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Could not get admin user ID")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_conversation_id(admin_client, admin_user_id):
    """Create a test conversation and return its ID"""
    response = admin_client.post(
        f"{BASE_URL}/api/messages/conversations",
        params={"name": "TEST_Fixture_Conversation"},
        json=[admin_user_id]
    )
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Could not create test conversation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
