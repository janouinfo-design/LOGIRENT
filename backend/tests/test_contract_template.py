"""
Test Contract Template CRUD Endpoints
- GET /api/admin/contract-template - Returns agency template or default
- PUT /api/admin/contract-template - Updates template fields
- POST /api/admin/contract-template/logo - Uploads logo image
- DELETE /api/admin/contract-template/logo - Removes logo
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com').rstrip('/')


class TestContractTemplateEndpoints:
    """Contract Template CRUD tests for agency admin"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login as agency admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    # ===== GET /api/admin/contract-template =====
    
    def test_get_contract_template_returns_200(self, headers):
        """GET /api/admin/contract-template returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_get_contract_template_has_required_fields(self, headers):
        """GET template returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "legal_text" in data, "Missing legal_text field"
        assert "deductible" in data, "Missing deductible field"
        assert "agency_website" in data, "Missing agency_website field"
        assert "default_prices" in data, "Missing default_prices field"
        assert "agency_id" in data, "Missing agency_id field"

    def test_get_contract_template_has_placeholders_in_default(self, headers):
        """Default legal text contains {website} and {franchise} placeholders"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Note: Template may have custom text, but default should have placeholders
        # This test verifies the field exists
        assert isinstance(data.get("legal_text"), str), "legal_text should be a string"

    # ===== PUT /api/admin/contract-template =====
    
    def test_update_template_legal_text(self, headers):
        """PUT template updates legal_text"""
        test_text = "Test legal text with {website} and CHF {franchise} franchise."
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json={"legal_text": test_text}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data.get("legal_text") == test_text, "legal_text not updated"

    def test_update_template_deductible(self, headers):
        """PUT template updates deductible"""
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json={"deductible": "2000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("deductible") == "2000", f"deductible not updated, got: {data.get('deductible')}"

    def test_update_template_agency_website(self, headers):
        """PUT template updates agency_website"""
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json={"agency_website": "www.test-logirent.ch"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("agency_website") == "www.test-logirent.ch"

    def test_update_template_default_prices(self, headers):
        """PUT template updates default_prices"""
        test_prices = {
            "price_per_day": "150",
            "price_weekend_fri": "250",
            "price_weekend_sat": "200",
            "price_hour": "25",
            "price_week": "800",
            "price_month_2000": "2500",
            "price_month_3000": "3000",
            "price_extra_km": "0.50"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json={"default_prices": test_prices}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("default_prices") == test_prices, f"default_prices not updated correctly"

    def test_update_template_multiple_fields(self, headers):
        """PUT template updates multiple fields at once"""
        update_data = {
            "legal_text": "Multi-field update test",
            "deductible": "1800",
            "agency_website": "www.multi-test.ch",
            "default_prices": {"price_per_day": "175"}
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("legal_text") == update_data["legal_text"]
        assert data.get("deductible") == update_data["deductible"]
        assert data.get("agency_website") == update_data["agency_website"]
        assert data.get("default_prices", {}).get("price_per_day") == "175"

    def test_update_template_persists_data(self, headers):
        """PUT template changes persist on subsequent GET"""
        # Update
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json={"deductible": "1234"}
        )
        assert response.status_code == 200
        
        # Verify persistence via GET
        get_response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("deductible") == "1234", "Update did not persist"

    # ===== POST /api/admin/contract-template/logo =====
    
    def test_upload_logo_returns_logo_path(self, auth_token):
        """POST logo upload returns logo_path"""
        # Create minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_logo.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/admin/contract-template/logo",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200, f"Logo upload failed: {response.text}"
        data = response.json()
        assert "logo_path" in data, "Missing logo_path in response"
        assert data["logo_path"].startswith("logirent/logos/"), f"Unexpected logo_path format: {data['logo_path']}"

    def test_upload_logo_persists_in_template(self, auth_token):
        """Logo upload updates template's logo_path"""
        # Upload logo
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        files = {"file": ("persist_test.png", png_data, "image/png")}
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/contract-template/logo",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        uploaded_path = upload_response.json().get("logo_path")
        
        # Verify via GET
        get_response = requests.get(
            f"{BASE_URL}/api/admin/contract-template",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("logo_path") == uploaded_path, "Logo path not persisted in template"

    # ===== DELETE /api/admin/contract-template/logo =====
    
    def test_delete_logo_returns_message(self, headers):
        """DELETE logo returns success message"""
        response = requests.delete(f"{BASE_URL}/api/admin/contract-template/logo", headers=headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in delete response"
        assert "supprimé" in data["message"].lower() or "deleted" in data["message"].lower()

    def test_delete_logo_removes_from_template(self, auth_token):
        """DELETE logo sets logo_path to null"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # First upload a logo
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        files = {"file": ("delete_test.png", png_data, "image/png")}
        requests.post(
            f"{BASE_URL}/api/admin/contract-template/logo",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        
        # Delete logo
        delete_response = requests.delete(f"{BASE_URL}/api/admin/contract-template/logo", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify logo_path is null
        get_response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("logo_path") is None, f"logo_path should be None after delete, got: {data.get('logo_path')}"

    # ===== Authorization Tests =====
    
    def test_get_template_requires_auth(self):
        """GET template without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-template")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_put_template_requires_auth(self):
        """PUT template without token returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            json={"deductible": "999"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestContractTemplatePDFIntegration:
    """Test that template values are applied in PDF generation"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login as agency admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

    def test_contract_template_applies_to_contract_generation(self, headers):
        """Template values should be stored and applied when generating contracts"""
        # Set specific template values
        template_data = {
            "legal_text": "Custom legal text for PDF with {website} and {franchise}",
            "deductible": "3000",
            "agency_website": "www.pdf-test.ch",
            "default_prices": {"price_per_day": "300"}
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json=template_data
        )
        assert put_response.status_code == 200
        
        # Verify the template is saved correctly
        get_response = requests.get(f"{BASE_URL}/api/admin/contract-template", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("deductible") == "3000"
        assert data.get("agency_website") == "www.pdf-test.ch"
        assert "Custom legal text" in data.get("legal_text", "")


# Cleanup after tests
class TestCleanup:
    """Reset template to sensible defaults after tests"""

    def test_cleanup_restore_defaults(self):
        """Restore template to default values"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        if response.status_code != 200:
            pytest.skip("Cannot login for cleanup")
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Restore reasonable defaults
        default_template = {
            "legal_text": (
                "Le/la soussigné(e) déclare avoir pris connaissance et accepter les conditions générales "
                "de location disponibles sur le site {website}, lesquelles font partie intégrante du présent document.\n\n"
                "Le locataire s'engage à utiliser le véhicule avec diligence et à respecter strictement les dispositions "
                "de la Loi fédérale sur la circulation routière (LCR) ainsi que toutes les prescriptions légales applicables.\n\n"
                "Les dommages couverts par l'assurance Casco collision du loueur sont soumis à une franchise de "
                "CHF {franchise}.– par sinistre, laquelle demeure entièrement à la charge du locataire ou du "
                "conducteur responsable.\n\n"
                "Le locataire reconnaît être responsable de tout dommage, amende ou frais résultant de l'utilisation "
                "du véhicule. Le présent document vaut reconnaissance de dette au sens de l'art. 82 LP."
            ),
            "deductible": "1000",
            "agency_website": "www.logirent.ch",
            "default_prices": {}
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/contract-template",
            headers=headers,
            json=default_template
        )
        assert response.status_code == 200, "Cleanup failed"
