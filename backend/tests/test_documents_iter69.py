"""
Iteration 69 - Document Scanning Tests
Tests for client document upload, admin document management, and document validation.
Features tested:
- GET /api/documents/my - Client gets their own documents
- POST /api/documents/upload-base64 - Client uploads documents
- POST /api/auth/upload-license-b64 - Client uploads license (creates document record)
- GET /api/documents/client/{client_id} - Admin gets client documents
- PUT /api/documents/{doc_id}/validate - Admin validates documents
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"

# Small test image (1x1 pixel PNG)
TEST_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestClientDocuments:
    """Tests for client document endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as client before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as client
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        self.client_token = data["access_token"]
        self.client_id = data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.client_token}"})
    
    def test_01_get_my_documents_as_client(self):
        """Test GET /api/documents/my returns documents for current client"""
        response = self.session.get(f"{BASE_URL}/api/documents/my")
        assert response.status_code == 200, f"Failed to get my documents: {response.text}"
        
        docs = response.json()
        assert isinstance(docs, list), "Response should be a list"
        print(f"Client has {len(docs)} documents")
        
        # If there are documents, verify structure
        if docs:
            doc = docs[0]
            assert "id" in doc, "Document should have id"
            assert "doc_type" in doc, "Document should have doc_type"
            assert "status" in doc, "Document should have status"
            assert "url" in doc or "storage_path" in doc, "Document should have url or storage_path"
            print(f"First document: type={doc.get('doc_type')}, status={doc.get('status')}")
    
    def test_02_upload_document_base64_as_client(self):
        """Test POST /api/documents/upload-base64 works for clients"""
        response = self.session.post(f"{BASE_URL}/api/documents/upload-base64", json={
            "image": TEST_IMAGE_B64,
            "doc_type": "id_card_front",
            "filename": "test_id_front.jpg"
        })
        
        assert response.status_code == 200, f"Failed to upload document: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have document id"
        assert data.get("doc_type") == "id_card_front", "Document type should match"
        assert data.get("status") == "pending", "New document should be pending"
        assert "url" in data, "Response should have url"
        
        print(f"Uploaded document: id={data['id']}, url={data.get('url', 'N/A')[:50]}...")
        
        # Store for later tests
        self.uploaded_doc_id = data["id"]
    
    def test_03_verify_uploaded_document_in_my_documents(self):
        """Verify uploaded document appears in /api/documents/my"""
        # First upload a document
        upload_response = self.session.post(f"{BASE_URL}/api/documents/upload-base64", json={
            "image": TEST_IMAGE_B64,
            "doc_type": "license_back",
            "filename": "test_license_back.jpg"
        })
        assert upload_response.status_code == 200
        uploaded_id = upload_response.json()["id"]
        
        # Now fetch my documents
        response = self.session.get(f"{BASE_URL}/api/documents/my")
        assert response.status_code == 200
        
        docs = response.json()
        doc_ids = [d["id"] for d in docs]
        assert uploaded_id in doc_ids, "Uploaded document should appear in my documents"
        print(f"Verified document {uploaded_id} appears in my documents list")


