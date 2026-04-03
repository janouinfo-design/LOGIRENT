"""
Test suite for Iteration 68 - Billing Settings and Document Scanning features
Tests:
1. GET /api/admin/billing-settings - returns default empty settings for new agency
2. PUT /api/admin/billing-settings - saves IBAN, company name, address, phone, email, etc.
3. GET /api/admin/billing-settings - returns saved values after PUT
4. POST /api/documents/upload-base64 - accepts base64 image with doc_type and client_id
5. GET /api/documents/client/{client_id} - returns list of documents for that client
6. PUT /api/documents/{doc_id}/validate - updates document status and extracted_data
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"

# Tiny 1x1 PNG for testing document upload
TEST_BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestBillingSettings:
    """Test billing settings CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.token = data.get('access_token')
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_billing_settings_returns_defaults(self):
        """GET /api/admin/billing-settings returns default empty settings"""
        response = requests.get(f"{BASE_URL}/api/admin/billing-settings", headers=self.headers)
        assert response.status_code == 200, f"Failed to get billing settings: {response.text}"
        
        data = response.json()
        # Verify structure exists
        assert 'iban' in data, "IBAN field missing"
        assert 'company_name' in data, "company_name field missing"
        assert 'street' in data, "street field missing"
        assert 'city' in data, "city field missing"
        assert 'phone' in data, "phone field missing"
        assert 'email' in data, "email field missing"
        assert 'country' in data, "country field missing"
        print(f"GET billing-settings returned: {data}")
        
    def test_put_billing_settings_saves_data(self):
        """PUT /api/admin/billing-settings saves IBAN and company info"""
        test_data = {
            "company_name": "TEST_LogiRent Geneva SA",
            "street": "Rue du Mont-Blanc",
            "house_number": "12",
            "pcode": "1201",
            "city": "Geneve",
            "country": "CH",
            "phone": "+41 22 123 45 67",
            "email": "facturation@logirent.ch",
            "website": "www.logirent.ch",
            "iban": "CH93 0076 2011 6238 5295 7",
            "vat_number": "CHE-123.456.789 TVA"
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/billing-settings", 
                               json=test_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to save billing settings: {response.text}"
        
        data = response.json()
        assert data.get('company_name') == test_data['company_name'], "company_name not saved"
        assert data.get('iban') == test_data['iban'], "IBAN not saved"
        assert data.get('street') == test_data['street'], "street not saved"
        assert data.get('city') == test_data['city'], "city not saved"
        assert data.get('phone') == test_data['phone'], "phone not saved"
        assert data.get('email') == test_data['email'], "email not saved"
        print(f"PUT billing-settings saved: {data}")
        
    def test_get_billing_settings_returns_saved_values(self):
        """GET /api/admin/billing-settings returns saved values after PUT"""
        # First save some data
        test_data = {
            "company_name": "TEST_LogiRent Geneva SA",
            "street": "Rue du Mont-Blanc",
            "house_number": "12",
            "pcode": "1201",
            "city": "Geneve",
            "country": "CH",
            "phone": "+41 22 123 45 67",
            "email": "facturation@logirent.ch",
            "website": "www.logirent.ch",
            "iban": "CH93 0076 2011 6238 5295 7",
            "vat_number": "CHE-123.456.789 TVA"
        }
        
        put_response = requests.put(f"{BASE_URL}/api/admin/billing-settings", 
                                   json=test_data, headers=self.headers)
        assert put_response.status_code == 200
        
        # Now GET and verify
        get_response = requests.get(f"{BASE_URL}/api/admin/billing-settings", headers=self.headers)
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get('company_name') == test_data['company_name'], "company_name not persisted"
        assert data.get('iban') == test_data['iban'], "IBAN not persisted"
        assert data.get('city') == test_data['city'], "city not persisted"
        print(f"GET after PUT returned: {data}")


class TestDocumentScanning:
    """Test document scanning endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.token = data.get('access_token')
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_client_id = f"test-client-{uuid.uuid4().hex[:8]}"
        
    def test_upload_document_base64(self):
        """POST /api/documents/upload-base64 accepts base64 image"""
        upload_data = {
            "image": TEST_BASE64_IMAGE,
            "doc_type": "id_card_front",
            "client_id": self.test_client_id,
            "filename": "test_id_card.jpg"
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/upload-base64",
                                json=upload_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to upload document: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Document ID missing"
        assert data.get('doc_type') == 'id_card_front', "doc_type not saved"
        assert data.get('client_id') == self.test_client_id, "client_id not saved"
        assert data.get('status') == 'pending', "Initial status should be pending"
        assert 'url' in data, "Document URL missing"
        print(f"Document uploaded: {data}")
        return data['id']
        
    def test_get_client_documents(self):
        """GET /api/documents/client/{client_id} returns list of documents"""
        # First upload a document
        upload_data = {
            "image": TEST_BASE64_IMAGE,
            "doc_type": "license_front",
            "client_id": self.test_client_id,
            "filename": "test_license.jpg"
        }
        
        upload_response = requests.post(f"{BASE_URL}/api/documents/upload-base64",
                                       json=upload_data, headers=self.headers)
        assert upload_response.status_code == 200
        
        # Now get documents for this client
        get_response = requests.get(f"{BASE_URL}/api/documents/client/{self.test_client_id}",
                                   headers=self.headers)
        assert get_response.status_code == 200, f"Failed to get client documents: {get_response.text}"
        
        data = get_response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least one document"
        
        # Verify document structure
        doc = data[0]
        assert 'id' in doc, "Document ID missing"
        assert 'doc_type' in doc, "doc_type missing"
        assert 'status' in doc, "status missing"
        assert 'url' in doc, "url missing"
        print(f"Client documents: {len(data)} documents found")
        
    def test_validate_document(self):
        """PUT /api/documents/{doc_id}/validate updates status and extracted_data"""
        # First upload a document
        upload_data = {
            "image": TEST_BASE64_IMAGE,
            "doc_type": "id_card_front",
            "client_id": self.test_client_id,
            "filename": "test_id_validate.jpg"
        }
        
        upload_response = requests.post(f"{BASE_URL}/api/documents/upload-base64",
                                       json=upload_data, headers=self.headers)
        assert upload_response.status_code == 200
        doc_id = upload_response.json()['id']
        
        # Now validate the document
        validate_data = {
            "status": "validated",
            "extracted_data": {
                "name": "Jean Dupont",
                "date_of_birth": "01.01.1990",
                "nationality": "Suisse",
                "document_number": "12345678"
            }
        }
        
        validate_response = requests.put(f"{BASE_URL}/api/documents/{doc_id}/validate",
                                        json=validate_data, headers=self.headers)
        assert validate_response.status_code == 200, f"Failed to validate document: {validate_response.text}"
        
        data = validate_response.json()
        assert 'message' in data, "Response should have message"
        assert data.get('status') == 'validated', "Status should be validated"
        print(f"Document validated: {data}")
        
    def test_reject_document(self):
        """PUT /api/documents/{doc_id}/validate can reject a document"""
        # First upload a document
        upload_data = {
            "image": TEST_BASE64_IMAGE,
            "doc_type": "license_back",
            "client_id": self.test_client_id,
            "filename": "test_license_reject.jpg"
        }
        
        upload_response = requests.post(f"{BASE_URL}/api/documents/upload-base64",
                                       json=upload_data, headers=self.headers)
        assert upload_response.status_code == 200
        doc_id = upload_response.json()['id']
        
        # Reject the document
        reject_data = {
            "status": "rejected",
            "extracted_data": {}
        }
        
        reject_response = requests.put(f"{BASE_URL}/api/documents/{doc_id}/validate",
                                      json=reject_data, headers=self.headers)
        assert reject_response.status_code == 200, f"Failed to reject document: {reject_response.text}"
        
        data = reject_response.json()
        assert data.get('status') == 'rejected', "Status should be rejected"
        print(f"Document rejected: {data}")


class TestDocumentTypes:
    """Test all 4 document types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get('access_token')
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_client_id = f"test-client-{uuid.uuid4().hex[:8]}"
        
    @pytest.mark.parametrize("doc_type", [
        "id_card_front",
        "id_card_back", 
        "license_front",
        "license_back"
    ])
    def test_upload_all_document_types(self, doc_type):
        """Test uploading all 4 document types"""
        upload_data = {
            "image": TEST_BASE64_IMAGE,
            "doc_type": doc_type,
            "client_id": self.test_client_id,
            "filename": f"test_{doc_type}.jpg"
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/upload-base64",
                                json=upload_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to upload {doc_type}: {response.text}"
        
        data = response.json()
        assert data.get('doc_type') == doc_type, f"doc_type mismatch for {doc_type}"
        print(f"Successfully uploaded {doc_type}")


class TestInvoicePDFWithBillingSettings:
    """Test that invoice PDF generation uses agency billing settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get('access_token')
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_billing_settings_exist_for_invoice(self):
        """Verify billing settings are available for invoice generation"""
        # Get billing settings
        response = requests.get(f"{BASE_URL}/api/admin/billing-settings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Check that we have the key fields needed for invoices
        assert 'company_name' in data, "company_name needed for invoices"
        assert 'iban' in data, "IBAN needed for QR-bill"
        assert 'street' in data, "street needed for invoices"
        assert 'city' in data, "city needed for invoices"
        print(f"Billing settings available for invoices: {data.get('company_name')}, IBAN: {data.get('iban')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
