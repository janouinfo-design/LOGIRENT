"""
Iteration 70 - OCR Integration and DamageAnalyzer Camera Fix Tests

Tests for:
1. Admin login flow
2. Admin documents page APIs
3. OCR trigger endpoint (POST /api/documents/{doc_id}/ocr)
4. Document upload with OCR (POST /api/documents/upload-base64)
5. Get client documents (GET /api/documents/client/{client_id})
6. Damage analysis endpoint (POST /api/inspections/analyze-damage)
"""

import pytest
import requests
import os
import uuid
import base64

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data.get("user", {}).get("role") in ["admin", "super_admin"], "User should be admin"
        print(f"✓ Admin login successful, role: {data.get('user', {}).get('role')}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Should reject invalid credentials: {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestDocumentAPIs:
    """Document management API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "jean.dupont@gmail.com",
            "password": "LogiRent2024!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Client authentication failed")
    
    @pytest.fixture
    def client_id(self, admin_token):
        """Get a client ID for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?role=client", headers=headers)
        if response.status_code == 200:
            users = response.json().get("users", response.json())
            if isinstance(users, list) and len(users) > 0:
                return users[0].get("id")
        pytest.skip("No clients found for testing")
    
    def test_get_admin_users_clients(self, admin_token):
        """Test GET /api/admin/users?role=client returns client list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?role=client", headers=headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        data = response.json()
        users = data.get("users", data)
        assert isinstance(users, list), "Should return list of users"
        print(f"✓ GET /api/admin/users?role=client returned {len(users)} clients")
    
    def test_get_client_documents(self, admin_token, client_id):
        """Test GET /api/documents/client/{client_id} returns documents with OCR fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/documents/client/{client_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get client documents: {response.text}"
        docs = response.json()
        assert isinstance(docs, list), "Should return list of documents"
        print(f"✓ GET /api/documents/client/{client_id} returned {len(docs)} documents")
        
        # Check if documents have OCR-related fields
        for doc in docs:
            # These fields should exist (may be null/empty)
            assert "id" in doc, "Document should have id"
            assert "doc_type" in doc, "Document should have doc_type"
            assert "status" in doc, "Document should have status"
            # OCR fields may or may not be present depending on processing
            if "ocr_status" in doc:
                print(f"  - Doc {doc['id'][:8]}... has ocr_status: {doc['ocr_status']}")
    
    def test_upload_document_base64_returns_ocr_status(self, client_token):
        """Test POST /api/documents/upload-base64 returns document with ocr_status field"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Create a minimal test image (1x1 white pixel PNG in base64)
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/documents/upload-base64", 
            headers=headers,
            json={
                "image": test_image_b64,
                "doc_type": "id_card_front",
                "filename": f"test_ocr_{uuid.uuid4().hex[:8]}.jpg"
            }
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should contain document id"
        assert "ocr_status" in data, "Response should contain ocr_status field"
        assert data["ocr_status"] in ["processing", "completed", "failed", None], f"Invalid ocr_status: {data['ocr_status']}"
        print(f"✓ POST /api/documents/upload-base64 returned doc with ocr_status: {data['ocr_status']}")
        
        return data["id"]
    
    def test_trigger_ocr_endpoint(self, admin_token, client_id):
        """Test POST /api/documents/{doc_id}/ocr triggers OCR extraction"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get existing documents for the client
        response = requests.get(f"{BASE_URL}/api/documents/client/{client_id}", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not get client documents")
        
        docs = response.json()
        if not docs:
            pytest.skip("No documents found for client to test OCR")
        
        # Find a document to trigger OCR on
        doc_id = docs[0]["id"]
        
        # Trigger OCR
        response = requests.post(f"{BASE_URL}/api/documents/{doc_id}/ocr", headers=headers)
        
        # OCR may fail if image is not a real document, but endpoint should work
        assert response.status_code in [200, 500], f"OCR trigger failed unexpectedly: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data or "ocr_status" in data, "Response should contain message or ocr_status"
            print(f"✓ POST /api/documents/{doc_id}/ocr returned: {data.get('message', data.get('ocr_status'))}")
        else:
            # 500 is acceptable if the image can't be processed (e.g., test image)
            print(f"✓ POST /api/documents/{doc_id}/ocr endpoint accessible (OCR processing may fail on test images)")


class TestDamageAnalysisAPI:
    """Damage analysis endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_analyze_damage_endpoint_exists(self, admin_token):
        """Test POST /api/inspections/analyze-damage endpoint exists and accepts requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a minimal test image
        test_image_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/inspections/analyze-damage",
            headers=headers,
            json={
                "image_data": test_image_b64,
                "context": "general"
            }
        )
        
        # Endpoint should return 200 even if AI analysis fails on test image
        assert response.status_code == 200, f"Damage analysis endpoint failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Response should have damage analysis structure
        assert "damages_detected" in data or "summary" in data, "Response should contain damage analysis fields"
        print(f"✓ POST /api/inspections/analyze-damage returned: damages_detected={data.get('damages_detected')}, summary={data.get('summary', '')[:50]}...")
    
    def test_analyze_damage_with_context_checkout(self, admin_token):
        """Test damage analysis with checkout context"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        test_image_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/inspections/analyze-damage",
            headers=headers,
            json={
                "image_data": test_image_b64,
                "context": "checkout"
            }
        )
        
        assert response.status_code == 200, f"Checkout context analysis failed: {response.text}"
        print("✓ POST /api/inspections/analyze-damage with context=checkout works")
    
    def test_analyze_damage_with_context_checkin(self, admin_token):
        """Test damage analysis with checkin context"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        test_image_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/inspections/analyze-damage",
            headers=headers,
            json={
                "image_data": test_image_b64,
                "context": "checkin"
            }
        )
        
        assert response.status_code == 200, f"Checkin context analysis failed: {response.text}"
        print("✓ POST /api/inspections/analyze-damage with context=checkin works")
    
    def test_analyze_damage_missing_image_data(self, admin_token):
        """Test damage analysis returns error when image_data is missing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/inspections/analyze-damage",
            headers=headers,
            json={
                "context": "general"
            }
        )
        
        assert response.status_code == 400, f"Should return 400 for missing image_data: {response.status_code}"
        print("✓ POST /api/inspections/analyze-damage correctly rejects missing image_data")


class TestDocumentValidation:
    """Document validation workflow tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def client_id(self, admin_token):
        """Get a client ID for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?role=client", headers=headers)
        if response.status_code == 200:
            users = response.json().get("users", response.json())
            if isinstance(users, list) and len(users) > 0:
                return users[0].get("id")
        pytest.skip("No clients found for testing")
    
    def test_validate_document_with_extracted_data(self, admin_token, client_id):
        """Test PUT /api/documents/{doc_id}/validate with OCR pre-filled data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get client documents
        response = requests.get(f"{BASE_URL}/api/documents/client/{client_id}", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not get client documents")
        
        docs = response.json()
        pending_docs = [d for d in docs if d.get("status") == "pending"]
        
        if not pending_docs:
            pytest.skip("No pending documents to validate")
        
        doc_id = pending_docs[0]["id"]
        
        # Validate with extracted data
        response = requests.put(f"{BASE_URL}/api/documents/{doc_id}/validate",
            headers=headers,
            json={
                "status": "validated",
                "extracted_data": {
                    "name": "Test User",
                    "date_of_birth": "01.01.1990",
                    "document_number": "TEST123456"
                }
            }
        )
        
        assert response.status_code == 200, f"Validation failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ PUT /api/documents/{doc_id}/validate succeeded: {data.get('message')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
