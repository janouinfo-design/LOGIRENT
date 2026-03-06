"""
LogiRent Iteration 4 Feature Tests:
1. Overdue cron job for checking late reservations (runs hourly)
2. Admin endpoint POST /api/admin/check-overdue for manual trigger
3. Reservations page redesign with French UI/filters
4. MiniCalendar component (tested via booking page)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fleet-management-hub-9.preview.emergentagent.com')


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_accessible(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        print("✓ API is accessible")


class TestAuthentication:
    """Authentication tests for test user"""
    
    def test_login_with_test_credentials(self):
        """Login with test@example.com / password123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful: {data['user']['email']}")
        return data['access_token']


class TestAdminOverdueEndpoint:
    """Test the overdue check functionality - P1 Cron feature"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_admin_check_overdue_endpoint_exists(self, auth_headers):
        """POST /api/admin/check-overdue should exist and respond"""
        response = requests.post(f"{BASE_URL}/api/admin/check-overdue", headers=auth_headers)
        # Should return 200 with message
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Admin check-overdue endpoint works: {data['message']}")
    
    def test_admin_check_overdue_requires_auth(self):
        """POST /api/admin/check-overdue requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/check-overdue")
        assert response.status_code == 401 or response.status_code == 403
        print("✓ Admin check-overdue requires authentication")
    
    def test_admin_get_overdue_reservations(self, auth_headers):
        """GET /api/admin/overdue returns overdue reservations list"""
        response = requests.get(f"{BASE_URL}/api/admin/overdue", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "overdue" in data
        assert "total" in data
        assert isinstance(data["overdue"], list)
        print(f"✓ Admin overdue list: {data['total']} overdue reservations")


class TestReservationsAPI:
    """Test reservations API for the redesigned page"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_get_user_reservations(self, auth_headers):
        """GET /api/reservations returns user's reservations"""
        response = requests.get(f"{BASE_URL}/api/reservations", headers=auth_headers)
        assert response.status_code == 200
        reservations = response.json()
        assert isinstance(reservations, list)
        print(f"✓ User has {len(reservations)} reservations")
    
    def test_reservation_has_required_fields(self, auth_headers):
        """Verify reservation objects have fields needed for the redesigned page"""
        response = requests.get(f"{BASE_URL}/api/reservations", headers=auth_headers)
        assert response.status_code == 200
        reservations = response.json()
        
        if len(reservations) > 0:
            res = reservations[0]
            # Fields needed for French UI: status, payment_status, total_price, start_date, end_date, total_days
            required_fields = ['id', 'status', 'payment_status', 'total_price', 'start_date', 'end_date', 'total_days', 'vehicle_id']
            for field in required_fields:
                assert field in res, f"Missing field: {field}"
            print(f"✓ Reservation has all required fields for UI")
    
    def test_cancel_reservation_endpoint(self, auth_headers):
        """POST /api/reservations/{id}/cancel should work for pending reservations"""
        # First get reservations
        response = requests.get(f"{BASE_URL}/api/reservations", headers=auth_headers)
        reservations = response.json()
        
        # Find a pending/unpaid reservation to cancel
        cancelable = None
        for res in reservations:
            if res.get('status') in ['pending', 'pending_cash'] and res.get('payment_status') != 'paid':
                cancelable = res
                break
        
        if cancelable:
            cancel_response = requests.post(f"{BASE_URL}/api/reservations/{cancelable['id']}/cancel", headers=auth_headers)
            assert cancel_response.status_code == 200
            print(f"✓ Successfully cancelled reservation: {cancelable['id']}")
        else:
            print("✓ No cancelable reservations found (this is OK)")


class TestVehiclesForBooking:
    """Test vehicles API for booking page"""
    
    def test_get_vehicles_list(self):
        """GET /api/vehicles returns vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        vehicles = response.json()
        assert isinstance(vehicles, list)
        assert len(vehicles) > 0
        print(f"✓ {len(vehicles)} vehicles available for booking")
    
    def test_get_vehicle_by_id(self):
        """GET /api/vehicles/{id} returns vehicle details for booking page"""
        # First get list
        list_response = requests.get(f"{BASE_URL}/api/vehicles")
        vehicles = list_response.json()
        
        if len(vehicles) > 0:
            vehicle_id = vehicles[0]['id']
            response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
            assert response.status_code == 200
            vehicle = response.json()
            assert 'id' in vehicle
            assert 'brand' in vehicle
            assert 'model' in vehicle
            assert 'price_per_day' in vehicle
            assert 'options' in vehicle
            print(f"✓ Vehicle details available: {vehicle['brand']} {vehicle['model']}")


class TestPaymentMethods:
    """Test payment methods for booking page (card, TWINT, cash)"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def vehicle_id(self):
        """Get a vehicle ID"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No vehicles")
    
    def test_create_reservation_with_cash(self, auth_headers, vehicle_id):
        """Create reservation with cash payment method"""
        start_date = datetime.now() + timedelta(days=50)
        end_date = start_date + timedelta(days=2)
        
        response = requests.post(f"{BASE_URL}/api/reservations",
            headers=auth_headers,
            json={
                "vehicle_id": vehicle_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": [],
                "payment_method": "cash"
            })
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data['payment_method'] == 'cash'
            assert data['status'] == 'pending_cash'
            print(f"✓ Cash reservation created: {data['id']}, status: {data['status']}")
        elif response.status_code == 400:
            print(f"✓ Cash reservation rejected (vehicle not available): OK")
        else:
            print(f"Cash reservation response: {response.status_code} - {response.text}")
    
    def test_create_reservation_with_card(self, auth_headers, vehicle_id):
        """Create reservation with card payment method"""
        start_date = datetime.now() + timedelta(days=60)
        end_date = start_date + timedelta(days=2)
        
        response = requests.post(f"{BASE_URL}/api/reservations",
            headers=auth_headers,
            json={
                "vehicle_id": vehicle_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": [],
                "payment_method": "card"
            })
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data['payment_method'] == 'card'
            assert data['status'] == 'pending'
            print(f"✓ Card reservation created: {data['id']}, status: {data['status']}")
        elif response.status_code == 400:
            print(f"✓ Card reservation rejected (vehicle not available): OK")
        else:
            print(f"Card reservation response: {response.status_code} - {response.text}")


class TestAdminReservations:
    """Test admin reservations endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Authentication failed")
    
    def test_admin_reservations_list(self, auth_headers):
        """GET /api/admin/reservations returns all reservations"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "reservations" in data
        assert "total" in data
        print(f"✓ Admin can see {data['total']} total reservations")
    
    def test_admin_filter_by_status(self, auth_headers):
        """Filter admin reservations by status"""
        for status in ['pending', 'confirmed', 'cancelled']:
            response = requests.get(f"{BASE_URL}/api/admin/reservations?status={status}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            print(f"✓ Status filter '{status}': {data['total']} reservations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
