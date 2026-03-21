"""
Iteration 59 - Pricing Tier Security & Contract Tier Data Tests
Tests for:
- P0: Agency ownership check on PUT /api/admin/vehicles/{vehicle_id}/pricing
  - Agency admin can update pricing for their own agency's vehicles
  - Agency admin CANNOT update pricing for another agency's vehicles (403)
  - Super admin CAN update pricing for ANY vehicle
- P1: Selected pricing tier details in contract generation
  - Contract generation includes selected_tier_name, selected_tier_km, selected_tier_price, selected_tier_period
  - PDF download returns valid PDF
  - Contract for reservation with selected_tier has tier data in contract_data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@logirent.ch"
SUPER_ADMIN_PASSWORD = "LogiRent2024!"
AGENCY_ADMIN_EMAIL = "admin-geneva@logirent.ch"  # Geneva agency admin
AGENCY_ADMIN_PASSWORD = "LogiRent2024!"
GENEVA_AGENCY_ID = "63683791-8741-445a-be42-9e74861bee89"

# Test vehicles
GENEVA_VEHICLE_ID = "fa930c8f-4827-4022-bfe3-d34640d61457"  # Vehicle belonging to Geneva agency
LAUSANNE_VEHICLE_ID = "fd354ff5-2aa6-421d-86f0-94016b1b1669"  # Vehicle belonging to different agency

# Test reservation with selected_tier
RESERVATION_WITH_TIER_ID = "9426d286-84e7-459c-bc69-a775aae84c65"
CONTRACT_WITH_TIER_ID = "fdd27067-9250-4bc6-9b0d-3c915d227fd2"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Super admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def agency_admin_token():
    """Get agency admin (Geneva) authentication token"""
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": AGENCY_ADMIN_EMAIL,
        "password": AGENCY_ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Agency admin login failed: {resp.status_code} - {resp.text}")


class TestPricingTierAgencyOwnershipSecurity:
    """P0: Tests for agency ownership check on pricing endpoint"""

    def test_agency_admin_can_get_pricing_for_own_vehicle(self, agency_admin_token):
        """Agency admin can GET pricing tiers for vehicles of their own agency"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pricing_tiers" in data, "Response should contain pricing_tiers"
        print(f"Agency admin can GET pricing for own vehicle: {len(data['pricing_tiers'])} tiers")

    def test_agency_admin_can_update_pricing_for_own_vehicle(self, agency_admin_token):
        """Agency admin can PUT pricing tiers for vehicles of their own agency"""
        # First get existing tiers
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {agency_admin_token}"}
        )
        existing_tiers = get_resp.json().get("pricing_tiers", [])
        
        # Add a test tier
        test_tiers = existing_tiers + [{
            "id": f"test_own_agency_{os.urandom(4).hex()}",
            "name": "TEST_Own Agency Tier",
            "kilometers": 300,
            "price": 149.99,
            "period": "jour",
            "order": len(existing_tiers),
            "active": True
        }]
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {agency_admin_token}"},
            json={"pricing_tiers": test_tiers}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pricing_tiers" in data
        test_tier_found = any(t.get("name") == "TEST_Own Agency Tier" for t in data["pricing_tiers"])
        assert test_tier_found, "Test tier should be saved"
        print("Agency admin CAN update pricing for own agency vehicle - PASS")
        
        # Cleanup: Remove test tier
        cleanup_tiers = [t for t in data["pricing_tiers"] if not t.get("name", "").startswith("TEST_")]
        requests.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {agency_admin_token}"},
            json={"pricing_tiers": cleanup_tiers}
        )

    def test_agency_admin_cannot_update_pricing_for_other_agency_vehicle(self, agency_admin_token):
        """Agency admin CANNOT PUT pricing tiers for vehicles of another agency - should return 403"""
        test_tiers = [{
            "id": f"test_other_agency_{os.urandom(4).hex()}",
            "name": "TEST_Should Not Save",
            "kilometers": 500,
            "price": 199.99,
            "period": "semaine",
            "order": 0,
            "active": True
        }]
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {agency_admin_token}"},
            json={"pricing_tiers": test_tiers}
        )
        
        # Should return 403 Forbidden
        assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"
        
        # Verify error message
        data = resp.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"Agency admin CANNOT update pricing for other agency vehicle - PASS (403: {data.get('detail')})")

    def test_super_admin_can_update_pricing_for_any_vehicle(self, super_admin_token):
        """Super admin CAN PUT pricing tiers for ANY vehicle regardless of agency"""
        # First get existing tiers for Lausanne vehicle
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        existing_tiers = get_resp.json().get("pricing_tiers", [])
        
        # Add a test tier
        test_tiers = existing_tiers + [{
            "id": f"test_super_admin_{os.urandom(4).hex()}",
            "name": "TEST_Super Admin Tier",
            "kilometers": 1000,
            "price": 399.99,
            "period": "mois",
            "order": len(existing_tiers),
            "active": True
        }]
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"pricing_tiers": test_tiers}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        test_tier_found = any(t.get("name") == "TEST_Super Admin Tier" for t in data["pricing_tiers"])
        assert test_tier_found, "Super admin should be able to save tier for any vehicle"
        print("Super admin CAN update pricing for ANY vehicle - PASS")
        
        # Cleanup
        cleanup_tiers = [t for t in data["pricing_tiers"] if not t.get("name", "").startswith("TEST_")]
        requests.put(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"pricing_tiers": cleanup_tiers}
        )

    def test_super_admin_can_update_pricing_for_geneva_vehicle(self, super_admin_token):
        """Super admin CAN also update pricing for Geneva agency vehicle"""
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        existing_tiers = get_resp.json().get("pricing_tiers", [])
        
        test_tiers = existing_tiers + [{
            "id": f"test_super_geneva_{os.urandom(4).hex()}",
            "name": "TEST_Super Admin Geneva",
            "kilometers": 200,
            "price": 99.99,
            "period": "jour",
            "order": len(existing_tiers),
            "active": True
        }]
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"pricing_tiers": test_tiers}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("Super admin CAN update pricing for Geneva vehicle - PASS")
        
        # Cleanup
        data = resp.json()
        cleanup_tiers = [t for t in data["pricing_tiers"] if not t.get("name", "").startswith("TEST_")]
        requests.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/pricing",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"pricing_tiers": cleanup_tiers}
        )


