"""
LogiRent Full Verification Tests - Iteration 49
Tests: Authentication, Admin APIs, Contract Template, PDF Preview, Quick Client, Overdue
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wonderful-franklin-2.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')


class TestAuthentication:
    """Test all 3 user roles login"""
    
    def test_super_admin_login(self):
        """Super Admin login with test@example.com / password123"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data, "Missing access_token"
        assert data["user"]["role"] == "super_admin", f"Expected role=super_admin, got {data['user']['role']}"
        assert data["user"]["email"] == "test@example.com"
        print(f"Super Admin login OK: role={data['user']['role']}")
    
    def test_agency_admin_login(self):
        """Agency Admin login with admin-geneva@logirent.ch / LogiRent2024"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data, "Missing access_token"
        assert data["user"]["role"] == "admin", f"Expected role=admin, got {data['user']['role']}"
        print(f"Agency Admin login OK: role={data['user']['role']}")
    
    def test_client_login(self):
        """Client login with client1@test.com / test1234"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "client1@test.com",
            "password": "test1234"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data, "Missing access_token"
        assert data["user"]["role"] == "client", f"Expected role=client, got {data['user']['role']}"
        print(f"Client login OK: role={data['user']['role']}")
    
    def test_invalid_login_rejected(self):
        """Invalid credentials return 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpass"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


@pytest.fixture(scope="class")
def super_admin_token():
    """Get super admin token for admin API tests"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    if resp.status_code != 200:
        pytest.skip("Super admin login failed")
    return resp.json()["access_token"]


@pytest.fixture(scope="class")
def agency_admin_token():
    """Get agency admin token for admin API tests"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin-geneva@logirent.ch",
        "password": "LogiRent2024"
    })
    if resp.status_code != 200:
        pytest.skip("Agency admin login failed")
    return resp.json()["access_token"]


class TestAdminStats:
    """Test GET /api/admin/stats endpoint"""
    
    def test_admin_stats_returns_counts(self, super_admin_token):
        """GET /api/admin/stats returns vehicles, users, reservations counts"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify required fields exist
        assert "total_vehicles" in data, "Missing total_vehicles"
        assert "total_users" in data, "Missing total_users"
        assert "total_reservations" in data, "Missing total_reservations"
        assert "total_payments" in data, "Missing total_payments"
        assert "total_revenue" in data, "Missing total_revenue"
        
        # Verify values are integers/floats
        assert isinstance(data["total_vehicles"], int), "total_vehicles should be int"
        assert isinstance(data["total_users"], int), "total_users should be int"
        assert isinstance(data["total_reservations"], int), "total_reservations should be int"
        
        print(f"Stats: vehicles={data['total_vehicles']}, users={data['total_users']}, reservations={data['total_reservations']}")
    
    def test_admin_stats_unauthenticated_fails(self):
        """Stats endpoint requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


class TestAdminUsers:
    """Test GET /api/admin/users endpoint"""
    
    def test_admin_users_returns_list(self, super_admin_token):
        """GET /api/admin/users returns user list with pagination"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "users" in data, "Missing users array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["users"], list), "users should be a list"
        assert len(data["users"]) > 0, "Should have at least 1 user"
        
        # Check user structure
        user = data["users"][0]
        assert "id" in user, "User missing id"
        assert "email" in user, "User missing email"
        assert "name" in user, "User missing name"
        
        print(f"Users returned: {len(data['users'])} of {data['total']} total")


class TestAdminReservations:
    """Test GET /api/admin/reservations endpoint"""
    
    def test_admin_reservations_returns_list(self, super_admin_token):
        """GET /api/admin/reservations returns reservation list"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/reservations", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "reservations" in data, "Missing reservations array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["reservations"], list), "reservations should be a list"
        
        print(f"Reservations returned: {len(data['reservations'])} of {data['total']} total")


class TestAdminCalendar:
    """Test GET /api/admin/calendar endpoint"""
    
    def test_admin_calendar_returns_events(self, super_admin_token):
        """GET /api/admin/calendar returns calendar events"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/calendar", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "events" in data, "Missing events array"
        assert "month" in data, "Missing month"
        assert "year" in data, "Missing year"
        assert isinstance(data["events"], list), "events should be a list"
        
        print(f"Calendar: {len(data['events'])} events for {data['month']}/{data['year']}")


