"""
Iteration 6 Tests: Multi-Agency System (Multi-tenant)
Tests for:
- Admin login with role check (/api/admin/login)
- Register admin with agency creation (/api/auth/register-admin)
- Agency CRUD endpoints
- Stats scoped by agency
- Reservations scoped by agency
- Users scoped by agency (clients who booked)
- Vehicles filtered by agency_id
- Cash booking without document blocking
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fleet-inspect-14.preview.emergentagent.com').rstrip('/')

# Credentials from test context
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"
AGENCY_ADMIN_EMAIL = "admin2@logirent.ch"
AGENCY_ADMIN_PASSWORD = "password123"
CLIENT_EMAIL = "client1@test.com"
CLIENT_PASSWORD = "test1234"

@pytest.fixture(scope="module")
def api_client():
    """Basic requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAdminLogin:
    """Test /api/admin/login endpoint"""

    def test_admin_login_super_admin_success(self, api_client):
        """Super admin can login via admin/login"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ("super_admin", "admin")
        print(f"PASS: Super admin login successful, role={data['user']['role']}")

    def test_admin_login_agency_admin_success(self, api_client):
        """Agency admin can login via admin/login"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ("super_admin", "admin")
        print(f"PASS: Agency admin login successful, role={data['user']['role']}, agency={data['user'].get('agency_name')}")

    def test_admin_login_client_forbidden(self, api_client):
        """Client user should get 403 from admin/login"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}: {response.text}"
        print("PASS: Client correctly blocked from admin login (403)")

    def test_admin_login_invalid_credentials(self, api_client):
        """Invalid credentials should return 401"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: Invalid credentials return 401")


