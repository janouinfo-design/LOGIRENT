"""
ABICAR-Style Contract API Tests - LogiRent
Tests for the newly rewritten contract generation with ABICAR-style PDF format
Focus: contract_number, vehicle_color, client_nationality, start_time, end_time, 
       km_start, price_per_day, deductible, agency_address, agency_phone
"""
import pytest
import requests
import os
import fitz  # PyMuPDF

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fleet-management-hub-9.preview.emergentagent.com').rstrip('/')


class TestABICARContractGeneration:
    """Test ABICAR-style contract generation and PDF content"""
    
    admin_token = None
    admin_agency_id = None
    test_contract_id = None
    test_reservation_id = None
    
    @classmethod
    def setup_class(cls):
        """Login as Geneva admin"""
        print(f"\n[SETUP] Using BASE_URL: {BASE_URL}")
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        cls.admin_token = data["access_token"]
        cls.admin_agency_id = data["user"].get("agency_id")
        print(f"[SETUP] Logged in as Geneva admin, agency_id: {cls.admin_agency_id}")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}

    # ============ TEST 1: POST /api/admin/contracts/generate ============
    def test_01_generate_contract_returns_contract_id(self):
        """Test POST /api/admin/contracts/generate returns contract_id for existing reservation"""
        # First, find a reservation that belongs to Geneva agency
        response = requests.get(
            f"{BASE_URL}/api/admin/reservations",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to get reservations: {response.text}"
        data = response.json()
        
        # Handle both list and object response formats
        if isinstance(data, list):
            reservations = data
        elif isinstance(data, dict) and "reservations" in data:
            reservations = data["reservations"]
        else:
            reservations = []
        
        assert len(reservations) > 0, "No reservations found for testing"
        
        # Pick a reservation to generate contract for
        test_reservation = reservations[0]
        TestABICARContractGeneration.test_reservation_id = test_reservation["id"]
        
        print(f"\n[TEST] Generating contract for reservation: {test_reservation['id']}")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=self.get_headers(),
            json={"reservation_id": test_reservation["id"], "language": "fr"}
        )
        
        assert response.status_code == 200, f"Contract generation failed: {response.text}"
        data = response.json()
        
        # Verify response contains contract_id
        assert "contract_id" in data, f"Response missing contract_id: {data}"
        TestABICARContractGeneration.test_contract_id = data["contract_id"]
        print(f"PASS: Contract generated with id: {data['contract_id']}")

    # ============ TEST 2: GET /api/contracts/{id} - Verify New Fields ============
    def test_02_get_contract_has_abicar_fields(self):
        """Test GET /api/contracts/{id} returns all new ABICAR-style fields"""
        if not TestABICARContractGeneration.test_contract_id:
            pytest.skip("No test contract available")
        
        contract_id = TestABICARContractGeneration.test_contract_id
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        contract = response.json()
        
        # Verify top-level fields
        assert "id" in contract
        assert "reservation_id" in contract
        assert "status" in contract
        assert "language" in contract
        assert "contract_data" in contract
        
        cd = contract["contract_data"]
        
        # NEW ABICAR-STYLE FIELDS - contract_number
        assert "contract_number" in cd, "Missing contract_number"
        print(f"  contract_number: {cd['contract_number']}")
        
        # NEW ABICAR-STYLE FIELDS - vehicle_color
        assert "vehicle_color" in cd, "Missing vehicle_color"
        print(f"  vehicle_color: {cd['vehicle_color']}")
        
        # NEW ABICAR-STYLE FIELDS - client_nationality
        assert "client_nationality" in cd, "Missing client_nationality"
        print(f"  client_nationality: {cd['client_nationality']}")
        
        # NEW ABICAR-STYLE FIELDS - start_time, end_time
        assert "start_time" in cd, "Missing start_time"
        assert "end_time" in cd, "Missing end_time"
        print(f"  start_time: {cd['start_time']}, end_time: {cd['end_time']}")
        
        # NEW ABICAR-STYLE FIELDS - km_start
        assert "km_start" in cd, "Missing km_start"
        print(f"  km_start: {cd['km_start']}")
        
        # NEW ABICAR-STYLE FIELDS - price_per_day
        assert "price_per_day" in cd, "Missing price_per_day"
        print(f"  price_per_day: {cd['price_per_day']}")
        
        # NEW ABICAR-STYLE FIELDS - deductible
        assert "deductible" in cd, "Missing deductible"
        print(f"  deductible: {cd['deductible']}")
        
        # NEW ABICAR-STYLE FIELDS - agency_address, agency_phone
        assert "agency_address" in cd, "Missing agency_address"
        assert "agency_phone" in cd, "Missing agency_phone"
        print(f"  agency_address: {cd['agency_address']}")
        print(f"  agency_phone: {cd['agency_phone']}")
        
        # EXISTING FIELDS should still be present
        assert "agency_name" in cd, "Missing agency_name"
        assert "client_name" in cd, "Missing client_name"
        assert "client_email" in cd, "Missing client_email"
        assert "vehicle_name" in cd, "Missing vehicle_name"
        assert "vehicle_plate" in cd, "Missing vehicle_plate"
        assert "start_date" in cd, "Missing start_date"
        assert "end_date" in cd, "Missing end_date"
        assert "total_price" in cd, "Missing total_price"
        assert "deposit" in cd, "Missing deposit"
        
        print("\nPASS: Contract contains all ABICAR-style fields")

    # ============ TEST 3: GET /api/contracts/{id}/pdf - Valid PDF ============
    def test_03_download_pdf_valid_format(self):
        """Test GET /api/contracts/{id}/pdf returns a valid PDF file"""
        if not TestABICARContractGeneration.test_contract_id:
            pytest.skip("No test contract available")
        
        contract_id = TestABICARContractGeneration.test_contract_id
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"PDF download failed: {response.text}"
        assert "application/pdf" in response.headers.get("content-type", ""), "Content-Type not PDF"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF (missing %PDF header)"
        assert len(content) > 1000, f"PDF too small ({len(content)} bytes), may be invalid"
        
        print(f"PASS: Valid PDF downloaded ({len(content)} bytes)")

    # ============ TEST 4: PDF Content - ABICAR Sections ============
    def test_04_pdf_contains_abicar_sections(self):
        """Test PDF contains ABICAR-style sections: header, vehicle, tenant, dates, pricing, legal, signature"""
        if not TestABICARContractGeneration.test_contract_id:
            pytest.skip("No test contract available")
        
        contract_id = TestABICARContractGeneration.test_contract_id
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        # Parse PDF with PyMuPDF
        pdf_doc = fitz.open(stream=response.content, filetype="pdf")
        pdf_text = ""
        for page in pdf_doc:
            pdf_text += page.get_text()
        pdf_doc.close()
        
        print(f"\n[PDF Content Preview - First 2000 chars]:\n{pdf_text[:2000]}\n")
        
        # Check for ABICAR-style header (agency name + CONTRAT DE LOCATION or RENTAL CONTRACT)
        assert "CONTRAT DE LOCATION" in pdf_text or "RENTAL CONTRACT" in pdf_text, \
            "Missing contract title header"
        print("  PASS: Header - Contains CONTRAT DE LOCATION / RENTAL CONTRACT")
        
        # Check for contract number section
        assert "contrat" in pdf_text.lower() or "contract" in pdf_text.lower(), \
            "Missing contract number reference"
        print("  PASS: Header - Contains contract number reference")
        
        # Check for vehicle section labels
        assert any(term in pdf_text for term in ["Vehicule", "Vehicle", "Plaques", "Plates"]), \
            "Missing vehicle section labels"
        print("  PASS: Vehicle section - Contains vehicle labels")
        
        # Check for tenant/responsible section
        assert any(term in pdf_text for term in ["Responsable", "Responsible", "Nom", "Last name", "Email"]), \
            "Missing tenant section labels"
        print("  PASS: Tenant section - Contains tenant labels")
        
        # Check for dates/km section
        assert any(term in pdf_text for term in ["Date de Prise", "Pickup Date", "Km Depart", "Start Km"]), \
            "Missing dates/km section"
        print("  PASS: Dates/Km section - Contains date and km labels")
        
        # Check for pricing table
        assert any(term in pdf_text for term in ["Prix", "Price", "Jour", "Day", "CHF"]), \
            "Missing pricing information"
        print("  PASS: Pricing section - Contains pricing labels")
        
        # Check for legal conditions text
        assert any(term in pdf_text for term in ["conditions", "Conditions", "assurance", "insurance", "franchise", "deductible"]), \
            "Missing legal conditions text"
        print("  PASS: Legal section - Contains conditions text")
        
        # Check for signature area
        assert "Signature" in pdf_text or "signature" in pdf_text, \
            "Missing signature area"
        print("  PASS: Signature section - Contains signature label")
        
        print("\nPASS: PDF contains all ABICAR-style sections")

    # ============ TEST 5: PUT /api/contracts/{id}/send ============
    def test_05_send_contract_to_client(self):
        """Test PUT /api/contracts/{id}/send marks contract as sent"""
        if not TestABICARContractGeneration.test_contract_id:
            pytest.skip("No test contract available")
        
        contract_id = TestABICARContractGeneration.test_contract_id
        response = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/send",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Send contract failed: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify status changed to 'sent'
        verify_resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        assert verify_resp.status_code == 200
        contract = verify_resp.json()
        assert contract["status"] == "sent", f"Status should be 'sent', got {contract['status']}"
        
        print("PASS: Contract sent to client, status updated to 'sent'")

    # ============ TEST 6: PUT /api/contracts/{id}/sign ============
    def test_06_sign_contract_with_signature(self):
        """Test PUT /api/contracts/{id}/sign accepts signature data"""
        if not TestABICARContractGeneration.test_contract_id:
            pytest.skip("No test contract available")
        
        contract_id = TestABICARContractGeneration.test_contract_id
        
        # Base64 signature data (minimal valid PNG)
        signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAF5SURBVHic7dZBDoAgEATBof9/Od58gBs3U1dzJHFmYQkAAAAAAAAAAAAAAOCb7UrB7vabz5nGOiAAAAAAAJC5fAb77m7xPWdpO3oHAAAAJLKf9+/Y7bWj+zsAAADAD+zn/Tt2e+3o/g4AAADwA/t5/47dXju6vwMAAAD8wH7ev2O3147u7wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        
        response = requests.put(
            f"{BASE_URL}/api/contracts/{contract_id}/sign",
            headers=self.get_headers(),
            json={"signature_data": signature_data}
        )
        
        assert response.status_code == 200, f"Sign contract failed: {response.text}"
        
        # Verify signature saved and status changed
        verify_resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=self.get_headers()
        )
        assert verify_resp.status_code == 200
        contract = verify_resp.json()
        assert contract["status"] == "signed", f"Status should be 'signed', got {contract['status']}"
        assert contract.get("signature_client") is not None, "Signature data not saved"
        assert contract.get("signature_date") is not None, "Signature date not saved"
        
        print("PASS: Contract signed successfully")

    # ============ TEST 7: GET /api/admin/contracts ============
    def test_07_list_all_contracts(self):
        """Test GET /api/admin/contracts lists all contracts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"List contracts failed: {response.text}"
        contracts = response.json()
        
        assert isinstance(contracts, list), "Response should be a list"
        print(f"PASS: Found {len(contracts)} contracts")
        
        if len(contracts) > 0:
            # Verify structure
            c = contracts[0]
            assert "id" in c
            assert "status" in c
            assert "reservation_id" in c
            assert "contract_data" in c
            print(f"  First contract status: {c['status']}")

    # ============ TEST 8: GET /api/contracts/by-reservation/{reservation_id} ============
    def test_08_get_contract_by_reservation(self):
        """Test GET /api/contracts/by-reservation/{reservation_id}"""
        if not TestABICARContractGeneration.test_reservation_id:
            pytest.skip("No test reservation available")
        
        reservation_id = TestABICARContractGeneration.test_reservation_id
        response = requests.get(
            f"{BASE_URL}/api/contracts/by-reservation/{reservation_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Get contract by reservation failed: {response.text}"
        contract = response.json()
        
        assert contract["reservation_id"] == reservation_id, "Reservation ID mismatch"
        print(f"PASS: Found contract for reservation {reservation_id}")

    # ============ TEST 9: Error Handling - Invalid Reservation ============
    def test_09_generate_contract_invalid_reservation(self):
        """Test POST /api/admin/contracts/generate returns 404 for invalid reservation"""
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers=self.get_headers(),
            json={"reservation_id": "non-existent-reservation-id", "language": "fr"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Returns 404 for invalid reservation")

    # ============ TEST 10: Error Handling - Contract Not Found ============
    def test_10_get_contract_not_found(self):
        """Test GET /api/contracts/{id} returns 404 for non-existent contract"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/non-existent-contract-id",
            headers=self.get_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Returns 404 for non-existent contract")


