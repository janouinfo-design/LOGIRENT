"""
Contract System API Tests - LogiRent
Tests for contract generation, signing, sending, and PDF download
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fleet-staging-2.preview.emergentagent.com')

class TestContractSystem:
    """Test contract system endpoints"""
    
    admin_token = None
    admin_user_id = None
    admin_agency_id = None
    test_contract_id = None
    test_reservation_id = None
    
    @classmethod
    def setup_class(cls):
        """Login as admin to get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        cls.admin_token = data["access_token"]
        cls.admin_user_id = data["user"]["id"]
        cls.admin_agency_id = data["user"]["agency_id"]
        
    def get_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    # ============ GET /api/contracts/{id} ============
    def test_get_existing_contract(self):
        """Test GET /api/contracts/{id} returns contract with all fields"""
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.get_headers())
        
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        contract = response.json()
        
        # Verify all required fields
        assert "id" in contract
        assert "reservation_id" in contract
        assert "status" in contract
        assert "language" in contract
        assert "contract_data" in contract
        
        # Verify contract_data fields
        cd = contract["contract_data"]
        assert "agency_name" in cd
        assert "client_name" in cd
        assert "client_email" in cd
        assert "vehicle_name" in cd
        assert "start_date" in cd
        assert "end_date" in cd
        assert "total_price" in cd
        
        # This contract is already signed
        assert contract["status"] == "signed"
        assert "signature_client" in contract
        print(f"✓ GET /api/contracts/{contract_id} - Contract retrieved with all fields")
    
    def test_get_contract_not_found(self):
        """Test GET /api/contracts/{id} returns 404 for non-existent contract"""
        response = requests.get(f"{BASE_URL}/api/contracts/non-existent-id", headers=self.get_headers())
        assert response.status_code == 404
        print("✓ GET /api/contracts/non-existent-id - Returns 404 as expected")
    
    # ============ GET /api/contracts/by-reservation/{reservation_id} ============
    def test_get_contract_by_reservation(self):
        """Test GET /api/contracts/by-reservation/{reservation_id}"""
        reservation_id = "ac97709b-1a96-4fef-83a6-e308029a033b"  # Has existing contract
        response = requests.get(
            f"{BASE_URL}/api/contracts/by-reservation/{reservation_id}", 
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        contract = response.json()
        assert contract["reservation_id"] == reservation_id
        print(f"✓ GET /api/contracts/by-reservation/{reservation_id} - Contract found")
    
    def test_get_contract_by_reservation_not_found(self):
        """Test GET /api/contracts/by-reservation/{id} returns 404 for no contract"""
        # Use a reservation that has no contract
        response = requests.get(
            f"{BASE_URL}/api/contracts/by-reservation/non-existent", 
            headers=self.get_headers()
        )
        assert response.status_code == 404
        print("✓ GET /api/contracts/by-reservation/non-existent - Returns 404")
    
    # ============ POST /api/admin/contracts/generate ============
    def test_generate_contract_fr(self):
        """Test POST /api/admin/contracts/generate with French language"""
        # Use a reservation without contract: 889e73f1-8576-4c5f-a310-30d38488a3fe
        reservation_id = "889e73f1-8576-4c5f-a310-30d38488a3fe"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=self.get_headers(),
            json={"reservation_id": reservation_id, "language": "fr"}
        )
        
        # Should succeed or update existing
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "contract_id" in data
        TestContractSystem.test_contract_id = data["contract_id"]
        TestContractSystem.test_reservation_id = reservation_id
        print(f"✓ POST /api/admin/contracts/generate (FR) - Contract created: {data['contract_id']}")
    
    def test_generate_contract_en(self):
        """Test POST /api/admin/contracts/generate with English language"""
        # Use another reservation: 3bc6d869-71d0-464b-acce-9bb7ee9f13f5
        reservation_id = "3bc6d869-71d0-464b-acce-9bb7ee9f13f5"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=self.get_headers(),
            json={"reservation_id": reservation_id, "language": "en"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "contract_id" in data
        print(f"✓ POST /api/admin/contracts/generate (EN) - Contract created: {data['contract_id']}")
        
        # Verify language was set
        contract_resp = requests.get(
            f"{BASE_URL}/api/contracts/{data['contract_id']}", 
            headers=self.get_headers()
        )
        assert contract_resp.status_code == 200
        contract = contract_resp.json()
        assert contract["language"] == "en", f"Language should be 'en', got {contract['language']}"
        print("✓ Contract language correctly set to English")
    
    def test_generate_contract_invalid_reservation(self):
        """Test POST /api/admin/contracts/generate with invalid reservation"""
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=self.get_headers(),
            json={"reservation_id": "invalid-id", "language": "fr"}
        )
        assert response.status_code == 404
        print("✓ POST /api/admin/contracts/generate (invalid) - Returns 404")
    
    # ============ GET /api/admin/contracts ============
    def test_list_contracts(self):
        """Test GET /api/admin/contracts lists all contracts for agency"""
        response = requests.get(f"{BASE_URL}/api/admin/contracts", headers=self.get_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        contracts = response.json()
        assert isinstance(contracts, list)
        print(f"✓ GET /api/admin/contracts - Found {len(contracts)} contracts")
        
        if len(contracts) > 0:
            # Verify structure
            c = contracts[0]
            assert "id" in c
            assert "status" in c
            assert "reservation_id" in c
    
    # ============ PUT /api/contracts/{id}/send ============
    def test_send_contract(self):
        """Test PUT /api/contracts/{id}/send marks contract as sent"""
        if not TestContractSystem.test_contract_id:
            pytest.skip("No test contract available")
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{TestContractSystem.test_contract_id}/send",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ PUT /api/contracts/{TestContractSystem.test_contract_id}/send - Contract sent")
        
        # Verify status changed
        contract_resp = requests.get(
            f"{BASE_URL}/api/contracts/{TestContractSystem.test_contract_id}",
            headers=self.get_headers()
        )
        assert contract_resp.status_code == 200
        contract = contract_resp.json()
        assert contract["status"] == "sent", f"Status should be 'sent', got {contract['status']}"
        print("✓ Contract status updated to 'sent'")
    
    # ============ PUT /api/contracts/{id}/sign ============
    def test_sign_contract(self):
        """Test PUT /api/contracts/{id}/sign accepts signature and marks as signed"""
        if not TestContractSystem.test_contract_id:
            pytest.skip("No test contract available")
        
        # Sample signature data (base64 image)
        signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAABJRU5ErkJggg=="
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{TestContractSystem.test_contract_id}/sign",
            headers=self.get_headers(),
            json={"signature_data": signature_data}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ PUT /api/contracts/{TestContractSystem.test_contract_id}/sign - Contract signed")
        
        # Verify signature saved and status changed
        contract_resp = requests.get(
            f"{BASE_URL}/api/contracts/{TestContractSystem.test_contract_id}",
            headers=self.get_headers()
        )
        assert contract_resp.status_code == 200
        contract = contract_resp.json()
        assert contract["status"] == "signed", f"Status should be 'signed', got {contract['status']}"
        assert contract["signature_client"] is not None
        assert contract["signature_date"] is not None
        print("✓ Contract status updated to 'signed' with signature data")
    
    def test_sign_already_signed_contract(self):
        """Test PUT /api/contracts/{id}/sign fails for already signed contract"""
        # The original existing contract is already signed
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/sign",
            headers=self.get_headers(),
            json={"signature_data": "data:image/png;base64,test"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ PUT /api/contracts/{id}/sign - Rejects already signed contract with 400")
    
    # ============ GET /api/contracts/{id}/pdf ============
    def test_download_pdf(self):
        """Test GET /api/contracts/{id}/pdf generates valid PDF"""
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF starts with %PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ GET /api/contracts/{contract_id}/pdf - Valid PDF generated ({len(content)} bytes)")
    
    def test_download_pdf_not_found(self):
        """Test GET /api/contracts/{id}/pdf returns 404 for non-existent contract"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/non-existent/pdf",
            headers=self.get_headers()
        )
        assert response.status_code == 404
        print("✓ GET /api/contracts/non-existent/pdf - Returns 404")


class TestContractDataIntegrity:
    """Test contract data integrity and structure"""
    
    admin_token = None
    
    @classmethod
    def setup_class(cls):
        """Login as admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
        )
        assert response.status_code == 200
        cls.admin_token = response.json()["access_token"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_contract_has_all_required_sections(self):
        """Verify contract_data contains all required sections"""
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        contract = response.json()
        cd = contract["contract_data"]
        
        # Section 1: Tenant Info
        assert "client_name" in cd
        assert "client_email" in cd
        assert "client_phone" in cd
        assert "client_address" in cd
        assert "client_license" in cd
        
        # Section 2: Vehicle
        assert "vehicle_name" in cd
        assert "vehicle_plate" in cd
        assert "start_date" in cd
        assert "end_date" in cd
        
        # Section 3: Price
        assert "total_price" in cd
        
        # Section 4: Deposit
        assert "deposit" in cd
        
        # Agency info
        assert "agency_name" in cd
        
        # Language
        assert "language" in cd
        
        print("✓ Contract data contains all required sections")
    
    def test_contract_status_flow(self):
        """Test valid contract status values"""
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        contract = response.json()
        assert contract["status"] in ["draft", "sent", "signed"], f"Unexpected status: {contract['status']}"
        print(f"✓ Contract status '{contract['status']}' is valid")


class TestContractClientAccess:
    """Test contract access from client perspective"""
    
    client_token = None
    
    @classmethod
    def setup_class(cls):
        """Login as client or skip if no client available"""
        # Try super admin who can access any contract
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if response.status_code == 200:
            cls.client_token = response.json()["access_token"]
        else:
            pytest.skip("No test client available")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.client_token}"}
    
    def test_super_admin_can_access_contracts(self):
        """Test super admin can access any contract"""
        contract_id = "1ae05704-4032-492c-826f-21fa9eea804a"
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        
        # Super admin should be able to access
        assert response.status_code == 200, f"Super admin should access contract: {response.text}"
        print("✓ Super admin can access contracts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
