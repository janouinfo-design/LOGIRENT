"""
Iteration 57 - Test new post-contract signing workflow features
Features tested:
- GET /api/admin/reservations/today - Returns today's reservations with vehicle and user names
- GET /api/client/reservations - Returns client's reservations with vehicle names and contract info
- GET /api/admin/reservations/{id}/check-documents - Returns document check results
- PUT /api/contracts/{id}/sign - Post-signature workflow (status update + email)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-pricing.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"


class TestBackendEndpoints:
    """Test new backend API endpoints for iteration 57"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin authentication failed - skipping tests")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Client authentication failed - skipping tests")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin auth headers"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def client_headers(self, client_token):
        """Get client auth headers"""
        return {"Authorization": f"Bearer {client_token}", "Content-Type": "application/json"}
    
    # ==================== TODAY RESERVATIONS ENDPOINT ====================
    
    def test_today_reservations_endpoint_exists(self, admin_headers):
        """Test GET /api/admin/reservations/today endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations/today", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_today_reservations_response_structure(self, admin_headers):
        """Test that today reservations response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations/today", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "reservations" in data, "Response should contain 'reservations' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["reservations"], list), "Reservations should be a list"
        assert isinstance(data["total"], int), "Total should be an integer"
    
    def test_today_reservations_item_has_user_vehicle_names(self, admin_headers):
        """Test that each reservation has user_name and vehicle_name"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations/today", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        # If there are reservations today, verify they have required fields
        if len(data["reservations"]) > 0:
            r = data["reservations"][0]
            assert "user_name" in r, "Reservation should have user_name"
            assert "vehicle_name" in r, "Reservation should have vehicle_name"
            assert "id" in r, "Reservation should have id"
            assert "status" in r, "Reservation should have status"
            assert "start_date" in r, "Reservation should have start_date"
        else:
            # No reservations today is fine, just log it
            print("INFO: No reservations today - structure test skipped")
    
    # ==================== CLIENT RESERVATIONS ENDPOINT ====================
    
    def test_client_reservations_endpoint_exists(self, client_headers):
        """Test GET /api/client/reservations endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/client/reservations", headers=client_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_client_reservations_response_structure(self, client_headers):
        """Test that client reservations response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/client/reservations", headers=client_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "reservations" in data, "Response should contain 'reservations' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["reservations"], list), "Reservations should be a list"
    
    def test_client_reservations_has_vehicle_and_contract_info(self, client_headers):
        """Test that client reservations include vehicle_name and contract info"""
        response = requests.get(f"{BASE_URL}/api/client/reservations", headers=client_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reservations"]) > 0:
            r = data["reservations"][0]
            assert "vehicle_name" in r, "Reservation should have vehicle_name"
            assert "contract_id" in r, "Reservation should have contract_id (can be null)"
            assert "contract_status" in r, "Reservation should have contract_status (can be null)"
            print(f"INFO: First client reservation has vehicle_name: {r['vehicle_name']}, contract_id: {r['contract_id']}")
        else:
            print("INFO: No client reservations - structure test skipped")
    
    def test_client_reservations_sorted_by_start_date_desc(self, client_headers):
        """Test that client reservations are sorted by start_date DESC"""
        response = requests.get(f"{BASE_URL}/api/client/reservations", headers=client_headers)
        assert response.status_code == 200
        
        data = response.json()
        reservations = data["reservations"]
        if len(reservations) >= 2:
            # Check that dates are in descending order
            dates = [r.get("start_date", "") for r in reservations if r.get("start_date")]
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i + 1], f"Reservations should be sorted DESC: {dates[i]} should be >= {dates[i+1]}"
            print(f"INFO: Verified {len(dates)} reservations sorted by start_date DESC")
        else:
            print("INFO: Not enough reservations to verify sorting")
    
    # ==================== CHECK DOCUMENTS ENDPOINT ====================
    
    def test_check_documents_endpoint_returns_404_for_invalid_id(self, admin_headers):
        """Test that check-documents returns 404 for non-existent reservation"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations/invalid-id-123/check-documents", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_check_documents_with_valid_reservation(self, admin_headers):
        """Test check-documents endpoint with a valid reservation ID"""
        # First get a reservation
        res_response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=1", headers=admin_headers)
        assert res_response.status_code == 200
        
        data = res_response.json()
        if len(data.get("reservations", [])) == 0:
            pytest.skip("No reservations found to test check-documents")
        
        reservation_id = data["reservations"][0]["id"]
        
        # Now test check-documents
        response = requests.get(f"{BASE_URL}/api/admin/reservations/{reservation_id}/check-documents", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        doc_data = response.json()
        assert "client_id" in doc_data, "Should have client_id"
        assert "client_name" in doc_data, "Should have client_name"
        assert "documents_complete" in doc_data, "Should have documents_complete boolean"
        assert "missing_documents" in doc_data, "Should have missing_documents list"
        assert "has_id" in doc_data, "Should have has_id boolean"
        assert "has_id_back" in doc_data, "Should have has_id_back boolean"
        assert "has_license" in doc_data, "Should have has_license boolean"
        assert "has_license_back" in doc_data, "Should have has_license_back boolean"
        
        print(f"INFO: Document check result - complete: {doc_data['documents_complete']}, missing: {doc_data['missing_documents']}")
    
    # ==================== CONTRACT SIGN ENDPOINT ====================
    
    def test_contract_generate_endpoint(self, admin_headers):
        """Test contract generation endpoint"""
        # First get a reservation
        res_response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=1", headers=admin_headers)
        assert res_response.status_code == 200
        
        data = res_response.json()
        if len(data.get("reservations", [])) == 0:
            pytest.skip("No reservations found to test contract generation")
        
        reservation_id = data["reservations"][0]["id"]
        
        # Generate contract
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=admin_headers,
            json={"reservation_id": reservation_id, "language": "fr"}
        )
        # 200 = new contract or update existing
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        contract_data = response.json()
        assert "contract_id" in contract_data, "Should return contract_id"
        assert "message" in contract_data, "Should return message"
        print(f"INFO: Contract generated/updated: {contract_data['message']}")
    
    def test_contract_by_reservation_endpoint(self, admin_headers):
        """Test getting contract by reservation ID"""
        # First get a reservation
        res_response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=1", headers=admin_headers)
        assert res_response.status_code == 200
        
        data = res_response.json()
        if len(data.get("reservations", [])) == 0:
            pytest.skip("No reservations found")
        
        reservation_id = data["reservations"][0]["id"]
        
        # Get contract by reservation
        response = requests.get(f"{BASE_URL}/api/contracts/by-reservation/{reservation_id}", headers=admin_headers)
        # Can be 200 (contract exists) or null (no contract yet)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        if response.json():
            contract = response.json()
            assert "id" in contract, "Contract should have id"
            assert "status" in contract, "Contract should have status"
            print(f"INFO: Contract found - id: {contract['id']}, status: {contract['status']}")
        else:
            print("INFO: No contract for this reservation yet")
    
    def test_contract_pdf_download(self, admin_headers):
        """Test contract PDF download endpoint"""
        # Get a contract
        contracts_response = requests.get(f"{BASE_URL}/api/admin/contracts", headers=admin_headers)
        assert contracts_response.status_code == 200
        
        contracts = contracts_response.json()
        if len(contracts) == 0:
            pytest.skip("No contracts found to test PDF download")
        
        contract_id = contracts[0]["id"]
        
        # Download PDF
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}/pdf", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf", "Should return PDF content type"
        assert len(response.content) > 100, "PDF should have content"
        print(f"INFO: PDF downloaded successfully, size: {len(response.content)} bytes")
    
    # ==================== ADMIN STATS ENDPOINT ====================
    
    def test_admin_stats_endpoint(self, admin_headers):
        """Test admin stats endpoint for dashboard"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        stats = response.json()
        assert "total_vehicles" in stats, "Should have total_vehicles"
        assert "total_reservations" in stats, "Should have total_reservations"
        assert "total_users" in stats, "Should have total_users"
        print(f"INFO: Admin stats - vehicles: {stats['total_vehicles']}, reservations: {stats['total_reservations']}, users: {stats['total_users']}")
    
    # ==================== ADMIN RESERVATIONS LIST ====================
    
    def test_admin_reservations_has_user_vehicle_names(self, admin_headers):
        """Test that admin reservations list includes user_name and vehicle_name"""
        response = requests.get(f"{BASE_URL}/api/admin/reservations?limit=5", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "reservations" in data
        
        if len(data["reservations"]) > 0:
            r = data["reservations"][0]
            assert "user_name" in r, "Admin reservations should have user_name"
            assert "vehicle_name" in r, "Admin reservations should have vehicle_name"
            print(f"INFO: Admin reservation - user: {r['user_name']}, vehicle: {r['vehicle_name']}")
    
    # ==================== CONTRACT SEND ENDPOINT ====================
    
    def test_contract_send_endpoint(self, admin_headers):
        """Test contract send endpoint"""
        # Get a contract
        contracts_response = requests.get(f"{BASE_URL}/api/admin/contracts", headers=admin_headers)
        assert contracts_response.status_code == 200
        
        contracts = contracts_response.json()
        if len(contracts) == 0:
            pytest.skip("No contracts found to test send")
        
        contract_id = contracts[0]["id"]
        
        # Send contract
        response = requests.put(f"{BASE_URL}/api/contracts/{contract_id}/send", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result, "Should return message"
        print(f"INFO: Contract send result: {result['message']}")


class TestContractSignWorkflow:
    """Test contract signing workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin authentication failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_sign_contract_returns_expected_fields(self, admin_headers):
        """Test that sign contract returns reservation_status and email_sent"""
        # Get a contract that's not signed
        contracts_response = requests.get(f"{BASE_URL}/api/admin/contracts", headers=admin_headers)
        assert contracts_response.status_code == 200
        
        contracts = contracts_response.json()
        # Find a non-signed contract
        non_signed = [c for c in contracts if c.get("status") != "signed"]
        
        if len(non_signed) == 0:
            print("INFO: All contracts are signed - testing sign endpoint behavior")
            if len(contracts) == 0:
                pytest.skip("No contracts found")
            
            # Try signing an already signed contract - should return 400
            contract_id = contracts[0]["id"]
            response = requests.put(
                f"{BASE_URL}/api/contracts/{contract_id}/sign",
                headers=admin_headers,
                json={"signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}
            )
            # Already signed contracts should return 400
            if contracts[0].get("status") == "signed":
                assert response.status_code == 400, "Should return 400 for already signed contract"
                print("INFO: Correctly rejected signing already signed contract")
            return
        
        # Sign the contract
        contract_id = non_signed[0]["id"]
        response = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/sign",
            headers=admin_headers,
            json={"signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result, "Should have message"
        assert "reservation_status" in result, "Should have reservation_status"
        assert "email_sent" in result, "Should have email_sent boolean"
        
        assert result["reservation_status"] == "confirmed", "Reservation should be confirmed after signing"
        print(f"INFO: Contract signed - reservation_status: {result['reservation_status']}, email_sent: {result['email_sent']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