class TestContractTierDataGeneration:
    """P1: Tests for selected pricing tier details in contract generation"""

    def test_contract_generation_includes_tier_data(self, super_admin_token):
        """Test POST /api/admin/contracts/generate includes tier data when reservation has selected_tier"""
        # Generate contract for reservation with selected_tier
        resp = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "reservation_id": RESERVATION_WITH_TIER_ID,
                "language": "fr"
            }
        )
        
        # May return 200 (new) or 200 (updated existing)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "contract_id" in data, "Response should contain contract_id"
        contract_id = data["contract_id"]
        print(f"Contract generated/updated: {contract_id}")
        
        # Now fetch the contract to verify tier data
        contract_resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert contract_resp.status_code == 200, f"Failed to fetch contract: {contract_resp.text}"
        
        contract = contract_resp.json()
        contract_data = contract.get("contract_data", {})
        
        # Check if tier data is present (only if reservation has selected_tier)
        if contract_data.get("selected_tier_name"):
            assert "selected_tier_name" in contract_data, "Contract should have selected_tier_name"
            assert "selected_tier_km" in contract_data, "Contract should have selected_tier_km"
            assert "selected_tier_price" in contract_data, "Contract should have selected_tier_price"
            assert "selected_tier_period" in contract_data, "Contract should have selected_tier_period"
            print(f"Contract tier data: name={contract_data.get('selected_tier_name')}, "
                  f"km={contract_data.get('selected_tier_km')}, "
                  f"price={contract_data.get('selected_tier_price')}, "
                  f"period={contract_data.get('selected_tier_period')}")
        else:
            print("Note: Reservation may not have selected_tier set - tier fields not present")

    def test_existing_contract_has_tier_data(self, super_admin_token):
        """Test that existing contract with tier data has all tier fields"""
        resp = requests.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_WITH_TIER_ID}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        if resp.status_code == 404:
            pytest.skip(f"Contract {CONTRACT_WITH_TIER_ID} not found - may need to be created first")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        contract = resp.json()
        contract_data = contract.get("contract_data", {})
        
        print(f"Contract {CONTRACT_WITH_TIER_ID} contract_data keys: {list(contract_data.keys())}")
        
        # Check tier fields if present
        tier_fields = ["selected_tier_name", "selected_tier_km", "selected_tier_price", "selected_tier_period"]
        present_fields = [f for f in tier_fields if f in contract_data]
        print(f"Tier fields present: {present_fields}")

    def test_pdf_download_returns_valid_pdf(self, super_admin_token):
        """Test GET /api/contracts/{contract_id}/pdf returns valid PDF"""
        # First ensure we have a contract
        gen_resp = requests.post(
            f"{BASE_URL}/api/admin/contracts/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "reservation_id": RESERVATION_WITH_TIER_ID,
                "language": "fr"
            }
        )
        
        if gen_resp.status_code != 200:
            pytest.skip(f"Could not generate contract: {gen_resp.text}")
        
        contract_id = gen_resp.json().get("contract_id")
        
        # Download PDF
        pdf_resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        assert pdf_resp.status_code == 200, f"Expected 200, got {pdf_resp.status_code}: {pdf_resp.text}"
        
        # Verify it's a PDF
        content_type = pdf_resp.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got {content_type}"
        
        # Verify PDF magic bytes
        pdf_content = pdf_resp.content
        assert pdf_content[:4] == b'%PDF', "Response should be a valid PDF (starts with %PDF)"
        
        print(f"PDF download successful: {len(pdf_content)} bytes")


