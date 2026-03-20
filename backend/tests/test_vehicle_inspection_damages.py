"""
Tests for Vehicle Inspection Damages Feature (Iteration 46)
- PUT /api/admin/contracts/{id}/update-fields with damages field
- GET /api/contracts/{id}/pdf with damage table in PDF
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wonderful-franklin-2.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"
SUPER_ADMIN_EMAIL = "test@example.com"
SUPER_ADMIN_PASSWORD = "password123"

# Test contract ID from context
TEST_CONTRACT_ID = "0728a2a2-5372-4dac-812a-e5c668f2548e"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Super admin login failed: {response.status_code} - {response.text}")


class TestDamagesFieldInUpdateFields:
    """Test PUT /api/admin/contracts/{id}/update-fields accepts damages dict"""

    def test_get_contract_initial_state(self, admin_token):
        """GET contract to check initial damages state"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        contract = response.json()
        assert "contract_data" in contract
        print(f"Initial damages state: {contract['contract_data'].get('damages', {})}")

    def test_update_damages_field_as_dict(self, admin_token):
        """Test PUT with damages as a dict"""
        test_damages = {
            "pare_chocs_avant": "Rayure 15cm sur le coin droit",
            "porte_avant_gauche": "Petite bosse près de la poignée"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": test_damages}
        )
        assert response.status_code == 200, f"Failed to update damages: {response.text}"
        
        updated = response.json()
        assert "contract_data" in updated
        contract_damages = updated["contract_data"].get("damages", {})
        assert contract_damages.get("pare_chocs_avant") == "Rayure 15cm sur le coin droit"
        assert contract_damages.get("porte_avant_gauche") == "Petite bosse près de la poignée"
        print(f"Damages updated successfully: {contract_damages}")

    def test_verify_damages_persisted(self, admin_token):
        """GET contract to verify damages were saved"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        contract = response.json()
        damages = contract["contract_data"].get("damages", {})
        assert "pare_chocs_avant" in damages
        assert "porte_avant_gauche" in damages
        print(f"Persisted damages verified: {damages}")

    def test_update_additional_damage_zone(self, admin_token):
        """Add another damage zone"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_damages = response.json()["contract_data"].get("damages", {})
        
        # Add another damage
        current_damages["coffre"] = "Éclat de peinture"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": current_damages}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["contract_data"]["damages"].get("coffre") == "Éclat de peinture"
        print(f"Added coffre damage: {updated['contract_data']['damages']}")

    def test_remove_damage_by_setting_empty(self, admin_token):
        """Remove a damage by setting empty string (frontend behavior)"""
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_damages = response.json()["contract_data"].get("damages", {})
        
        # Remove porte_avant_gauche by not including it
        updated_damages = {k: v for k, v in current_damages.items() if k != "porte_avant_gauche"}
        
        response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": updated_damages}
        )
        assert response.status_code == 200
        updated = response.json()
        assert "porte_avant_gauche" not in updated["contract_data"]["damages"]
        print(f"Damage removed: {updated['contract_data']['damages']}")


class TestPDFGenerationWithDamages:
    """Test GET /api/contracts/{id}/pdf includes damage table"""

    def test_pdf_generation_with_damages(self, admin_token):
        """Test PDF is generated successfully when damages exist"""
        # First ensure damages exist
        test_damages = {
            "pare_chocs_avant": "Test damage for PDF",
            "toit": "Grêle - multiple petites bosses"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": test_damages}
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        assert response.headers.get("Content-Type") == "application/pdf"
        assert len(response.content) > 1000, "PDF content too small, likely empty"
        print(f"PDF generated successfully, size: {len(response.content)} bytes")

    def test_pdf_generation_without_damages(self, admin_token):
        """Test PDF is generated when no damages"""
        # Clear damages
        response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": {}}
        )
        assert response.status_code == 200
        
        # Generate PDF
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert len(response.content) > 1000
        print(f"PDF without damages generated, size: {len(response.content)} bytes")


class TestCleanup:
    """Clean up test data after tests"""

    def test_cleanup_damages(self, admin_token):
        """Reset damages to empty after tests"""
        response = requests.put(
            f"{BASE_URL}/api/admin/contracts/{TEST_CONTRACT_ID}/update-fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"damages": {}}
        )
        assert response.status_code == 200
        print("Test damages cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