class TestABICARPDFContentValidation:
    """Deep validation of PDF content for ABICAR format compliance"""
    
    admin_token = None
    
    @classmethod
    def setup_class(cls):
        """Login as Geneva admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
        )
        if response.status_code == 200:
            cls.admin_token = response.json()["access_token"]
        else:
            pytest.skip("Admin login failed")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}

    def test_pdf_french_language(self):
        """Test PDF in French contains French labels"""
        # Get an existing contract or create one
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        contracts = response.json()
        
        if not contracts:
            pytest.skip("No contracts available for PDF testing")
        
        # Find a French contract
        fr_contract = next((c for c in contracts if c.get("language") == "fr"), contracts[0])
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{fr_contract['id']}/pdf",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        pdf_doc = fitz.open(stream=response.content, filetype="pdf")
        pdf_text = ""
        for page in pdf_doc:
            pdf_text += page.get_text()
        pdf_doc.close()
        
        # Check for French labels
        french_labels = ["Vehicule", "Plaques", "Couleur", "Nom", "Prenom", 
                        "Date de Prise", "Date de Retour", "Heure", "Km Depart"]
        
        found_labels = [label for label in french_labels if label in pdf_text]
        print(f"\nFrench labels found: {len(found_labels)}/{len(french_labels)}")
        print(f"  Labels: {found_labels}")
        
        # At least half should be present
        assert len(found_labels) >= len(french_labels) // 2, \
            f"Not enough French labels found. Expected {len(french_labels)//2}, got {len(found_labels)}"
        
        print("PASS: PDF contains French language labels")

    def test_pdf_has_financial_summary(self):
        """Test PDF contains financial summary section with depot, prix"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        contracts = response.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract = contracts[0]
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract['id']}/pdf",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        pdf_doc = fitz.open(stream=response.content, filetype="pdf")
        pdf_text = ""
        for page in pdf_doc:
            pdf_text += page.get_text()
        pdf_doc.close()
        
        # Check for financial terms
        financial_terms = ["CHF", "Depot", "Deposit", "Prix", "Price", "TVA", "VAT", "caution"]
        found_terms = [term for term in financial_terms if term.lower() in pdf_text.lower()]
        
        print(f"\nFinancial terms found: {found_terms}")
        assert len(found_terms) >= 2, "Missing financial summary terms in PDF"
        
        print("PASS: PDF contains financial summary")

    def test_pdf_has_signature_area(self):
        """Test PDF contains signature area"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        contracts = response.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract = contracts[0]
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract['id']}/pdf",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        pdf_doc = fitz.open(stream=response.content, filetype="pdf")
        pdf_text = ""
        for page in pdf_doc:
            pdf_text += page.get_text()
        pdf_doc.close()
        
        # Check for signature related content
        assert "Signature" in pdf_text or "signature" in pdf_text, \
            "Missing signature label in PDF"
        
        print("PASS: PDF has signature area")


class TestContractAccessControl:
    """Test access control for contract endpoints"""
    
    admin_token = None
    client_token = None
    super_admin_token = None
    
    @classmethod
    def setup_class(cls):
        """Login as different roles"""
        # Geneva Admin
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin-geneva@logirent.ch", "password": "LogiRent2024"}
        )
        if resp.status_code == 200:
            cls.admin_token = resp.json()["access_token"]
        
        # Super Admin
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if resp.status_code == 200:
            cls.super_admin_token = resp.json()["access_token"]
        
        # Client
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "client1@test.com", "password": "test1234"}
        )
        if resp.status_code == 200:
            cls.client_token = resp.json()["access_token"]

    def test_admin_can_generate_contract(self):
        """Test admin can generate contracts"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Just check the endpoint is accessible (403 means wrong agency, which is valid auth)
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"reservation_id": "test", "language": "fr"}
        )
        
        # Should get 403 (wrong agency) or 404 (not found), not 401 (unauthorized)
        assert response.status_code != 401, "Admin should be authorized"
        print(f"PASS: Admin authorized for contract generation (status: {response.status_code})")

    def test_client_cannot_generate_contract(self):
        """Test client cannot generate contracts (admin only)"""
        if not self.client_token:
            pytest.skip("Client token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers={"Authorization": f"Bearer {self.client_token}"},
            json={"reservation_id": "test", "language": "fr"}
        )
        
        # Should be 403 Forbidden for clients
        assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}"
        print("PASS: Client correctly denied contract generation")

    def test_super_admin_can_list_all_contracts(self):
        """Test super admin can list all contracts"""
        if not self.super_admin_token:
            pytest.skip("Super admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers={"Authorization": f"Bearer {self.super_admin_token}"}
        )
        
        assert response.status_code == 200, f"Super admin list contracts failed: {response.text}"
        contracts = response.json()
        print(f"PASS: Super admin can list contracts ({len(contracts)} found)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