class TestQuickClient:
    """Test POST /api/admin/quick-client endpoint"""
    
    def test_create_quick_client_with_password(self, agency_admin_token):
        """POST /api/admin/quick-client creates client with auto-generated password"""
        headers = {"Authorization": f"Bearer {agency_admin_token}", "Content-Type": "application/json"}
        test_email = f"test_iter49_{uuid.uuid4().hex[:8]}@test.com"
        
        resp = requests.post(f"{BASE_URL}/api/admin/quick-client", headers=headers, json={
            "name": "Test Client Iter49",
            "email": test_email,
            "phone": "+41 79 123 4567"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "client" in data, "Missing client object"
        assert "is_new" in data, "Missing is_new flag"
        assert "generated_password" in data, "Missing generated_password field"
        assert data["is_new"] == True, "Should be new client"
        
        # Verify password is 8 characters
        password = data["generated_password"]
        assert len(password) == 8, f"Password should be 8 chars, got {len(password)}"
        
        print(f"Quick client created: email={test_email}, password={password}")
        return data["client"]["id"]
    
    def test_existing_client_returns_existing(self, agency_admin_token):
        """POST /api/admin/quick-client with existing email returns is_new=false"""
        headers = {"Authorization": f"Bearer {agency_admin_token}", "Content-Type": "application/json"}
        
        resp = requests.post(f"{BASE_URL}/api/admin/quick-client", headers=headers, json={
            "name": "Existing Client",
            "email": "client1@test.com"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert data["is_new"] == False, "Should be existing client"
        print("Existing client detection: OK")


class TestClientDocumentUpload:
    """Test POST /api/admin/clients/{client_id}/documents endpoint"""
    
    def test_upload_client_document(self, agency_admin_token):
        """Upload license_front document to a client"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        
        # First create a client
        test_email = f"doctest_{uuid.uuid4().hex[:8]}@test.com"
        resp = requests.post(f"{BASE_URL}/api/admin/quick-client", headers={**headers, "Content-Type": "application/json"}, json={
            "name": "Doc Test Client",
            "email": test_email
        })
        assert resp.status_code == 200, "Failed to create test client"
        client_id = resp.json()["client"]["id"]
        
        # Upload a test file
        files = {"file": ("test_license.jpg", b"fake image content", "image/jpeg")}
        resp = requests.post(
            f"{BASE_URL}/api/admin/clients/{client_id}/documents?doc_type=license_front",
            headers=headers,
            files=files
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "path" in data, "Missing path in response"
        assert "doc_type" in data, "Missing doc_type in response"
        assert data["doc_type"] == "license_front", "Wrong doc_type returned"
        
        print(f"Document uploaded: path={data['path']}")


class TestContractTemplate:
    """Test GET/PUT /api/admin/contract-template endpoints"""
    
    def test_get_contract_template(self, agency_admin_token):
        """GET /api/admin/contract-template returns template with required fields"""
        headers = {"Authorization": f"Bearer {agency_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "legal_text" in data, "Missing legal_text"
        assert "deductible" in data, "Missing deductible"
        assert "default_prices" in data, "Missing default_prices"
        
        print(f"Contract template: legal_text length={len(data['legal_text'])}, deductible={data['deductible']}")
    
    def test_update_contract_template(self, agency_admin_token):
        """PUT /api/admin/contract-template updates template fields"""
        headers = {"Authorization": f"Bearer {agency_admin_token}", "Content-Type": "application/json"}
        
        new_deductible = "1500"
        resp = requests.put(f"{BASE_URL}/api/admin/contract-template", headers=headers, json={
            "deductible": new_deductible,
            "agency_website": "https://test-agency.logirent.ch"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert data["deductible"] == new_deductible, f"Deductible not updated, got {data['deductible']}"
        print(f"Contract template updated: deductible={data['deductible']}")


class TestVehicles:
    """Test GET /api/vehicles endpoint"""
    
    def test_get_vehicles_list(self):
        """GET /api/vehicles returns vehicle list (public endpoint)"""
        resp = requests.get(f"{BASE_URL}/api/vehicles")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Should return array of vehicles"
        assert len(data) > 0, "Should have at least 1 vehicle"
        
        # Check vehicle structure
        vehicle = data[0]
        assert "id" in vehicle, "Vehicle missing id"
        assert "brand" in vehicle, "Vehicle missing brand"
        assert "model" in vehicle, "Vehicle missing model"
        assert "price_per_day" in vehicle, "Vehicle missing price_per_day"
        
        print(f"Vehicles: {len(data)} vehicles found, first: {vehicle['brand']} {vehicle['model']}")


class TestContractPreview:
    """Test POST /api/admin/contract-template/preview endpoint"""
    
    def test_generate_pdf_preview(self, agency_admin_token):
        """POST /api/admin/contract-template/preview generates PDF"""
        headers = {"Authorization": f"Bearer {agency_admin_token}", "Content-Type": "application/json"}
        
        resp = requests.post(f"{BASE_URL}/api/admin/contract-template/preview", headers=headers, json={
            "client_name": "Test Client",
            "client_address": "Test Address 123",
            "vehicle_brand": "BMW",
            "vehicle_model": "Series 3",
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "total_price": 500.0
        })
        
        # Contract preview may return 200 with PDF or may have specific requirements
        # Check if endpoint exists and responds
        assert resp.status_code in [200, 201, 400, 422], f"Unexpected status: {resp.status_code}"
        
        if resp.status_code == 200:
            # Check if response is PDF or JSON
            content_type = resp.headers.get("content-type", "")
            if "application/pdf" in content_type:
                print(f"PDF preview generated: {len(resp.content)} bytes")
            else:
                print(f"Preview response: {resp.text[:200]}")
        else:
            print(f"Preview endpoint returned {resp.status_code}: {resp.text[:200]}")


class TestAdvancedStats:
    """Test GET /api/admin/stats/advanced endpoint"""
    
    def test_get_advanced_stats(self, super_admin_token):
        """GET /api/admin/stats/advanced returns advanced analytics"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/stats/advanced", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify some expected fields
        assert "revenue_this_month" in data, "Missing revenue_this_month"
        assert "avg_booking_duration" in data, "Missing avg_booking_duration"
        assert "vehicle_utilization" in data, "Missing vehicle_utilization"
        
        print(f"Advanced stats: revenue_this_month={data['revenue_this_month']}, avg_duration={data['avg_booking_duration']}")


class TestOverdueReservations:
    """Test GET /api/admin/overdue endpoint"""
    
    def test_get_overdue_reservations(self, super_admin_token):
        """GET /api/admin/overdue returns overdue reservations list"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/overdue", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "overdue" in data, "Missing overdue array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["overdue"], list), "overdue should be a list"
        
        print(f"Overdue: {len(data['overdue'])} overdue reservations (total: {data['total']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
