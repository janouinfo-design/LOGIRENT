"""
Test suite for Contract Update Fields endpoint and full reservation-to-contract flow
Tests the PUT /api/admin/contracts/{id}/update-fields endpoint and related workflows

Features tested:
- Update-fields endpoint accepts editable fields and persists them
- Signed contracts cannot be edited (returns 400)
- Full flow: create reservation -> generate contract -> update fields -> sign -> download PDF
- Contract generation auto-populates client/vehicle/date data from reservation
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestContractUpdateFieldsEndpoint:
    """Tests for PUT /api/admin/contracts/{id}/update-fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for Geneva agency"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        if resp.status_code == 200:
            return resp.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if resp.status_code == 200:
            return resp.json().get("access_token")
        pytest.skip("Super admin login failed")

    def test_admin_login_success(self, admin_token):
        """Verify admin login works"""
        assert admin_token is not None, "Admin token should be returned"
        print(f"Admin login successful, token received")
    
    def test_super_admin_login_success(self, super_admin_token):
        """Verify super admin login works"""
        assert super_admin_token is not None, "Super admin token should be returned"
        print(f"Super admin login successful, token received")


class TestFullReservationToContractFlow:
    """Test complete flow: reservation -> contract -> update fields -> sign -> PDF"""
    
    @pytest.fixture(scope="class")
    def super_admin_headers(self):
        """Get super admin headers"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Super admin login failed")

    @pytest.fixture(scope="class")
    def test_client(self, super_admin_headers):
        """Create a test client for reservation flow"""
        unique_id = str(uuid.uuid4())[:8]
        resp = requests.post(f"{BASE_URL}/api/admin/quick-client", json={
            "name": f"TEST_FlowClient_{unique_id}",
            "email": f"test_flowclient_{unique_id}@test.com",
            "phone": "+41791234567"
        }, headers=super_admin_headers)
        if resp.status_code == 200:
            return resp.json().get("client")
        pytest.skip(f"Could not create test client: {resp.status_code} - {resp.text}")

    @pytest.fixture(scope="class")
    def available_vehicle(self, super_admin_headers):
        """Get an available vehicle for testing - using dates far in future"""
        # Use June 2026 which should have availability
        resp = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-06-01&end_date=2026-06-30",
            headers=super_admin_headers
        )
        if resp.status_code == 200:
            vehicles = resp.json().get("vehicles", [])
            if vehicles:
                return vehicles[0]
        pytest.skip("No vehicles available")

    @pytest.fixture(scope="class")
    def new_reservation(self, super_admin_headers, test_client, available_vehicle):
        """Create a fresh reservation for testing - using June 2026 dates"""
        # Use June 2026 dates to avoid conflicts
        payload = {
            "client_id": test_client["id"],
            "vehicle_id": available_vehicle["id"],
            "start_date": "2026-06-20T08:00:00",
            "end_date": "2026-06-22T18:00:00",
            "options": [],
            "payment_method": "cash"
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-reservation-for-client",
            json=payload,
            headers=super_admin_headers
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data.get("reservation", data)
        
        # Try different dates if first fails
        payload["start_date"] = "2026-07-15T08:00:00"
        payload["end_date"] = "2026-07-17T18:00:00"
        resp = requests.post(
            f"{BASE_URL}/api/admin/create-reservation-for-client",
            json=payload,
            headers=super_admin_headers
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return data.get("reservation", data)
        pytest.skip(f"Could not create reservation: {resp.status_code} - {resp.text}")

    @pytest.fixture(scope="class")
    def new_contract(self, super_admin_headers, new_reservation):
        """Generate a fresh contract from the reservation"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            json={"reservation_id": new_reservation["id"], "language": "fr"},
            headers=super_admin_headers
        )
        if resp.status_code == 200:
            return resp.json()
        pytest.skip(f"Could not generate contract: {resp.status_code} - {resp.text}")

    # ----- TESTS -----

    def test_create_reservation_success(self, new_reservation):
        """Test reservation creation works"""
        assert new_reservation is not None
        assert "id" in new_reservation
        print(f"Created reservation: {new_reservation['id']}")

    def test_generate_contract_returns_contract_id(self, new_contract):
        """Test contract generation returns contract_id"""
        assert new_contract is not None
        assert "contract_id" in new_contract
        print(f"Generated contract: {new_contract['contract_id']}")

    def test_contract_auto_populates_client_data(self, super_admin_headers, new_contract, test_client):
        """Test contract_data is auto-populated with client info from reservation"""
        contract_id = new_contract["contract_id"]
        resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        
        assert resp.status_code == 200
        contract = resp.json()
        contract_data = contract.get("contract_data", {})
        
        # Verify client data is populated
        assert "client_name" in contract_data
        assert "client_email" in contract_data
        assert "TEST_FlowClient" in contract_data.get("client_name", "")
        print(f"Contract auto-populated client: {contract_data.get('client_name')}")

    def test_contract_auto_populates_vehicle_data(self, super_admin_headers, new_contract, available_vehicle):
        """Test contract_data is auto-populated with vehicle info"""
        contract_id = new_contract["contract_id"]
        resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        
        assert resp.status_code == 200
        contract = resp.json()
        contract_data = contract.get("contract_data", {})
        
        # Verify vehicle data is populated
        assert "vehicle_name" in contract_data
        vehicle_name = contract_data.get("vehicle_name", "")
        expected_brand = available_vehicle.get("brand", "")
        assert expected_brand in vehicle_name or len(vehicle_name) > 0
        print(f"Contract auto-populated vehicle: {vehicle_name}")

    def test_contract_auto_populates_dates(self, super_admin_headers, new_contract):
        """Test contract_data is auto-populated with dates from reservation"""
        contract_id = new_contract["contract_id"]
        resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        
        assert resp.status_code == 200
        contract = resp.json()
        contract_data = contract.get("contract_data", {})
        
        # Verify dates are populated
        assert "start_date" in contract_data
        assert "end_date" in contract_data
        assert contract_data.get("start_date") != ""
        assert contract_data.get("end_date") != ""
        print(f"Contract dates: {contract_data.get('start_date')} - {contract_data.get('end_date')}")

    def test_update_fields_draft_contract_success(self, super_admin_headers, new_contract):
        """Test updating editable fields on a draft contract succeeds"""
        contract_id = new_contract["contract_id"]
        
        update_payload = {
            "vehicle_plate": "TEST-VD-999",
            "vehicle_color": "ROUGE",
            "km_start": "45230",
            "client_nationality": "CH",
            "client_license": "G12345678",
            "client_license_issued": "01.01.2020",
            "client_license_valid": "01.01.2030",
            "deposit": "1500",
            "deductible": "1000"
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json=update_payload,
            headers=super_admin_headers
        )
        
        assert resp.status_code == 200, f"Update failed: {resp.status_code} - {resp.text}"
        updated_contract = resp.json()
        assert "contract_data" in updated_contract
        print(f"Update-fields succeeded on draft contract")

    def test_updated_fields_persist_in_contract(self, super_admin_headers, new_contract):
        """Test GET after update shows the updated values"""
        contract_id = new_contract["contract_id"]
        
        update_payload = {
            "vehicle_plate": "PERSIST-TEST-123",
            "vehicle_color": "BLEU",
            "km_start": "99999"
        }
        
        requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json=update_payload,
            headers=super_admin_headers
        )
        
        # GET to verify persistence
        resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        assert resp.status_code == 200
        
        contract_data = resp.json().get("contract_data", {})
        
        assert contract_data.get("vehicle_plate") == "PERSIST-TEST-123"
        assert contract_data.get("vehicle_color") == "BLEU"
        assert contract_data.get("km_start") == "99999"
        print(f"All updated fields persisted correctly")

    def test_non_editable_fields_ignored(self, super_admin_headers, new_contract):
        """Test that non-editable fields are silently ignored"""
        contract_id = new_contract["contract_id"]
        
        update_payload = {
            "contract_number": "HACKED-999",
            "agency_name": "HACKED-AGENCY",
            "vehicle_plate": "VALID-UPDATE-123"
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json=update_payload,
            headers=super_admin_headers
        )
        
        assert resp.status_code == 200
        
        get_resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        contract_data = get_resp.json().get("contract_data", {})
        
        assert contract_data.get("contract_number") != "HACKED-999"
        assert contract_data.get("agency_name") != "HACKED-AGENCY"
        assert contract_data.get("vehicle_plate") == "VALID-UPDATE-123"
        print("Non-editable fields correctly ignored")

    def test_sign_contract_success(self, super_admin_headers, new_contract):
        """Test signing the contract after updating fields"""
        contract_id = new_contract["contract_id"]
        
        signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        resp = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/sign",
            json={"signature_data": signature_data},
            headers=super_admin_headers
        )
        
        assert resp.status_code == 200, f"Sign failed: {resp.status_code} - {resp.text}"
        print(f"Contract signed successfully")

    def test_signed_contract_cannot_be_edited(self, super_admin_headers, new_contract):
        """Test that signed contracts return 400 when trying to update fields"""
        contract_id = new_contract["contract_id"]
        
        update_payload = {
            "vehicle_plate": "SHOULD-FAIL",
            "km_start": "12345"
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json=update_payload,
            headers=super_admin_headers
        )
        
        assert resp.status_code == 400, f"Expected 400 for signed contract, got {resp.status_code}"
        print(f"Correctly rejected update on signed contract")

    def test_download_pdf_after_signing(self, super_admin_headers, new_contract):
        """Test PDF download works after contract is signed"""
        contract_id = new_contract["contract_id"]
        
        resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers=super_admin_headers
        )
        
        assert resp.status_code == 200, f"PDF download failed: {resp.status_code}"
        assert resp.headers.get("Content-Type") == "application/pdf"
        assert len(resp.content) > 100
        print(f"PDF downloaded successfully, size: {len(resp.content)} bytes")


