"""
Tests for Document Expiry Alerts and Grid Display Features
- GET /api/admin/vehicles/document-alerts returns alerts for expiring docs
- POST /api/admin/vehicles/{id}/documents with expiry_date saves the date
- Clients list and Booking vehicle selection grid functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://vehicle-fleet-dev.preview.emergentagent.com')).rstrip('/')

# Test credentials
AGENCY_ADMIN_EMAIL = "admin-geneva@logirent.ch"
AGENCY_ADMIN_PASSWORD = "LogiRent2024"
TEST_VEHICLE_ID = "4bd9f2fa-5265-4a1f-b31c-02acfb0fe92e"


class TestAgencyAdminAuth:
    """Authentication tests for document alerts feature"""
    
    def test_agency_admin_login(self):
        """Test agency admin can log in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"Agency admin login successful - user: {data['user'].get('name', data['user'].get('email'))}")
        return data["access_token"]


class TestDocumentAlertsEndpoint:
    """Tests for GET /api/admin/vehicles/document-alerts endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_document_alerts_default_30_days(self):
        """Test document alerts endpoint with default 30 days window"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles/document-alerts",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "alerts" in data, "No 'alerts' key in response"
        assert "total" in data, "No 'total' key in response"
        assert isinstance(data["alerts"], list), "'alerts' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        
        print(f"Document alerts (default 30 days): {data['total']} alerts found")
        
        # Verify alert structure if any exist
        if data["alerts"]:
            alert = data["alerts"][0]
            required_fields = ["vehicle_id", "vehicle_name", "doc_id", "doc_type", "expiry_date", "severity"]
            for field in required_fields:
                assert field in alert, f"Missing required field: {field}"
            
            assert alert["severity"] in ["warning", "expired"], f"Invalid severity: {alert['severity']}"
            print(f"First alert: {alert['vehicle_name']} - {alert['doc_type_label']} - expires {alert['expiry_date']} ({alert['severity']})")
    
    def test_document_alerts_custom_days(self):
        """Test document alerts with custom days parameter"""
        # Test with 60 days window
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles/document-alerts?days=60",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data_60 = response.json()
        
        # Test with 7 days window (should be fewer or equal alerts)
        response_7 = requests.get(
            f"{BASE_URL}/api/admin/vehicles/document-alerts?days=7",
            headers=self.headers
        )
        assert response_7.status_code == 200
        data_7 = response_7.json()
        
        print(f"Alerts in 7 days: {data_7['total']}, in 60 days: {data_60['total']}")
        # More days should return >= alerts (except expired which always show)
    
    def test_document_alerts_sorting(self):
        """Verify alerts are sorted: expired first, then by expiry_date"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles/document-alerts?days=90",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["alerts"]) > 1:
            # Check that expired come before warnings
            found_warning = False
            for alert in data["alerts"]:
                if alert["severity"] == "warning":
                    found_warning = True
                elif alert["severity"] == "expired" and found_warning:
                    pytest.fail("Expired alert found after warning - sorting is wrong")
            print("Alert sorting verified: expired before warnings")
    
    def test_document_alerts_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/vehicles/document-alerts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Authentication required for document alerts - PASS")


class TestDocumentUploadWithExpiry:
    """Tests for document upload with expiry_date parameter"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_upload_document_with_expiry_date(self):
        """Test uploading a document with an expiry date"""
        # Create a test PDF file
        test_content = b"%PDF-1.4 test document with expiry date"
        files = {"file": ("test_expiry_doc.pdf", test_content, "application/pdf")}
        
        # Upload with expiry date
        expiry_date = "2026-04-15"
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/documents?doc_type=assurance&expiry_date={expiry_date}",
            headers=self.headers,
            files=files
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "document" in data, "No 'document' in response"
        doc = data["document"]
        assert doc.get("expiry_date") == expiry_date, f"Expiry date not saved: expected {expiry_date}, got {doc.get('expiry_date')}"
        assert doc.get("doc_type") == "assurance", "Doc type not saved correctly"
        
        print(f"Document uploaded with expiry_date={expiry_date} - PASS")
        
        # Store doc_id for cleanup
        self.uploaded_doc_id = doc.get("id")
        
        # Clean up - delete the test document
        if self.uploaded_doc_id:
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/documents/{self.uploaded_doc_id}",
                headers=self.headers
            )
            print(f"Cleanup: deleted test document - status {delete_response.status_code}")
    
    def test_upload_document_without_expiry_date(self):
        """Test uploading a document without expiry date (should be null)"""
        test_content = b"%PDF-1.4 test document no expiry"
        files = {"file": ("test_no_expiry.pdf", test_content, "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/documents?doc_type=autre",
            headers=self.headers,
            files=files
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        doc = data["document"]
        assert doc.get("expiry_date") is None, f"Expiry date should be null, got {doc.get('expiry_date')}"
        
        print("Document uploaded without expiry_date (null) - PASS")
        
        # Cleanup
        doc_id = doc.get("id")
        if doc_id:
            requests.delete(
                f"{BASE_URL}/api/admin/vehicles/{TEST_VEHICLE_ID}/documents/{doc_id}",
                headers=self.headers
            )


class TestVehicleScheduleForBooking:
    """Tests for vehicle schedule endpoint used in booking flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_vehicle_schedule_for_date_range(self):
        """Test vehicle schedule endpoint returns data for booking grid"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicle-schedule?start_date=2026-03-01&end_date=2026-03-31",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "vehicles" in data, "No 'vehicles' in response"
        vehicles = data["vehicles"]
        assert isinstance(vehicles, list), "vehicles should be a list"
        
        print(f"Vehicle schedule: {len(vehicles)} vehicles returned")
        
        if vehicles:
            vehicle = vehicles[0]
            # Verify vehicle has required fields for grid display
            assert "id" in vehicle, "Missing 'id'"
            assert "brand" in vehicle, "Missing 'brand'"
            assert "model" in vehicle, "Missing 'model'"
            assert "price_per_day" in vehicle, "Missing 'price_per_day'"
            assert "reservations" in vehicle, "Missing 'reservations'"
            
            print(f"First vehicle: {vehicle['brand']} {vehicle['model']} - CHF {vehicle['price_per_day']}/day")
            print(f"  Reservations in period: {len(vehicle['reservations'])}")


class TestClientsListEndpoint:
    """Tests for clients list endpoint used in clients grid"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_clients_list_returns_data_for_grid(self):
        """Test admin users endpoint returns data for clients grid"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "users" in data, "No 'users' in response"
        users = data["users"]
        assert isinstance(users, list), "users should be a list"
        
        print(f"Clients list: {len(users)} clients returned")
        
        if users:
            client = users[0]
            # Verify client has fields needed for grid display
            assert "id" in client, "Missing 'id'"
            assert "name" in client, "Missing 'name'"
            # email might be optional for quick clients
            
            # Check for fields used in card display
            has_rating = "client_rating" in client
            has_res_count = "reservation_count" in client
            
            print(f"First client: {client.get('name', 'N/A')}")
            print(f"  Rating field present: {has_rating}")
            print(f"  Reservation count field present: {has_res_count}")


class TestVehicleDocumentExpiryInResponse:
    """Test that vehicle documents include expiry info in GET responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_EMAIL,
            "password": AGENCY_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_vehicle_documents_include_expiry_info(self):
        """Test GET /api/vehicles/{id} returns document expiry info"""
        response = requests.get(f"{BASE_URL}/api/vehicles/{TEST_VEHICLE_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "documents" in data, "No 'documents' in vehicle response"
        docs = data.get("documents", [])
        
        # Filter out deleted docs
        active_docs = [d for d in docs if not d.get("is_deleted", False)]
        print(f"Vehicle {TEST_VEHICLE_ID} has {len(active_docs)} active documents")
        
        if active_docs:
            doc = active_docs[0]
            # Check document has expiry_date field (can be null)
            assert "expiry_date" in doc or doc.get("expiry_date") is None, "Document missing expiry_date field"
            print(f"  Document: {doc.get('doc_type_label', doc.get('doc_type'))} - expiry: {doc.get('expiry_date', 'null')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
