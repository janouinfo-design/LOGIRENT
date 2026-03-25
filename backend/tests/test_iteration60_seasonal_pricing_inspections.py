"""
Iteration 60 - Seasonal Pricing & Vehicle Inspections Testing
Tests:
1. Seasonal Pricing CRUD (admin endpoints)
2. Seasonal Pricing Public endpoint
3. Seasonal Pricing Security (agency ownership check)
4. Vehicle Inspections CRUD
5. Inspection defaults endpoint
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://logirent-preview-3.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@logirent.ch"
SUPER_ADMIN_PASSWORD = "LogiRent2024!"
AGENCY_ADMIN_GENEVA_EMAIL = "admin-geneva@logirent.ch"
AGENCY_ADMIN_GENEVA_PASSWORD = "LogiRent2024!"
GENEVA_AGENCY_ID = "63683791-8741-445a-be42-9e74861bee89"

# Test vehicles
GENEVA_VEHICLE_ID = "fa930c8f-4827-4022-bfe3-d34640d61457"  # Geneva agency vehicle
LAUSANNE_VEHICLE_ID = "fd354ff5-2aa6-421d-86f0-94016b1b1669"  # Different agency vehicle

# Test reservation (already has inspections - use for GET/update tests)
EXISTING_RESERVATION_ID = "60722ab4-60bb-432f-a869-01bb35e583ba"


class TestSeasonalPricingCRUD:
    """Test seasonal pricing CRUD operations for agency admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    def test_01_get_seasonal_pricing_empty_or_existing(self):
        """GET /api/admin/vehicles/{vehicle_id}/seasonal-pricing - Get seasonal pricing"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing")
        assert resp.status_code == 200, f"Failed to get seasonal pricing: {resp.text}"
        data = resp.json()
        assert "seasonal_pricing" in data, "Response should contain seasonal_pricing field"
        print(f"Current seasonal pricing count: {len(data['seasonal_pricing'])}")
    
    def test_02_put_seasonal_pricing_create(self):
        """PUT /api/admin/vehicles/{vehicle_id}/seasonal-pricing - Create seasonal pricing"""
        test_pricing = {
            "seasonal_pricing": [
                {
                    "name": "TEST_Promo Hiver 2026",
                    "start_date": "2026-01-15",
                    "end_date": "2026-02-28",
                    "modifier_type": "percentage",
                    "modifier_value": -15,  # 15% discount
                    "active": True
                },
                {
                    "name": "TEST_Ete Premium",
                    "start_date": "2026-07-01",
                    "end_date": "2026-08-31",
                    "modifier_type": "fixed_price",
                    "modifier_value": 180,  # Fixed CHF 180/day
                    "active": True
                }
            ]
        }
        
        resp = self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing",
            json=test_pricing
        )
        assert resp.status_code == 200, f"Failed to create seasonal pricing: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "seasonal_pricing" in data, "Response should contain seasonal_pricing"
        assert len(data["seasonal_pricing"]) == 2, "Should have 2 seasonal pricing entries"
        
        # Verify first entry
        promo = data["seasonal_pricing"][0]
        assert promo["name"] == "TEST_Promo Hiver 2026"
        assert promo["modifier_type"] == "percentage"
        assert promo["modifier_value"] == -15
        assert "id" in promo, "Each entry should have an ID"
        
        print(f"Created seasonal pricing: {data['seasonal_pricing']}")
    
    def test_03_get_seasonal_pricing_after_create(self):
        """Verify seasonal pricing was persisted"""
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing")
        assert resp.status_code == 200
        data = resp.json()
        
        # Should have at least the 2 entries we created
        assert len(data["seasonal_pricing"]) >= 2, "Should have at least 2 seasonal pricing entries"
        
        # Find our test entries
        test_entries = [p for p in data["seasonal_pricing"] if p["name"].startswith("TEST_")]
        assert len(test_entries) >= 2, "Should find our TEST_ prefixed entries"
    
    def test_04_put_seasonal_pricing_update(self):
        """Update existing seasonal pricing"""
        # First get current pricing
        get_resp = self.session.get(f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing")
        current = get_resp.json()["seasonal_pricing"]
        
        # Modify one entry
        if current:
            current[0]["modifier_value"] = -20  # Change to 20% discount
            current[0]["name"] = "TEST_Promo Hiver 2026 Updated"
        
        resp = self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing",
            json={"seasonal_pricing": current}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify update
        updated_entry = next((p for p in data["seasonal_pricing"] if "Updated" in p["name"]), None)
        assert updated_entry is not None, "Should find updated entry"
        assert updated_entry["modifier_value"] == -20


class TestSeasonalPricingSecurity:
    """Test agency ownership security for seasonal pricing"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_05_cannot_modify_other_agency_vehicle(self):
        """Agency admin cannot modify seasonal pricing for other agency's vehicle"""
        test_pricing = {
            "seasonal_pricing": [
                {
                    "name": "TEST_Unauthorized",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-31",
                    "modifier_type": "percentage",
                    "modifier_value": -10,
                    "active": True
                }
            ]
        }
        
        resp = self.session.put(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/seasonal-pricing",
            json=test_pricing
        )
        
        # Should return 403 Forbidden
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        assert "agence" in resp.text.lower() or "autorise" in resp.text.lower(), \
            "Error message should mention agency restriction"
        print(f"Security check passed - 403 returned: {resp.json()}")
    
    def test_06_super_admin_can_modify_any_vehicle(self):
        """Super admin can modify seasonal pricing for any vehicle"""
        # Login as super admin
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get current pricing for Lausanne vehicle
        get_resp = session.get(f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/seasonal-pricing")
        assert get_resp.status_code == 200
        
        # Super admin should be able to update
        test_pricing = {
            "seasonal_pricing": [
                {
                    "name": "TEST_SuperAdmin Promo",
                    "start_date": "2026-03-01",
                    "end_date": "2026-03-31",
                    "modifier_type": "percentage",
                    "modifier_value": -5,
                    "active": True
                }
            ]
        }
        
        resp = session.put(
            f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/seasonal-pricing",
            json=test_pricing
        )
        assert resp.status_code == 200, f"Super admin should be able to modify: {resp.text}"
        print("Super admin can modify any vehicle's seasonal pricing")


class TestSeasonalPricingPublicEndpoint:
    """Test public seasonal pricing endpoint"""
    
    def test_07_public_get_seasonal_pricing(self):
        """GET /api/vehicles/{vehicle_id}/seasonal-pricing - Public endpoint"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing")
        
        assert resp.status_code == 200, f"Public endpoint failed: {resp.text}"
        data = resp.json()
        assert "seasonal_pricing" in data
        
        # Should only return active pricing
        for pricing in data["seasonal_pricing"]:
            assert pricing.get("active", True) == True, "Public endpoint should only return active pricing"
        
        print(f"Public endpoint returned {len(data['seasonal_pricing'])} active seasonal pricing entries")
    
    def test_08_vehicle_detail_includes_seasonal_pricing(self):
        """GET /api/vehicles/{vehicle_id} - Should include seasonal_pricing field"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/vehicles/{GENEVA_VEHICLE_ID}")
        
        assert resp.status_code == 200, f"Vehicle detail failed: {resp.text}"
        data = resp.json()
        
        # Vehicle model should include seasonal_pricing field
        assert "seasonal_pricing" in data, "Vehicle response should include seasonal_pricing field"
        print(f"Vehicle detail includes seasonal_pricing: {len(data.get('seasonal_pricing', []))} entries")


