"""
Iteration 53: Backend Tests for Auto-Generate Contract and PDF Download
Tests:
- POST /api/contracts/auto-generate/{reservation_id} - Auto-generates a contract
- GET /api/contracts/{contract_id}/pdf - Downloads contract as PDF
- Idempotency: Calling auto-generate twice returns existing contract
- POST /api/reservations - Creates reservation (integration test)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://car-rental-live.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"
EXISTING_RESERVATION_ID = "d7a8824e-6748-46d6-9e4b-0f98fe996d89"
EXISTING_CONTRACT_ID = "586889c4-d7d4-407b-ae57-ce571c69318c"


class TestContractAutoGenerate:
    """Tests for auto-generate contract API"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, client_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {client_token}"}
    
    def test_client_login(self):
        """Test client login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        assert data["user"]["role"] == "client"
    
    def test_auto_generate_contract_existing_reservation(self, auth_headers):
        """Test auto-generate contract for existing reservation"""
        response = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{EXISTING_RESERVATION_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "contract_id" in data
        # Should return existing contract since it was already generated
        assert data["contract_id"] == EXISTING_CONTRACT_ID
        assert "message" in data
    
    def test_auto_generate_returns_existing_contract_idempotency(self, auth_headers):
        """Test that calling auto-generate twice returns existing contract"""
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{EXISTING_RESERVATION_ID}",
            headers=auth_headers
        )
        assert response1.status_code == 200
        contract_id_1 = response1.json()["contract_id"]
        
        # Second call - should return same contract
        response2 = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{EXISTING_RESERVATION_ID}",
            headers=auth_headers
        )
        assert response2.status_code == 200
        contract_id_2 = response2.json()["contract_id"]
        
        assert contract_id_1 == contract_id_2, "Idempotency check failed - different contract IDs returned"
        assert "Contrat déjà généré" in response2.json().get("message", "")
    
    def test_auto_generate_requires_auth(self):
        """Test auto-generate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{EXISTING_RESERVATION_ID}"
        )
        assert response.status_code == 401
    
    def test_auto_generate_nonexistent_reservation(self, auth_headers):
        """Test auto-generate returns 404 for nonexistent reservation"""
        fake_reservation_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{fake_reservation_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
    
    def test_contract_pdf_download(self, auth_headers):
        """Test PDF download for existing contract"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{EXISTING_CONTRACT_ID}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert int(response.headers.get("content-length", 0)) > 1000  # PDF should be > 1KB
    
    def test_contract_pdf_requires_auth(self):
        """Test PDF download requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{EXISTING_CONTRACT_ID}/pdf"
        )
        assert response.status_code == 401
    
    def test_contract_details(self, auth_headers):
        """Test getting contract details"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{EXISTING_CONTRACT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == EXISTING_CONTRACT_ID
        assert data["reservation_id"] == EXISTING_RESERVATION_ID
        assert "contract_data" in data
        assert data["contract_data"]["vehicle_name"]  # Has vehicle name
        assert data["contract_data"]["client_name"]  # Has client name


class TestReservationCreation:
    """Tests for reservation creation that integrates with contract auto-generate"""
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, client_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {client_token}"}
    
    def test_get_vehicles(self):
        """Test vehicles endpoint returns vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        vehicles = response.json()
        assert len(vehicles) > 0
        # Get first vehicle ID for further tests
        return vehicles[0]["id"]
    
    def test_create_reservation_and_auto_generate_contract(self, auth_headers):
        """Test complete flow: create reservation -> auto-generate contract -> download PDF"""
        # Get a vehicle
        vehicles = requests.get(f"{BASE_URL}/api/vehicles").json()
        assert len(vehicles) > 0
        vehicle_id = vehicles[0]["id"]
        
        # Create reservation with unique future dates
        import datetime
        start = (datetime.datetime.now() + datetime.timedelta(days=120)).strftime("%Y-%m-%dT09:00:00.000Z")
        end = (datetime.datetime.now() + datetime.timedelta(days=122)).strftime("%Y-%m-%dT18:00:00.000Z")
        
        res_response = requests.post(
            f"{BASE_URL}/api/reservations",
            headers=auth_headers,
            json={
                "vehicle_id": vehicle_id,
                "start_date": start,
                "end_date": end,
                "options": [],
                "payment_method": "cash"
            }
        )
        
        # May fail if vehicle is booked for those dates - that's OK
        if res_response.status_code == 400:
            pytest.skip("Vehicle not available for test dates")
        
        assert res_response.status_code == 200, f"Reservation creation failed: {res_response.text}"
        reservation = res_response.json()
        assert "id" in reservation
        
        # Auto-generate contract
        contract_response = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{reservation['id']}",
            headers=auth_headers
        )
        assert contract_response.status_code == 200
        contract_data = contract_response.json()
        assert "contract_id" in contract_data
        
        # Download PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_data['contract_id']}/pdf",
            headers=auth_headers
        )
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
