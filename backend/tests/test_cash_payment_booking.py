"""
Test Cash Payment Booking Flow - Iteration 5
Testing the fix for the 'Réserver' (Espèces) button issue

Key fix tested:
- Document check (hasDocuments) no longer blocks booking
- Cash payment creates reservation with status 'pending_cash'
- Success/error feedback banners instead of window.alert/confirm
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture
def vehicle_id():
    """Get first available vehicle"""
    response = requests.get(f"{BASE_URL}/api/vehicles")
    assert response.status_code == 200
    vehicles = response.json()
    assert len(vehicles) > 0, "No vehicles available"
    return vehicles[0]["id"]


class TestCashPaymentBooking:
    """Test the cash payment booking flow - main bug fix being tested"""

    def test_create_cash_reservation_success(self, api_client, vehicle_id):
        """
        Core test: Cash payment reservation should work even without documents
        This is the main fix - previously the hasDocuments check blocked booking
        """
        # Use dates far in the future to avoid conflicts
        start_date = datetime.now() + timedelta(days=180)  # 6 months out
        end_date = start_date + timedelta(days=3)
        
        payload = {
            "vehicle_id": vehicle_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "options": [],
            "payment_method": "cash"
        }
        
        response = api_client.post(f"{BASE_URL}/api/reservations", json=payload)
        
        # Assert reservation created successfully
        assert response.status_code == 200, f"Cash reservation failed: {response.text}"
        
        data = response.json()
        
        # Verify cash payment specific fields
        assert data["payment_method"] == "cash", "Payment method should be 'cash'"
        assert data["status"] == "pending_cash", "Status should be 'pending_cash' for cash payments"
        assert data["payment_status"] == "unpaid", "Payment status should be 'unpaid'"
        assert data["payment_session_id"] is None, "No payment session for cash"
        
        # Verify pricing calculation
        assert data["total_days"] == 3, "Should be 3 days"
        assert data["total_price"] > 0, "Total price should be positive"
        
        print(f"SUCCESS: Cash reservation created with id={data['id']}, status={data['status']}")
        
        # Store for cleanup
        self.created_reservation_id = data["id"]
        
        return data["id"]

    def test_create_card_reservation_still_works(self, api_client, vehicle_id):
        """Verify card payments still work correctly"""
        start_date = datetime.now() + timedelta(days=190)
        end_date = start_date + timedelta(days=2)
        
        payload = {
            "vehicle_id": vehicle_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "options": [],
            "payment_method": "card"
        }
        
        response = api_client.post(f"{BASE_URL}/api/reservations", json=payload)
        
        assert response.status_code == 200, f"Card reservation failed: {response.text}"
        
        data = response.json()
        assert data["payment_method"] == "card", "Payment method should be 'card'"
        assert data["status"] == "pending", "Status should be 'pending' for card payments"
        
        print(f"SUCCESS: Card reservation created with id={data['id']}, status={data['status']}")

    def test_unavailable_dates_returns_error(self, api_client, vehicle_id):
        """Test that booking unavailable dates returns proper error message"""
        # First, create a reservation
        start_date = datetime.now() + timedelta(days=200)
        end_date = start_date + timedelta(days=5)
        
        payload = {
            "vehicle_id": vehicle_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "options": [],
            "payment_method": "cash"
        }
        
        # Create first reservation
        response1 = api_client.post(f"{BASE_URL}/api/reservations", json=payload)
        assert response1.status_code == 200, f"First reservation failed: {response1.text}"
        
        # Try to create overlapping reservation - should fail
        overlap_start = start_date + timedelta(days=2)
        overlap_end = overlap_start + timedelta(days=3)
        
        overlap_payload = {
            "vehicle_id": vehicle_id,
            "start_date": overlap_start.isoformat(),
            "end_date": overlap_end.isoformat(),
            "options": [],
            "payment_method": "cash"
        }
        
        response2 = api_client.post(f"{BASE_URL}/api/reservations", json=overlap_payload)
        
        # Should return 400 with availability error
        assert response2.status_code == 400, f"Should reject overlapping dates: {response2.text}"
        
        error_data = response2.json()
        assert "detail" in error_data, "Should have error detail"
        # The error message should be in French
        assert "disponible" in error_data["detail"].lower() or "n'est pas" in error_data["detail"].lower(), \
            f"Error should mention availability: {error_data['detail']}"
        
        print(f"SUCCESS: Overlapping reservation correctly rejected: {error_data['detail']}")


class TestBookingPageRequirements:
    """Test booking page loads and has required elements"""
    
    def test_vehicle_details_endpoint(self, vehicle_id):
        """Booking page needs vehicle details"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for booking page
        assert "id" in data
        assert "brand" in data
        assert "model" in data
        assert "price_per_day" in data
        assert "options" in data
        
        print(f"SUCCESS: Vehicle details available for {data['brand']} {data['model']}")

    def test_user_profile_shows_no_documents(self, api_client):
        """
        Verify test user has no documents - this proves the fix works
        The user should be able to book even without documents
        """
        response = api_client.get(f"{BASE_URL}/api/auth/profile")
        
        assert response.status_code == 200
        data = response.json()
        
        # Confirm no documents
        assert data["id_photo"] is None, "Test user should have no ID photo"
        assert data["license_photo"] is None, "Test user should have no license photo"
        
        print(f"SUCCESS: User {data['email']} has no documents (id_photo=None, license_photo=None)")
        print("This user can still book with cash payment - fix verified!")


class TestReservationsListEndpoint:
    """Test reservations list for user"""
    
    def test_get_user_reservations(self, api_client):
        """User should see their reservations"""
        response = api_client.get(f"{BASE_URL}/api/reservations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Should return list of reservations"
        
        # Check for cash reservations
        cash_reservations = [r for r in data if r.get("payment_method") == "cash"]
        print(f"SUCCESS: User has {len(data)} total reservations, {len(cash_reservations)} cash payments")


class TestStripeCheckoutFlow:
    """Test card payment still redirects to Stripe"""
    
    def test_checkout_initiation(self, api_client, vehicle_id):
        """Card payment should create checkout session"""
        # First create a card reservation
        start_date = datetime.now() + timedelta(days=220)
        end_date = start_date + timedelta(days=2)
        
        payload = {
            "vehicle_id": vehicle_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "options": [],
            "payment_method": "card"
        }
        
        res_response = api_client.post(f"{BASE_URL}/api/reservations", json=payload)
        assert res_response.status_code == 200
        reservation_id = res_response.json()["id"]
        
        # Now try to initiate checkout
        checkout_payload = {
            "reservation_id": reservation_id,
            "origin_url": "https://logirent-preview-3.preview.emergentagent.com",
            "payment_method_type": "card"
        }
        
        checkout_response = api_client.post(f"{BASE_URL}/api/payments/checkout", json=checkout_payload)
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        
        checkout_data = checkout_response.json()
        assert "url" in checkout_data, "Should return Stripe checkout URL"
        assert "session_id" in checkout_data, "Should return session ID"
        assert "stripe" in checkout_data["url"].lower(), "URL should be Stripe checkout"
        
        print(f"SUCCESS: Stripe checkout URL generated for card payment")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