class TestInspectionDefaults:
    """Test inspection defaults endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_09_get_inspection_defaults(self):
        """GET /api/inspections/defaults - Returns default 10-item checklist"""
        resp = self.session.get(f"{BASE_URL}/api/inspections/defaults")
        
        assert resp.status_code == 200, f"Failed to get defaults: {resp.text}"
        data = resp.json()
        
        assert "items" in data, "Response should contain items"
        assert len(data["items"]) == 10, f"Should have 10 default items, got {len(data['items'])}"
        
        # Verify item structure
        for item in data["items"]:
            assert "name" in item, "Each item should have a name"
            assert "checked" in item, "Each item should have checked field"
            assert "condition" in item, "Each item should have condition field"
            assert "notes" in item, "Each item should have notes field"
        
        # Verify some expected items
        item_names = [i["name"] for i in data["items"]]
        assert "Carrosserie exterieure" in item_names
        assert "Pneus et jantes" in item_names
        assert "Climatisation" in item_names
        
        print(f"Default checklist items: {item_names}")


class TestInspectionCRUD:
    """Test inspection CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_10_get_inspections_for_existing_reservation(self):
        """GET /api/inspections/reservation/{reservation_id} - Get existing inspections"""
        resp = self.session.get(f"{BASE_URL}/api/inspections/reservation/{EXISTING_RESERVATION_ID}")
        
        assert resp.status_code == 200, f"Failed to get inspections: {resp.text}"
        data = resp.json()
        
        assert "inspections" in data, "Response should contain inspections"
        # This reservation already has checkout and checkin inspections
        print(f"Found {len(data['inspections'])} inspections for reservation {EXISTING_RESERVATION_ID}")
        
        for insp in data["inspections"]:
            assert "id" in insp
            assert "type" in insp
            assert insp["type"] in ["checkout", "checkin"]
            print(f"  - {insp['type']} inspection: {insp['id']}")
    
    def test_11_create_inspection_duplicate_fails(self):
        """POST /api/inspections - Cannot create duplicate inspection type"""
        # Try to create another checkout inspection for existing reservation
        inspection_data = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "vehicle_id": GENEVA_VEHICLE_ID,
            "type": "checkout",
            "items": [],
            "photos": [],
            "km_reading": 50000,
            "fuel_level": "full",
            "notes": "TEST duplicate"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/inspections", json=inspection_data)
        
        # Should fail because checkout already exists
        assert resp.status_code == 400, f"Expected 400 for duplicate, got {resp.status_code}: {resp.text}"
        assert "deja existante" in resp.text.lower() or "already" in resp.text.lower()
        print("Duplicate inspection correctly rejected")
    
    def test_12_update_existing_inspection(self):
        """PUT /api/inspections/{inspection_id} - Update existing inspection"""
        # First get inspections for the reservation
        get_resp = self.session.get(f"{BASE_URL}/api/inspections/reservation/{EXISTING_RESERVATION_ID}")
        inspections = get_resp.json()["inspections"]
        
        if not inspections:
            pytest.skip("No inspections found to update")
        
        inspection_id = inspections[0]["id"]
        
        # Update the inspection
        update_data = {
            "notes": f"TEST_Updated at {datetime.utcnow().isoformat()}",
            "km_reading": 55000,
            "fuel_level": "3/4"
        }
        
        resp = self.session.put(f"{BASE_URL}/api/inspections/{inspection_id}", json=update_data)
        
        assert resp.status_code == 200, f"Failed to update inspection: {resp.text}"
        data = resp.json()
        
        assert data["notes"].startswith("TEST_Updated")
        assert data["km_reading"] == 55000
        assert data["fuel_level"] == "3/4"
        print(f"Successfully updated inspection {inspection_id}")
    
    def test_13_get_single_inspection(self):
        """GET /api/inspections/{inspection_id} - Get single inspection"""
        # First get inspections for the reservation
        get_resp = self.session.get(f"{BASE_URL}/api/inspections/reservation/{EXISTING_RESERVATION_ID}")
        inspections = get_resp.json()["inspections"]
        
        if not inspections:
            pytest.skip("No inspections found")
        
        inspection_id = inspections[0]["id"]
        
        resp = self.session.get(f"{BASE_URL}/api/inspections/{inspection_id}")
        
        assert resp.status_code == 200, f"Failed to get inspection: {resp.text}"
        data = resp.json()
        
        assert data["id"] == inspection_id
        assert "type" in data
        assert "items" in data
        print(f"Retrieved inspection: {data['type']} with {len(data.get('items', []))} items")


