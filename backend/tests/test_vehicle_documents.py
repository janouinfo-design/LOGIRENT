"""
Backend tests for Vehicle Document Upload functionality (iteration 30)
Tests:
- PUT /api/admin/vehicles/{vehicle_id} with plate_number, chassis_number, color fields
- POST /api/admin/vehicles/{vehicle_id}/documents?doc_type=... (document upload)
- GET /api/vehicles/{vehicle_id}/documents/{doc_id}/download (document download)
- DELETE /api/admin/vehicles/{vehicle_id}/documents/{doc_id} (soft delete)
- GET /api/vehicles returns vehicles with new fields
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL'))
if not BASE_URL:
    raise ValueError("BASE_URL environment variable not set")

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"

# Simple 1x1 pixel JPEG for testing
import base64
TINY_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFgABAQEAAAAAAAAAAAAAAAAAAgEA/8QAGhAAAwADAQAAAAAAAAAAAAAAAAECAyERMf/aAAgBAQAAPwB4IxEkj//Z"

# Simple PDF bytes for testing
TINY_PDF = b'%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'


class TestAdminLogin:
    """Test authentication for admin users"""
    
    def test_agency_admin_login(self):
        """Verify agency admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["agency_admin", "super_admin", "admin"]
        print(f"Agency admin login successful: {data['user']['email']}")
    
    def test_super_admin_login(self):
        """Verify super admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"Super admin login successful: {data['user']['email']}")


class TestVehicleNewFields:
    """Test PUT /api/admin/vehicles/{vehicle_id} with new fields (plate_number, chassis_number, color)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_vehicle_id(self, admin_token):
        """Get a vehicle ID for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available for testing")
        return vehicles[0]["id"]
    
    def test_update_vehicle_with_plate_number(self, admin_token, test_vehicle_id):
        """PUT /api/admin/vehicles/{id} should accept and save plate_number"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current vehicle data
        get_response = requests.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}", headers=headers)
        assert get_response.status_code == 200
        vehicle = get_response.json()
        
        test_plate = f"GE {uuid.uuid4().hex[:5].upper()}"
        
        # Update with plate_number
        update_data = {
            "brand": vehicle["brand"],
            "model": vehicle["model"],
            "year": vehicle["year"],
            "type": vehicle["type"],
            "price_per_day": vehicle["price_per_day"],
            "plate_number": test_plate
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        assert updated["plate_number"] == test_plate, f"plate_number not saved correctly"
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}", headers=headers)
        assert verify_response.status_code == 200
        assert verify_response.json()["plate_number"] == test_plate
        print(f"Vehicle plate_number updated and persisted: {test_plate}")
    
    def test_update_vehicle_with_chassis_number(self, admin_token, test_vehicle_id):
        """PUT /api/admin/vehicles/{id} should accept and save chassis_number"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        get_response = requests.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}", headers=headers)
        vehicle = get_response.json()
        
        test_chassis = f"WBA{uuid.uuid4().hex[:14].upper()}"
        
        update_data = {
            "brand": vehicle["brand"],
            "model": vehicle["model"],
            "year": vehicle["year"],
            "type": vehicle["type"],
            "price_per_day": vehicle["price_per_day"],
            "chassis_number": test_chassis
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        assert updated["chassis_number"] == test_chassis
        print(f"Vehicle chassis_number updated: {test_chassis}")
    
    def test_update_vehicle_with_color(self, admin_token, test_vehicle_id):
        """PUT /api/admin/vehicles/{id} should accept and save color"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        get_response = requests.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}", headers=headers)
        vehicle = get_response.json()
        
        test_color = "Noir Metallise"
        
        update_data = {
            "brand": vehicle["brand"],
            "model": vehicle["model"],
            "year": vehicle["year"],
            "type": vehicle["type"],
            "price_per_day": vehicle["price_per_day"],
            "color": test_color
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        assert updated["color"] == test_color
        print(f"Vehicle color updated: {test_color}")
    
    def test_update_vehicle_with_all_new_fields(self, admin_token, test_vehicle_id):
        """PUT /api/admin/vehicles/{id} should accept all three new fields together"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        get_response = requests.get(f"{BASE_URL}/api/vehicles/{test_vehicle_id}", headers=headers)
        vehicle = get_response.json()
        
        test_plate = f"GE {uuid.uuid4().hex[:5].upper()}"
        test_chassis = f"VF1{uuid.uuid4().hex[:14].upper()}"
        test_color = "Blanc Nacre"
        
        update_data = {
            "brand": vehicle["brand"],
            "model": vehicle["model"],
            "year": vehicle["year"],
            "type": vehicle["type"],
            "price_per_day": vehicle["price_per_day"],
            "plate_number": test_plate,
            "chassis_number": test_chassis,
            "color": test_color
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        assert updated["plate_number"] == test_plate
        assert updated["chassis_number"] == test_chassis
        assert updated["color"] == test_color
        print(f"All new fields updated: plate={test_plate}, chassis={test_chassis}, color={test_color}")


class TestVehicleDocumentUpload:
    """Test POST /api/admin/vehicles/{vehicle_id}/documents?doc_type=..."""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_vehicle_id(self, admin_token):
        """Get a vehicle ID for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available for testing")
        return vehicles[0]["id"]
    
    def test_upload_carte_grise_document(self, admin_token, test_vehicle_id):
        """POST /api/admin/vehicles/{id}/documents?doc_type=carte_grise should upload document"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test file (JPEG image)
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("carte_grise_test.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=carte_grise",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "document" in data
        assert data["document"]["doc_type"] == "carte_grise"
        assert data["document"]["doc_type_label"] == "Carte Grise"
        assert "id" in data["document"]
        assert "storage_path" in data["document"]
        print(f"Carte grise uploaded successfully: {data['document']['id']}")
        return data["document"]["id"]
    
    def test_upload_assurance_document(self, admin_token, test_vehicle_id):
        """POST /api/admin/vehicles/{id}/documents?doc_type=assurance should upload document"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        file_content = TINY_PDF
        files = {"file": ("assurance_test.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=assurance",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["document"]["doc_type"] == "assurance"
        assert data["document"]["doc_type_label"] == "Assurance"
        print(f"Assurance document uploaded: {data['document']['id']}")
    
    def test_upload_controle_technique_document(self, admin_token, test_vehicle_id):
        """POST /api/admin/vehicles/{id}/documents?doc_type=controle_technique should upload"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        file_content = TINY_PDF
        files = {"file": ("controle_technique.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=controle_technique",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["document"]["doc_type"] == "controle_technique"
        assert data["document"]["doc_type_label"] == "Controle Technique"
        print(f"Controle technique uploaded: {data['document']['id']}")
    
    def test_upload_photo_document(self, admin_token, test_vehicle_id):
        """POST /api/admin/vehicles/{id}/documents?doc_type=photo should upload"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("photo.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=photo",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["document"]["doc_type"] == "photo"
        assert data["document"]["doc_type_label"] == "Photo"
        print(f"Photo document uploaded: {data['document']['id']}")
    
    def test_upload_autre_document(self, admin_token, test_vehicle_id):
        """POST /api/admin/vehicles/{id}/documents?doc_type=autre should upload"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        file_content = b"Test document content"
        files = {"file": ("other_doc.txt", io.BytesIO(file_content), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=autre",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["document"]["doc_type"] == "autre"
        print(f"Autre document uploaded: {data['document']['id']}")
    
    def test_upload_without_auth_returns_401(self, test_vehicle_id):
        """Upload without auth should return 401"""
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("test.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{test_vehicle_id}/documents?doc_type=carte_grise",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated upload correctly rejected with 401")
    
    def test_upload_to_nonexistent_vehicle_returns_404(self, admin_token):
        """Upload to non-existent vehicle should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_id = str(uuid.uuid4())
        
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("test.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{fake_id}/documents?doc_type=carte_grise",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Upload to non-existent vehicle correctly returns 404")


class TestVehicleDocumentDownload:
    """Test GET /api/vehicles/{vehicle_id}/documents/{doc_id}/download"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def uploaded_document(self, admin_token):
        """Upload a document and return vehicle_id and doc_id"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a vehicle
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available")
        vehicle_id = vehicles[0]["id"]
        
        # Upload a document
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("download_test.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/documents?doc_type=carte_grise",
            headers=headers,
            files=files
        )
        
        if upload_response.status_code != 200:
            pytest.skip(f"Document upload failed: {upload_response.text}")
        
        doc_id = upload_response.json()["document"]["id"]
        return {"vehicle_id": vehicle_id, "doc_id": doc_id}
    
    def test_download_document_returns_file(self, admin_token, uploaded_document):
        """GET /api/vehicles/{id}/documents/{doc_id}/download should return file content"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        vehicle_id = uploaded_document["vehicle_id"]
        doc_id = uploaded_document["doc_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/vehicles/{vehicle_id}/documents/{doc_id}/download",
            headers=headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.status_code}"
        assert len(response.content) > 0, "Downloaded file is empty"
        assert "image/jpeg" in response.headers.get("Content-Type", "")
        print(f"Document downloaded successfully: {len(response.content)} bytes")
    
    def test_download_nonexistent_document_returns_404(self, admin_token, uploaded_document):
        """GET /api/vehicles/{id}/documents/{bad_id}/download should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        vehicle_id = uploaded_document["vehicle_id"]
        fake_doc_id = str(uuid.uuid4())
        
        response = requests.get(
            f"{BASE_URL}/api/vehicles/{vehicle_id}/documents/{fake_doc_id}/download",
            headers=headers
        )
        
        assert response.status_code == 404
        print("Download of non-existent document correctly returns 404")


class TestVehicleDocumentDelete:
    """Test DELETE /api/admin/vehicles/{vehicle_id}/documents/{doc_id}"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_delete_document_soft_deletes(self, admin_token):
        """DELETE /api/admin/vehicles/{id}/documents/{doc_id} should soft-delete"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a vehicle
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available")
        vehicle_id = vehicles[0]["id"]
        
        # Upload a document to delete
        file_content = base64.b64decode(TINY_JPEG_BASE64)
        files = {"file": ("to_delete.jpg", io.BytesIO(file_content), "image/jpeg")}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/documents?doc_type=autre",
            headers=headers,
            files=files
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["document"]["id"]
        
        # Delete the document
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/documents/{doc_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"Document soft-deleted: {doc_id}")
        
        # Verify document is now inaccessible (404 on download)
        download_response = requests.get(
            f"{BASE_URL}/api/vehicles/{vehicle_id}/documents/{doc_id}/download",
            headers=headers
        )
        assert download_response.status_code == 404, "Deleted document should return 404 on download"
        print("Deleted document correctly returns 404 on download attempt")
    
    def test_delete_nonexistent_document_returns_404(self, admin_token):
        """DELETE non-existent document should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        vehicles = response.json()
        if not vehicles:
            pytest.skip("No vehicles available")
        vehicle_id = vehicles[0]["id"]
        fake_doc_id = str(uuid.uuid4())
        
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/vehicles/{vehicle_id}/documents/{fake_doc_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 404
        print("Delete of non-existent document correctly returns 404")


class TestVehiclesListWithNewFields:
    """Test GET /api/vehicles returns vehicles with plate_number, chassis_number, color, documents"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_vehicles_list_includes_new_fields(self, admin_token):
        """GET /api/vehicles should return vehicles with new fields in response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        vehicles = response.json()
        
        assert len(vehicles) > 0, "No vehicles returned"
        
        # Check first vehicle has all new fields (even if null)
        vehicle = vehicles[0]
        assert "plate_number" in vehicle, "plate_number field missing from response"
        assert "chassis_number" in vehicle, "chassis_number field missing from response"
        assert "color" in vehicle, "color field missing from response"
        assert "documents" in vehicle, "documents field missing from response"
        assert isinstance(vehicle["documents"], list), "documents should be a list"
        
        print(f"Vehicles list includes new fields:")
        print(f"  - plate_number: {vehicle.get('plate_number')}")
        print(f"  - chassis_number: {vehicle.get('chassis_number')}")
        print(f"  - color: {vehicle.get('color')}")
        print(f"  - documents count: {len(vehicle.get('documents', []))}")
    
    def test_single_vehicle_includes_new_fields(self, admin_token):
        """GET /api/vehicles/{id} should return vehicle with new fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        vehicles = list_response.json()
        if not vehicles:
            pytest.skip("No vehicles available")
        
        vehicle_id = vehicles[0]["id"]
        
        # Get single vehicle
        response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}", headers=headers)
        assert response.status_code == 200
        vehicle = response.json()
        
        assert "plate_number" in vehicle
        assert "chassis_number" in vehicle
        assert "color" in vehicle
        assert "documents" in vehicle
        
        print(f"Single vehicle endpoint returns all new fields correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