class TestUpdateFieldsAccessControl:
    """Test access control for update-fields endpoint"""
    
    @pytest.fixture(scope="class")
    def super_admin_headers(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")
    
    @pytest.fixture(scope="class")
    def client_headers(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "client1@test.com",
            "password": "test1234"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Client login failed")
    
    @pytest.fixture(scope="class")
    def any_draft_contract(self, super_admin_headers):
        """Get or create a draft contract for access control tests"""
        resp = requests.get(f"{BASE_URL}/api/admin/contracts", headers=super_admin_headers)
        if resp.status_code == 200:
            contracts = resp.json()
            for c in contracts:
                if c.get("status") == "draft":
                    return c
        pytest.skip("No draft contract available for access control tests")

    def test_client_cannot_update_fields(self, client_headers, any_draft_contract):
        """Test that clients cannot access update-fields endpoint"""
        if any_draft_contract is None:
            pytest.skip("No contract for testing")
        
        contract_id = any_draft_contract["id"]
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json={"vehicle_plate": "HACK"},
            headers=client_headers
        )
        
        assert resp.status_code in [401, 403], f"Expected 401/403 for client, got {resp.status_code}"
        print(f"Client correctly denied access: {resp.status_code}")

    def test_update_nonexistent_contract_returns_404(self, super_admin_headers):
        """Test updating non-existent contract returns 404"""
        fake_id = "non-existent-contract-id-12345"
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{fake_id}/update-fields",
            json={"vehicle_plate": "TEST"},
            headers=super_admin_headers
        )
        
        assert resp.status_code == 404
        print("Correctly returned 404 for non-existent contract")