class TestInspectionCreateNewReservation:
    """Test creating inspections for a new reservation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin and find/create a test reservation"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Find a reservation without inspections or create one
        self.test_reservation_id = None
        
        # Get reservations for Geneva agency
        res_resp = self.session.get(f"{BASE_URL}/api/admin/reservations?limit=50")
        if res_resp.status_code == 200:
            reservations = res_resp.json().get("reservations", [])
            for res in reservations:
                # Check if this reservation has no inspections
                insp_resp = self.session.get(f"{BASE_URL}/api/inspections/reservation/{res['id']}")
                if insp_resp.status_code == 200:
                    inspections = insp_resp.json().get("inspections", [])
                    if len(inspections) == 0:
                        self.test_reservation_id = res["id"]
                        self.test_vehicle_id = res.get("vehicle_id", GENEVA_VEHICLE_ID)
                        print(f"Found reservation without inspections: {self.test_reservation_id}")
                        break
    
    def test_14_create_checkout_inspection(self):
        """POST /api/inspections - Create checkout inspection"""
        if not self.test_reservation_id:
            pytest.skip("No reservation without inspections found")
        
        # Get default items
        defaults_resp = self.session.get(f"{BASE_URL}/api/inspections/defaults")
        default_items = defaults_resp.json()["items"]
        
        # Mark some items as checked
        for i, item in enumerate(default_items[:5]):
            item["checked"] = True
        
        inspection_data = {
            "reservation_id": self.test_reservation_id,
            "vehicle_id": self.test_vehicle_id,
            "type": "checkout",
            "items": default_items,
            "photos": [],
            "km_reading": 45000,
            "fuel_level": "full",
            "notes": "TEST_Checkout inspection created by pytest"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/inspections", json=inspection_data)
        
        assert resp.status_code == 200, f"Failed to create checkout inspection: {resp.text}"
        data = resp.json()
        
        assert "id" in data
        assert data["type"] == "checkout"
        assert data["km_reading"] == 45000
        assert data["fuel_level"] == "full"
        assert len(data["items"]) == 10
        
        self.checkout_inspection_id = data["id"]
        print(f"Created checkout inspection: {data['id']}")
    
    def test_15_create_checkin_inspection(self):
        """POST /api/inspections - Create checkin inspection"""
        if not self.test_reservation_id:
            pytest.skip("No reservation without inspections found")
        
        # Get default items
        defaults_resp = self.session.get(f"{BASE_URL}/api/inspections/defaults")
        default_items = defaults_resp.json()["items"]
        
        # Mark all items as checked, add some damage notes
        for item in default_items:
            item["checked"] = True
        default_items[0]["condition"] = "damaged"
        default_items[0]["notes"] = "Minor scratch on front bumper"
        
        inspection_data = {
            "reservation_id": self.test_reservation_id,
            "vehicle_id": self.test_vehicle_id,
            "type": "checkin",
            "items": default_items,
            "photos": [],
            "km_reading": 45500,  # 500km driven
            "fuel_level": "3/4",
            "notes": "TEST_Checkin inspection - minor damage noted"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/inspections", json=inspection_data)
        
        assert resp.status_code == 200, f"Failed to create checkin inspection: {resp.text}"
        data = resp.json()
        
        assert "id" in data
        assert data["type"] == "checkin"
        assert data["km_reading"] == 45500
        
        # Verify damage was recorded
        damaged_item = next((i for i in data["items"] if i.get("condition") == "damaged"), None)
        assert damaged_item is not None, "Should have a damaged item"
        
        print(f"Created checkin inspection: {data['id']}")


class TestInspectionSecurity:
    """Test inspection security - agency ownership"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Geneva agency admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENCY_ADMIN_GENEVA_EMAIL,
            "password": AGENCY_ADMIN_GENEVA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_16_cannot_create_inspection_for_other_agency_reservation(self):
        """Cannot create inspection for another agency's reservation"""
        # First, find a reservation from another agency (Lausanne)
        # Login as super admin to find one
        super_session = requests.Session()
        login_resp = super_session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        token = login_resp.json().get("access_token")
        super_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get all reservations
        res_resp = super_session.get(f"{BASE_URL}/api/admin/reservations?limit=100")
        reservations = res_resp.json().get("reservations", [])
        
        # Find a reservation NOT from Geneva agency
        other_agency_reservation = None
        for res in reservations:
            if res.get("agency_id") != GENEVA_AGENCY_ID:
                other_agency_reservation = res
                break
        
        if not other_agency_reservation:
            pytest.skip("No reservation from other agency found")
        
        # Try to create inspection as Geneva admin for other agency's reservation
        inspection_data = {
            "reservation_id": other_agency_reservation["id"],
            "vehicle_id": other_agency_reservation.get("vehicle_id", LAUSANNE_VEHICLE_ID),
            "type": "checkout",
            "items": [],
            "km_reading": 10000,
            "fuel_level": "full"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/inspections", json=inspection_data)
        
        # Should return 403
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("Security check passed - cannot create inspection for other agency's reservation")


# Cleanup test data
class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_99_cleanup_seasonal_pricing(self):
        """Remove TEST_ prefixed seasonal pricing entries"""
        # Clean Geneva vehicle
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing")
        if resp.status_code == 200:
            pricing = resp.json().get("seasonal_pricing", [])
            cleaned = [p for p in pricing if not p.get("name", "").startswith("TEST_")]
            self.session.put(
                f"{BASE_URL}/api/admin/vehicles/{GENEVA_VEHICLE_ID}/seasonal-pricing",
                json={"seasonal_pricing": cleaned}
            )
        
        # Clean Lausanne vehicle
        resp = self.session.get(f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/seasonal-pricing")
        if resp.status_code == 200:
            pricing = resp.json().get("seasonal_pricing", [])
            cleaned = [p for p in pricing if not p.get("name", "").startswith("TEST_")]
            self.session.put(
                f"{BASE_URL}/api/admin/vehicles/{LAUSANNE_VEHICLE_ID}/seasonal-pricing",
                json={"seasonal_pricing": cleaned}
            )
        
        print("Cleaned up TEST_ seasonal pricing entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