class TestAuthUploadCreatesDocumentRecord:
    """Tests that auth upload endpoints also create document records"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as client"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.client_token = data["access_token"]
        self.client_id = data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.client_token}"})
    
    def test_01_upload_license_b64_creates_document_record(self):
        """Test POST /api/auth/upload-license-b64 creates a document record"""
        # Upload via auth endpoint
        response = self.session.post(f"{BASE_URL}/api/auth/upload-license-b64", json={
            "image_data": f"data:image/png;base64,{TEST_IMAGE_B64}"
        })
        
        assert response.status_code == 200, f"Failed to upload license: {response.text}"
        data = response.json()
        
        # Check response has expected fields
        assert "license_photo" in data or "message" in data, "Response should have license_photo or message"
        print(f"License upload response: {data.get('message', 'OK')}")
        
        # Verify document record was created by checking /api/documents/my
        docs_response = self.session.get(f"{BASE_URL}/api/documents/my")
        assert docs_response.status_code == 200
        
        docs = docs_response.json()
        license_docs = [d for d in docs if d.get("doc_type") == "license_front"]
        
        # Should have at least one license_front document
        assert len(license_docs) > 0, "License upload should create a document record with doc_type=license_front"
        print(f"Found {len(license_docs)} license_front document(s) in documents collection")
    
    def test_02_upload_id_b64_creates_document_record(self):
        """Test POST /api/auth/upload-id-b64 creates a document record"""
        response = self.session.post(f"{BASE_URL}/api/auth/upload-id-b64", json={
            "image_data": f"data:image/png;base64,{TEST_IMAGE_B64}"
        })
        
        assert response.status_code == 200, f"Failed to upload ID: {response.text}"
        
        # Verify document record was created
        docs_response = self.session.get(f"{BASE_URL}/api/documents/my")
        assert docs_response.status_code == 200
        
        docs = docs_response.json()
        id_docs = [d for d in docs if d.get("doc_type") == "id_card_front"]
        
        assert len(id_docs) > 0, "ID upload should create a document record with doc_type=id_card_front"
        print(f"Found {len(id_docs)} id_card_front document(s) in documents collection")


class TestAdminDocumentManagement:
    """Tests for admin document management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        # Get client ID for Jean Dupont
        self.client_id = "4a8f7b54-5133-4709-82ff-434e80f0569c"  # From earlier login
    
    def test_01_admin_get_client_documents(self):
        """Test GET /api/documents/client/{client_id} returns client documents"""
        response = self.session.get(f"{BASE_URL}/api/documents/client/{self.client_id}")
        
        assert response.status_code == 200, f"Failed to get client documents: {response.text}"
        
        docs = response.json()
        assert isinstance(docs, list), "Response should be a list"
        print(f"Admin sees {len(docs)} documents for client {self.client_id}")
        
        # Verify all documents belong to this client
        for doc in docs:
            assert doc.get("client_id") == self.client_id or doc.get("uploader_id") == self.client_id, \
                f"Document {doc.get('id')} should belong to client"
    
    def test_02_admin_validate_document(self):
        """Test PUT /api/documents/{doc_id}/validate updates document status"""
        # First get client documents
        docs_response = self.session.get(f"{BASE_URL}/api/documents/client/{self.client_id}")
        assert docs_response.status_code == 200
        
        docs = docs_response.json()
        if not docs:
            pytest.skip("No documents to validate")
        
        # Find a pending document or use the first one
        pending_docs = [d for d in docs if d.get("status") == "pending"]
        doc_to_validate = pending_docs[0] if pending_docs else docs[0]
        doc_id = doc_to_validate["id"]
        
        # Validate the document
        response = self.session.put(f"{BASE_URL}/api/documents/{doc_id}/validate", json={
            "status": "validated",
            "extracted_data": {
                "name": "Jean Dupont",
                "date_of_birth": "18.01.1992",
                "nationality": "Suisse"
            }
        })
        
        assert response.status_code == 200, f"Failed to validate document: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"Validated document {doc_id}: {data.get('message')}")
        
        # Verify the document status was updated
        docs_response = self.session.get(f"{BASE_URL}/api/documents/client/{self.client_id}")
        docs = docs_response.json()
        validated_doc = next((d for d in docs if d["id"] == doc_id), None)
        
        if validated_doc:
            assert validated_doc.get("status") == "validated", "Document status should be validated"
            print(f"Confirmed document {doc_id} status is now 'validated'")
    
    def test_03_admin_reject_document(self):
        """Test admin can reject a document"""
        # First upload a new document as client
        client_session = requests.Session()
        client_session.headers.update({"Content-Type": "application/json"})
        
        login_response = client_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        client_token = login_response.json()["access_token"]
        client_session.headers.update({"Authorization": f"Bearer {client_token}"})
        
        # Upload a document
        upload_response = client_session.post(f"{BASE_URL}/api/documents/upload-base64", json={
            "image": TEST_IMAGE_B64,
            "doc_type": "id_card_back",
            "filename": "test_id_back_reject.jpg"
        })
        
        if upload_response.status_code != 200:
            pytest.skip("Could not upload test document")
        
        doc_id = upload_response.json()["id"]
        
        # Now reject as admin
        response = self.session.put(f"{BASE_URL}/api/documents/{doc_id}/validate", json={
            "status": "rejected",
            "extracted_data": {}
        })
        
        assert response.status_code == 200, f"Failed to reject document: {response.text}"
        print(f"Successfully rejected document {doc_id}")


class TestDocumentUploadWithClientId:
    """Test that admin can upload documents for a specific client"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.admin_token = data["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        self.client_id = "4a8f7b54-5133-4709-82ff-434e80f0569c"
    
    def test_01_admin_upload_for_client(self):
        """Test admin can upload document specifying client_id"""
        response = self.session.post(f"{BASE_URL}/api/documents/upload-base64", json={
            "image": TEST_IMAGE_B64,
            "doc_type": "license_front",
            "client_id": self.client_id,
            "filename": "admin_uploaded_license.jpg"
        })
        
        assert response.status_code == 200, f"Failed to upload for client: {response.text}"
        
        data = response.json()
        assert data.get("client_id") == self.client_id, "Document should be assigned to specified client"
        print(f"Admin uploaded document for client {self.client_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