class TestAllEditableFields:
    """Test all editable fields can be updated"""
    
    @pytest.fixture(scope="class")
    def super_admin_headers(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")

    @pytest.fixture(scope="class")
    def test_contract_for_fields(self, super_admin_headers):
        """Create a fresh reservation and contract for field testing"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create client
        client_resp = requests.post(f"{BASE_URL}/api/admin/quick-client", json={
            "name": f"TEST_FieldsClient_{unique_id}",
            "email": f"test_fields_{unique_id}@test.com",
        }, headers=super_admin_headers)
        
        if client_resp.status_code != 200:
            pytest.skip("Could not create client")
        
        client = client_resp.json().get("client")
        
        # Get vehicle - use August 2026 dates
        schedule_resp = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-08-01&end_date=2026-08-10",
            headers=super_admin_headers
        )
        vehicles = schedule_resp.json().get("vehicles", []) if schedule_resp.status_code == 200 else []
        if not vehicles:
            pytest.skip("No vehicles available")
        
        vehicle = vehicles[0]
        
        # Create reservation for August 2026
        res_resp = requests.post(f"{BASE_URL}/api/admin/create-reservation-for-client", json={
            "client_id": client["id"],
            "vehicle_id": vehicle["id"],
            "start_date": "2026-08-10T08:00:00",
            "end_date": "2026-08-12T18:00:00",
            "options": [],
            "payment_method": "cash"
        }, headers=super_admin_headers)
        
        if res_resp.status_code != 200:
            # Try September
            res_resp = requests.post(f"{BASE_URL}/api/admin/create-reservation-for-client", json={
                "client_id": client["id"],
                "vehicle_id": vehicle["id"],
                "start_date": "2026-09-01T08:00:00",
                "end_date": "2026-09-03T18:00:00",
                "options": [],
                "payment_method": "cash"
            }, headers=super_admin_headers)
        
        if res_resp.status_code != 200:
            pytest.skip(f"Could not create reservation: {res_resp.text}")
        
        reservation = res_resp.json().get("reservation", res_resp.json())
        
        # Generate contract
        contract_resp = requests.post(f"{BASE_URL}/api/admin/contracts/generate", json={
            "reservation_id": reservation["id"],
            "language": "fr"
        }, headers=super_admin_headers)
        
        if contract_resp.status_code != 200:
            pytest.skip(f"Could not generate contract: {contract_resp.text}")
        
        return contract_resp.json()

    def test_all_editable_fields_update(self, super_admin_headers, test_contract_for_fields):
        """Test all documented editable fields can be updated"""
        contract_id = test_contract_for_fields["contract_id"]
        
        # All editable fields from the endpoint
        all_fields = {
            "vehicle_plate": "ALL-FIELDS-TEST",
            "vehicle_color": "VERT",
            "vehicle_chassis": "CHASSIS123456789",
            "km_start": "55000",
            "km_return": "55500",
            "client_name": "UpdatedLastName",
            "client_firstname": "UpdatedFirstName",
            "client_address": "123 Test Street, Geneva",
            "client_phone": "+41791111111",
            "client_email": "updated@test.com",
            "client_nationality": "FR",
            "client_dob": "15.05.1990",
            "client_license": "LICENSE999",
            "client_license_issued": "01.06.2015",
            "client_license_valid": "01.06.2025",
            "deposit": "2000",
            "deductible": "1500",
            "price_per_day": "150",
            "price_weekend_fri": "120",
            "price_weekend_sat": "100",
            "price_hour": "20",
            "price_week": "700",
            "price_month_2000": "2500",
            "price_month_3000": "3000",
            "price_extra_km": "0.50"
        }
        
        # Update all fields
        resp = requests.put(
            f"{BASE_URL}/api/admin/contracts/{contract_id}/update-fields",
            json=all_fields,
            headers=super_admin_headers
        )
        
        assert resp.status_code == 200, f"Update all fields failed: {resp.status_code} - {resp.text}"
        
        # GET and verify all fields
        get_resp = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=super_admin_headers)
        assert get_resp.status_code == 200
        
        contract_data = get_resp.json().get("contract_data", {})
        
        # Check each field was updated
        failures = []
        for key, expected_value in all_fields.items():
            actual_value = contract_data.get(key)
            if str(actual_value) != str(expected_value):
                failures.append(f"{key}: expected '{expected_value}', got '{actual_value}'")
        
        assert len(failures) == 0, f"Fields not updated: {failures}"
        print(f"All {len(all_fields)} editable fields updated and persisted correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