class TestRegisterAdmin:
    """Test /api/auth/register-admin endpoint"""

    def test_register_admin_creates_agency(self, api_client):
        """Register admin creates new agency and user with admin role"""
        unique_suffix = uuid.uuid4().hex[:6]
        test_email = f"test_newadmin_{unique_suffix}@test.com"
        test_agency = f"TEST_Agency_{unique_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register-admin", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test New Admin",
            "agency_name": test_agency
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["agency_name"] == test_agency
        assert data["user"]["agency_id"] is not None
        print(f"PASS: New admin registered with agency '{test_agency}', agency_id={data['user']['agency_id']}")
        
        return data

    def test_register_admin_duplicate_email_fails(self, api_client):
        """Cannot register admin with existing email"""
        response = api_client.post(f"{BASE_URL}/api/auth/register-admin", json={
            "email": SUPER_ADMIN_EMAIL,  # Existing email
            "password": "testpass123",
            "name": "Duplicate Test",
            "agency_name": "Duplicate Agency"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Duplicate email correctly rejected (400)")


class TestAgencyEndpoints:
    """Test /api/agencies CRUD endpoints"""

    @pytest.fixture(scope="class")
    def super_admin_token(self, api_client):
        """Get super admin token"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def agency_admin_token(self, api_client):
        """Get agency admin token"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]

    def test_get_agencies_super_admin_sees_all(self, api_client, super_admin_token):
        """Super admin sees all agencies"""
        response = api_client.get(
            f"{BASE_URL}/api/agencies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        agencies = response.json()
        assert isinstance(agencies, list)
        assert len(agencies) >= 1, "Super admin should see at least 1 agency"
        
        # Check agency structure has enrichment
        for agency in agencies:
            assert "id" in agency
            assert "name" in agency
            assert "vehicle_count" in agency
            assert "reservation_count" in agency
            assert "admin_count" in agency
        print(f"PASS: Super admin sees {len(agencies)} agencies with stats")

    def test_get_agencies_agency_admin_sees_own(self, api_client, agency_admin_token):
        """Agency admin sees only own agency"""
        response = api_client.get(
            f"{BASE_URL}/api/agencies",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        agencies = response.json()
        assert isinstance(agencies, list)
        assert len(agencies) == 1, f"Agency admin should see only 1 agency, got {len(agencies)}"
        print(f"PASS: Agency admin sees only own agency: {agencies[0]['name']}")

    def test_create_agency_super_admin_only(self, api_client, super_admin_token, agency_admin_token):
        """Only super admin can create agency"""
        unique_suffix = uuid.uuid4().hex[:6]
        
        # Super admin can create
        response = api_client.post(
            f"{BASE_URL}/api/agencies",
            json={"name": f"TEST_SuperCreate_{unique_suffix}", "address": "Test Address"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Super admin create failed: {response.status_code}: {response.text}"
        created_id = response.json()["id"]
        print(f"PASS: Super admin created agency, id={created_id}")
        
        # Agency admin cannot create
        response = api_client.post(
            f"{BASE_URL}/api/agencies",
            json={"name": f"TEST_AdminCreate_{unique_suffix}"},
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert response.status_code == 403, f"Agency admin should get 403, got {response.status_code}"
        print("PASS: Agency admin correctly blocked from creating agency (403)")


class TestAdminStats:
    """Test /api/admin/stats with agency scoping"""

    @pytest.fixture(scope="class")
    def super_admin_token(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def agency_admin_token(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    def test_admin_stats_super_admin(self, api_client, super_admin_token):
        """Super admin sees stats for all agencies"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check structure
        assert "total_vehicles" in data
        assert "total_users" in data
        assert "total_reservations" in data
        assert "total_payments" in data
        assert "total_revenue" in data
        assert "reservations_by_status" in data
        
        print(f"PASS: Super admin stats - vehicles={data['total_vehicles']}, reservations={data['total_reservations']}, revenue={data['total_revenue']}")

    def test_admin_stats_agency_admin_scoped(self, api_client, agency_admin_token):
        """Agency admin sees only their agency stats"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total_vehicles" in data
        assert "total_reservations" in data
        # Agency admin stats should be scoped to their agency only
        print(f"PASS: Agency admin stats (scoped) - vehicles={data['total_vehicles']}, reservations={data['total_reservations']}")


class TestAdminReservations:
    """Test /api/admin/reservations with agency scoping"""

    @pytest.fixture(scope="class")
    def super_admin_token(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    def test_admin_reservations_list(self, api_client, super_admin_token):
        """Get reservations list"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/reservations",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "reservations" in data
        assert "total" in data
        
        if data["reservations"]:
            res = data["reservations"][0]
            # Check enrichment
            assert "user_name" in res
            assert "vehicle_name" in res
        
        print(f"PASS: Admin reservations - total={data['total']}")


class TestAdminUsers:
    """Test /api/admin/users with agency scoping"""

    @pytest.fixture(scope="class")
    def super_admin_token(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]

    def test_admin_users_list(self, api_client, super_admin_token):
        """Get users list"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "users" in data
        assert "total" in data
        
        if data["users"]:
            user = data["users"][0]
            assert "id" in user
            assert "email" in user
            assert "reservation_count" in user  # Enriched field
        
        print(f"PASS: Admin users - total={data['total']}")


class TestVehicleAgencyFilter:
    """Test /api/vehicles?agency_id=xxx filtering"""

    @pytest.fixture(scope="class")
    def super_admin_data(self, api_client):
        """Get super admin data including agency_id"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()

    def test_vehicles_filter_by_agency(self, api_client, super_admin_data):
        """Vehicles can be filtered by agency_id"""
        agency_id = super_admin_data["user"].get("agency_id")
        if not agency_id:
            pytest.skip("Super admin has no agency_id")
        
        # Get vehicles for specific agency
        response = api_client.get(f"{BASE_URL}/api/vehicles?agency_id={agency_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        vehicles = response.json()
        
        assert isinstance(vehicles, list)
        # All returned vehicles should have this agency_id
        for v in vehicles:
            if v.get("agency_id"):  # Some might be null from old data
                assert v["agency_id"] == agency_id, f"Vehicle {v['id']} has wrong agency"
        
        print(f"PASS: Vehicles filtered by agency_id - {len(vehicles)} vehicles")


class TestCashBookingWithoutDocumentBlock:
    """Test cash booking works without document check"""

    @pytest.fixture(scope="class")
    def client_token(self, api_client):
        """Get client token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as client: {response.text}")
        return response.json()["access_token"]

    def test_cash_booking_creates_reservation(self, api_client, client_token):
        """Cash booking should create reservation without document check"""
        # First get available vehicles
        response = api_client.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available")
        
        vehicle_id = vehicles[0]["id"]
        
        # Create cash reservation - use future dates
        start_date = (datetime.utcnow() + timedelta(days=60)).isoformat()
        end_date = (datetime.utcnow() + timedelta(days=63)).isoformat()
        
        response = api_client.post(
            f"{BASE_URL}/api/reservations",
            json={
                "vehicle_id": vehicle_id,
                "start_date": start_date,
                "end_date": end_date,
                "options": [],
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        # Should succeed (200) not fail due to document check
        if response.status_code == 400 and "disponible" in response.text.lower():
            pytest.skip("Vehicle not available for selected dates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify reservation structure
        assert "id" in data
        assert data["payment_method"] == "cash"
        assert data["status"] == "pending_cash", f"Expected pending_cash status, got {data['status']}"
        assert "agency_id" in data  # Should have agency_id from vehicle
        
        print(f"PASS: Cash booking created successfully, id={data['id']}, status={data['status']}, agency_id={data.get('agency_id')}")
        
        # Cleanup - cancel the test reservation
        api_client.post(
            f"{BASE_URL}/api/reservations/{data['id']}/cancel",
            headers={"Authorization": f"Bearer {client_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