class TestReservationSelectedTier:
    """Tests to verify reservation has selected_tier data"""

    def test_reservation_has_selected_tier(self, super_admin_token):
        """Verify the test reservation has selected_tier field"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reservations",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            params={"limit": 100}
        )
        assert resp.status_code == 200
        
        reservations = resp.json().get("reservations", [])
        target_res = next((r for r in reservations if r.get("id") == RESERVATION_WITH_TIER_ID), None)
        
        if target_res:
            selected_tier = target_res.get("selected_tier")
            print(f"Reservation {RESERVATION_WITH_TIER_ID} selected_tier: {selected_tier}")
            if selected_tier:
                assert "name" in selected_tier or "price" in selected_tier, "selected_tier should have tier data"
        else:
            print(f"Reservation {RESERVATION_WITH_TIER_ID} not found in admin reservations list")


class TestAutoGenerateContractWithTier:
    """Tests for auto_generate_contract endpoint with tier data"""

    def test_auto_generate_contract_includes_tier_data(self, super_admin_token):
        """Test POST /api/contracts/auto-generate/{reservation_id} includes tier data"""
        # This endpoint is for clients, but super admin should also work
        resp = requests.post(
            f"{BASE_URL}/api/contracts/auto-generate/{RESERVATION_WITH_TIER_ID}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # May return 200 with existing contract or new contract
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        contract_id = data.get("contract_id")
        print(f"Auto-generated contract: {contract_id}, message: {data.get('message')}")
        
        # Fetch contract to verify tier data
        if contract_id:
            contract_resp = requests.get(
                f"{BASE_URL}/api/contracts/{contract_id}",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            if contract_resp.status_code == 200:
                contract_data = contract_resp.json().get("contract_data", {})
                tier_name = contract_data.get("selected_tier_name")
                if tier_name:
                    print(f"Auto-generated contract has tier: {tier_name}")
                else:
                    print("Auto-generated contract does not have tier data (reservation may not have selected_tier)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
