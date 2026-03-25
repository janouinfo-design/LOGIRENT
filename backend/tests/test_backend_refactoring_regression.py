"""
Backend Refactoring Regression Test Suite
==========================================
Tests all endpoints after decomposing monolithic server.py into modular routes.
Verifies: Auth, Vehicles, Reservations, Notifications, Admin, Agencies, Payments, Contracts, Navixy
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com').rstrip('/')

# Test Credentials
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"
GENEVA_ADMIN_EMAIL = "admin-geneva@logirent.ch"
GENEVA_ADMIN_PASSWORD = "LogiRent2024"
LAUSANNE_ADMIN_EMAIL = "admin@test.com"
LAUSANNE_ADMIN_PASSWORD = "password123"
CLIENT_EMAIL = "client1@test.com"
CLIENT_PASSWORD = "test1234"


class TestAuthEndpoints:
    """Test /api/auth/* endpoints - routes/auth.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def test_login_client_success(self):
        """POST /api/auth/login - Client login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        assert data["user"]["role"] == "client"
        
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_register_new_user(self):
        """POST /api/auth/register - Register new user"""
        import uuid
        test_email = f"test_reg_{uuid.uuid4().hex[:8]}@test.com"
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User Regression",
            "phone": "+41 00 000 0000"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email.lower()
        
    def test_register_duplicate_email(self):
        """POST /api/auth/register - Duplicate email returns 400"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": CLIENT_EMAIL,  # Already exists
            "password": "testpass123",
            "name": "Duplicate Test"
        })
        assert response.status_code == 400
        assert "already" in response.json().get("detail", "").lower()
        
    def test_get_profile_authenticated(self):
        """GET /api/auth/profile - Get profile with valid token"""
        # Login first
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        # Get profile
        response = self.session.get(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CLIENT_EMAIL
        
    def test_get_profile_unauthenticated(self):
        """GET /api/auth/profile - Returns 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/auth/profile")
        assert response.status_code == 401
        
    def test_update_profile(self):
        """PUT /api/auth/profile - Update user profile"""
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        response = self.session.put(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Client One Updated", "phone": "+41 22 123 4567"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "+41 22 123 4567"
        
    def test_forgot_password(self):
        """POST /api/auth/forgot-password - Returns success message"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": CLIENT_EMAIL
        })
        assert response.status_code == 200
        assert "message" in response.json()


class TestAdminAuthEndpoints:
    """Test /api/admin/login - routes/agencies.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def test_admin_login_super_admin(self):
        """POST /api/admin/login - Super admin login"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        
    def test_admin_login_agency_admin(self):
        """POST /api/admin/login - Agency admin login"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["role"] in ["admin", "super_admin"]
        
    def test_admin_login_client_forbidden(self):
        """POST /api/admin/login - Client role returns 403"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 403


class TestVehicleEndpoints:
    """Test /api/vehicles/* endpoints - routes/vehicles.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Get admin token for admin endpoints
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        
    def test_get_vehicles_list(self):
        """GET /api/vehicles - List all vehicles"""
        response = self.session.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check vehicle structure
        vehicle = data[0]
        assert "id" in vehicle
        assert "brand" in vehicle
        assert "model" in vehicle
        assert "price_per_day" in vehicle
        
    def test_get_vehicles_filtered_by_type(self):
        """GET /api/vehicles?type=berline - Filter by type"""
        response = self.session.get(f"{BASE_URL}/api/vehicles?type=berline")
        assert response.status_code == 200
        data = response.json()
        for vehicle in data:
            assert vehicle["type"] == "berline"
            
    def test_get_vehicles_filtered_by_price(self):
        """GET /api/vehicles?min_price=100&max_price=200 - Filter by price"""
        response = self.session.get(f"{BASE_URL}/api/vehicles?min_price=100&max_price=200")
        assert response.status_code == 200
        data = response.json()
        for vehicle in data:
            assert 100 <= vehicle["price_per_day"] <= 200
            
    def test_get_vehicle_by_id(self):
        """GET /api/vehicles/{id} - Get single vehicle"""
        # First get a vehicle id
        list_resp = self.session.get(f"{BASE_URL}/api/vehicles")
        vehicle_id = list_resp.json()[0]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == vehicle_id
        
    def test_get_vehicle_not_found(self):
        """GET /api/vehicles/{id} - Returns 404 for non-existent vehicle"""
        response = self.session.get(f"{BASE_URL}/api/vehicles/non-existent-id")
        assert response.status_code == 404
        
    def test_get_vehicle_availability(self):
        """GET /api/vehicles/{id}/availability - Get vehicle availability"""
        list_resp = self.session.get(f"{BASE_URL}/api/vehicles")
        vehicle_id = list_resp.json()[0]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/vehicles/{vehicle_id}/availability?month=1&year=2026")
        assert response.status_code == 200
        data = response.json()
        assert "booked_dates" in data
        assert isinstance(data["booked_dates"], list)


class TestAdminVehicleEndpoints:
    """Test /api/admin/vehicles/* endpoints - routes/vehicles.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_create_update_delete_vehicle(self):
        """POST, PUT, DELETE /api/admin/vehicles - Full CRUD cycle"""
        import uuid
        
        # CREATE
        vehicle_data = {
            "brand": "TEST_Vehicle",
            "model": f"RegTest_{uuid.uuid4().hex[:6]}",
            "year": 2024,
            "type": "berline",
            "price_per_day": 99.99,
            "description": "Regression test vehicle",
            "seats": 5,
            "transmission": "automatic",
            "fuel_type": "hybrid",
            "options": [{"name": "GPS", "price_per_day": 10}],
            "location": "Geneva"
        }
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/admin/vehicles",
            headers=self.headers,
            json=vehicle_data
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        created = create_resp.json()
        vehicle_id = created["id"]
        assert created["brand"] == "TEST_Vehicle"
        
        # Verify with GET
        get_resp = self.session.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["brand"] == "TEST_Vehicle"
        
        # UPDATE
        vehicle_data["brand"] = "TEST_VehicleUpdated"
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}",
            headers=self.headers,
            json=vehicle_data
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["brand"] == "TEST_VehicleUpdated"
        
        # DELETE
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}",
            headers=self.headers
        )
        assert delete_resp.status_code == 200
        
        # Verify deleted
        verify_resp = self.session.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        assert verify_resp.status_code == 404
        
    def test_update_vehicle_status(self):
        """PUT /api/admin/vehicles/{id}/status - Update vehicle status"""
        # Get a vehicle
        list_resp = self.session.get(f"{BASE_URL}/api/vehicles")
        vehicle = list_resp.json()[0]
        vehicle_id = vehicle["id"]
        original_status = vehicle.get("status", "available")
        
        # Update status
        response = self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/status?status=maintenance",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/status?status={original_status}",
            headers=self.headers
        )


class TestReservationEndpoints:
    """Test /api/reservations/* endpoints - routes/reservations.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Get client token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        self.client_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.client_token}"}
        
    def test_get_reservations_authenticated(self):
        """GET /api/reservations - Get user reservations"""
        response = self.session.get(
            f"{BASE_URL}/api/reservations",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_create_reservation(self):
        """POST /api/reservations - Create new reservation"""
        # Get a vehicle
        vehicles_resp = self.session.get(f"{BASE_URL}/api/vehicles")
        vehicle = vehicles_resp.json()[0]
        
        # Create reservation for future dates
        start_date = (datetime.utcnow() + timedelta(days=60)).isoformat()
        end_date = (datetime.utcnow() + timedelta(days=63)).isoformat()
        
        response = self.session.post(
            f"{BASE_URL}/api/reservations",
            headers=self.headers,
            json={
                "vehicle_id": vehicle["id"],
                "start_date": start_date,
                "end_date": end_date,
                "options": ["GPS"] if vehicle.get("options") else [],
                "payment_method": "cash"
            }
        )
        # May be 200 or 400 (if dates overlap)
        assert response.status_code in [200, 400], f"Unexpected: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "total_price" in data
            
    def test_cancel_reservation(self):
        """POST /api/reservations/{id}/cancel - Cancel reservation"""
        # Get user's reservations
        res_resp = self.session.get(
            f"{BASE_URL}/api/reservations",
            headers=self.headers
        )
        reservations = res_resp.json()
        
        # Find a cancellable reservation
        cancellable = None
        for r in reservations:
            if r["status"] in ["pending", "pending_cash", "confirmed"]:
                cancellable = r
                break
                
        if cancellable:
            response = self.session.post(
                f"{BASE_URL}/api/reservations/{cancellable['id']}/cancel",
                headers=self.headers
            )
            assert response.status_code in [200, 400]


class TestNotificationEndpoints:
    """Test /api/notifications/* endpoints - routes/notifications.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        self.token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_notifications(self):
        """GET /api/notifications - Get user notifications"""
        response = self.session.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        
    def test_get_unread_count(self):
        """GET /api/notifications/unread-count - Get unread count"""
        response = self.session.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        
    def test_mark_all_read(self):
        """PUT /api/notifications/read-all - Mark all as read"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/read-all",
            headers=self.headers
        )
        assert response.status_code == 200


class TestAdminStatsEndpoints:
    """Test /api/admin/stats/* endpoints - routes/admin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_get_admin_stats(self):
        """GET /api/admin/stats - Get admin statistics"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_vehicles" in data
        assert "total_users" in data
        assert "total_reservations" in data
        assert "total_revenue" in data
        
    def test_get_advanced_stats(self):
        """GET /api/admin/stats/advanced - Get advanced statistics"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "revenue_this_month" in data
        assert "vehicle_utilization" in data


class TestAdminUserEndpoints:
    """Test /api/admin/users/* endpoints - routes/admin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_get_admin_users(self):
        """GET /api/admin/users - Get users list"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        
    def test_get_user_by_id(self):
        """GET /api/admin/users/{id} - Get user details"""
        # Get users list first
        list_resp = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        users = list_resp.json()["users"]
        if users:
            user_id = users[0]["id"]
            response = self.session.get(
                f"{BASE_URL}/api/admin/users/{user_id}",
                headers=self.headers
            )
            assert response.status_code == 200
            
    def test_update_user_rating(self):
        """PUT /api/admin/users/{id}/rating - Update user rating"""
        # Get users list
        list_resp = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        users = list_resp.json()["users"]
        if users:
            user_id = users[0]["id"]
            response = self.session.put(
                f"{BASE_URL}/api/admin/users/{user_id}/rating?rating=good",
                headers=self.headers
            )
            assert response.status_code == 200


class TestAdminReservationEndpoints:
    """Test /api/admin/reservations/* endpoints - routes/admin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_get_admin_reservations(self):
        """GET /api/admin/reservations - Get all reservations"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reservations",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "reservations" in data
        assert "total" in data
        
    def test_filter_reservations_by_status(self):
        """GET /api/admin/reservations?status=confirmed"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reservations?status=confirmed",
            headers=self.headers
        )
        assert response.status_code == 200


class TestAdminCalendarEndpoints:
    """Test /api/admin/calendar/* endpoints - routes/admin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_get_admin_calendar(self):
        """GET /api/admin/calendar - Get calendar events"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/calendar?month=1&year=2026",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "month" in data
        assert "year" in data
        
    def test_get_overdue(self):
        """GET /api/admin/overdue - Get overdue reservations"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/overdue",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "overdue" in data
        assert "total" in data


class TestAgencyEndpoints:
    """Test /api/agencies/* endpoints - routes/agencies.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Super admin for full access
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.super_token = login_resp.json().get("access_token")
        self.super_headers = {"Authorization": f"Bearer {self.super_token}"}
        
        # Agency admin for limited access
        login_resp2 = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp2.json().get("access_token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_list_agencies(self):
        """GET /api/agencies - List agencies"""
        response = self.session.get(
            f"{BASE_URL}/api/agencies",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPublicAgencyEndpoints:
    """Test /api/public/agency/* endpoints - routes/agencies.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def test_get_agency_by_slug(self):
        """GET /api/public/agency/{slug} - Get agency by slug"""
        # First get an agency to find its slug
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        token = login_resp.json().get("access_token")
        agencies_resp = self.session.get(
            f"{BASE_URL}/api/agencies",
            headers={"Authorization": f"Bearer {token}"}
        )
        agencies = agencies_resp.json()
        
        if agencies and agencies[0].get("slug"):
            slug = agencies[0]["slug"]
            response = self.session.get(f"{BASE_URL}/api/public/agency/{slug}")
            assert response.status_code == 200
            data = response.json()
            assert data["slug"] == slug


class TestAdminMobileAppEndpoints:
    """Test /api/admin/* agency mobile endpoints - routes/agencies.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_search_clients(self):
        """GET /api/admin/search-clients - Search clients"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/search-clients?q=client",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        
    def test_get_available_vehicles(self):
        """GET /api/admin/available-vehicles - Get available vehicles for dates"""
        start = datetime.utcnow().isoformat()
        end = (datetime.utcnow() + timedelta(days=3)).isoformat()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/available-vehicles?start_date={start}&end_date={end}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "vehicles" in data
        
    def test_get_vehicle_schedule(self):
        """GET /api/admin/vehicle-schedule - Get vehicle schedule"""
        start = datetime.utcnow().isoformat()
        end = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date={start}&end_date={end}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "vehicles" in data
        
    def test_quick_client_creation(self):
        """POST /api/admin/quick-client - Create quick client"""
        import uuid
        response = self.session.post(
            f"{BASE_URL}/api/admin/quick-client",
            headers=self.headers,
            json={
                "name": f"TEST_QuickClient_{uuid.uuid4().hex[:6]}",
                "phone": "+41 00 000 0000"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "client" in data


class TestNavixyEndpoints:
    """Test /api/admin/my-agency/navixy endpoints - routes/navixy.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_get_navixy_config(self):
        """GET /api/admin/my-agency/navixy - Get Navixy config"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/my-agency/navixy",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "navixy_api_url" in data
        assert "navixy_hash" in data
        assert "configured" in data
        
    def test_update_navixy_config(self):
        """PUT /api/admin/my-agency/navixy - Update Navixy config"""
        # Get current config
        get_resp = self.session.get(
            f"{BASE_URL}/api/admin/my-agency/navixy",
            headers=self.headers
        )
        current = get_resp.json()
        
        # Update with same values (to avoid breaking config)
        response = self.session.put(
            f"{BASE_URL}/api/admin/my-agency/navixy",
            headers=self.headers,
            json={
                "navixy_api_url": current.get("navixy_api_url", ""),
                "navixy_hash": current.get("navixy_hash", "")
            }
        )
        assert response.status_code == 200


class TestContractEndpoints:
    """Test /api/**/contracts/* endpoints - routes/contracts.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": GENEVA_ADMIN_EMAIL,
            "password": GENEVA_ADMIN_PASSWORD
        })
        self.admin_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
    def test_list_contracts(self):
        """GET /api/admin/contracts - List contracts"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_contract_by_id(self):
        """GET /api/contracts/{id} - Get contract"""
        # First get contracts list
        list_resp = self.session.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.headers
        )
        contracts = list_resp.json()
        
        if contracts:
            contract_id = contracts[0]["id"]
            response = self.session.get(
                f"{BASE_URL}/api/contracts/{contract_id}",
                headers=self.headers
            )
            assert response.status_code == 200
            
    def test_get_contract_pdf(self):
        """GET /api/contracts/{id}/pdf - Download PDF"""
        list_resp = self.session.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.headers
        )
        contracts = list_resp.json()
        
        if contracts:
            contract_id = contracts[0]["id"]
            response = self.session.get(
                f"{BASE_URL}/api/contracts/{contract_id}/pdf",
                headers=self.headers
            )
            assert response.status_code == 200
            assert response.headers.get("content-type") == "application/pdf"


class TestPaymentEndpoints:
    """Test /api/payments/* endpoints - routes/payments.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        self.client_token = login_resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.client_token}"}
        
    def test_webhook_stripe(self):
        """POST /api/webhook/stripe - Stripe webhook (test basic handler)"""
        response = self.session.post(
            f"{BASE_URL}/api/webhook/stripe",
            json={"type": "test"}
        )
        # Webhook should return 200 regardless of payload
        assert response.status_code == 200


class TestSeedEndpoint:
    """Test /api/seed endpoint - server.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def test_seed_data(self):
        """POST /api/seed - Seed endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/seed")
        # Will return 200 whether seeding or already seeded
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
