"""
LogiRent Invoice API Tests - Iteration 67
Tests for Swiss invoicing system with QR-bill PDF, Stripe+TWINT payments, admin dashboard, and client portal.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://logirent-preview-3.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024!"
CLIENT_EMAIL = "jean.dupont@gmail.com"
CLIENT_PASSWORD = "LogiRent2024!"

# Known test data
EXISTING_INVOICE_NUMBER = "LR-2026-000001"
EXISTING_RESERVATION_ID = "69367924-3bb8-4d07-83fd-9d67e4b4483e"


class TestInvoiceAPI:
    """Invoice CRUD and PDF endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.client_token = None
        self.created_invoice_ids = []
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def get_client_token(self):
        """Get client authentication token"""
        if self.client_token:
            return self.client_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 200:
            self.client_token = response.json().get("access_token")
            return self.client_token
        pytest.skip(f"Client login failed: {response.status_code} - {response.text}")
    
    def admin_headers(self):
        """Get headers with admin token"""
        return {"Authorization": f"Bearer {self.get_admin_token()}", "Content-Type": "application/json"}
    
    def client_headers(self):
        """Get headers with client token"""
        return {"Authorization": f"Bearer {self.get_client_token()}", "Content-Type": "application/json"}
    
    # ==================== LIST INVOICES ====================
    
    def test_list_invoices_admin(self):
        """Test GET /api/invoices returns list of invoices for admin"""
        response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check enriched data if invoices exist
        if len(data) > 0:
            inv = data[0]
            assert "id" in inv, "Invoice should have id"
            assert "invoice_number" in inv, "Invoice should have invoice_number"
            assert "customer_name" in inv, "Invoice should have enriched customer_name"
            assert "vehicle_name" in inv, "Invoice should have enriched vehicle_name"
            print(f"PASS: Admin can list {len(data)} invoices with enriched data")
    
    def test_list_invoices_client(self):
        """Test GET /api/invoices returns only client's own invoices"""
        response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.client_headers())
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Client can list {len(data)} of their own invoices")
    
    # ==================== GET SINGLE INVOICE ====================
    
    def test_get_invoice_by_id_admin(self):
        """Test GET /api/invoices/{id} returns single invoice with enriched data"""
        # First get list to find an invoice ID
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No invoices available to test")
        
        invoice_id = list_response.json()[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=self.admin_headers())
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == invoice_id, "Invoice ID should match"
        assert "customer" in data, "Should have enriched customer object"
        assert "invoice_number" in data, "Should have invoice_number"
        assert "total_incl_tax" in data, "Should have total_incl_tax"
        assert "items" in data, "Should have items array"
        print(f"PASS: Admin can get invoice {data.get('invoice_number')} with enriched data")
    
    def test_get_invoice_not_found(self):
        """Test GET /api/invoices/{id} returns 404 for non-existent invoice"""
        response = self.session.get(f"{BASE_URL}/api/invoices/non-existent-id", headers=self.admin_headers())
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Returns 404 for non-existent invoice")
    
    # ==================== CREATE INVOICE FROM RESERVATION ====================
    
    def test_create_invoice_from_reservation(self):
        """Test POST /api/invoices/create-from-reservation creates invoice with correct items, totals, and TVA 7.7%"""
        payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "reservation",
            "notes": "Test invoice creation"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=payload,
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Should have id"
        assert "invoice_number" in data, "Should have invoice_number"
        assert data["invoice_number"].startswith("LR-"), "Invoice number should start with LR-"
        assert data["invoice_type"] == "reservation", "Invoice type should be reservation"
        assert data["status"] == "pending", "Status should be pending"
        assert "items" in data, "Should have items"
        assert len(data["items"]) > 0, "Should have at least one item"
        
        # Verify TVA calculation (7.7%)
        for item in data["items"]:
            if item.get("total_excl_tax", 0) > 0:
                expected_incl = round(item["total_excl_tax"] * 1.077, 2)
                actual_incl = item["total_incl_tax"]
                # Allow small rounding difference
                assert abs(expected_incl - actual_incl) < 0.02, f"TVA calculation incorrect: expected ~{expected_incl}, got {actual_incl}"
        
        # Store for cleanup
        self.created_invoice_ids.append(data["id"])
        print(f"PASS: Created invoice {data['invoice_number']} with {len(data['items'])} items and correct TVA 7.7%")
        return data
    
    def test_create_deposit_invoice(self):
        """Test creating a deposit invoice (30% of total)"""
        payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "deposit",
            "notes": "Test deposit invoice"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=payload,
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoice_type"] == "deposit", "Invoice type should be deposit"
        assert "Acompte" in data["items"][0]["label"], "Deposit item should have 'Acompte' in label"
        
        self.created_invoice_ids.append(data["id"])
        print(f"PASS: Created deposit invoice {data['invoice_number']}")
        return data
    
    def test_create_invoice_reservation_not_found(self):
        """Test creating invoice with non-existent reservation returns 404"""
        payload = {
            "reservation_id": "non-existent-reservation-id",
            "invoice_type": "reservation"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=payload,
            headers=self.admin_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Returns 404 for non-existent reservation")
    
    # ==================== PDF GENERATION ====================
    
    def test_get_invoice_pdf(self):
        """Test GET /api/invoices/{id}/pdf returns a valid PDF file"""
        # First get an invoice ID
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No invoices available to test PDF")
        
        invoice_id = list_response.json()[0]["id"]
        invoice_number = list_response.json()[0].get("invoice_number", "unknown")
        
        response = self.session.get(
            f"{BASE_URL}/api/invoices/{invoice_id}/pdf",
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("Content-Type") == "application/pdf", f"Expected application/pdf, got {response.headers.get('Content-Type')}"
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF file"
        assert len(content) > 1000, "PDF should have substantial content"
        
        print(f"PASS: PDF generated for invoice {invoice_number}, size: {len(content)} bytes")
    
    def test_get_invoice_pdf_client_own(self):
        """Test client can download PDF of their own invoice"""
        # Get client's invoices
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.client_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No client invoices available to test PDF")
        
        invoice_id = list_response.json()[0]["id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/invoices/{invoice_id}/pdf",
            headers=self.client_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("Content-Type") == "application/pdf"
        print("PASS: Client can download PDF of their own invoice")
    
    # ==================== MARK AS PAID ====================
    
    def test_mark_invoice_paid(self):
        """Test POST /api/invoices/{id}/mark-paid marks invoice as paid and updates balance_due to 0"""
        # First create an invoice to mark as paid
        create_payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "reservation",
            "notes": "Test invoice for mark-paid"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=create_payload,
            headers=self.admin_headers()
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice for mark-paid test")
        
        invoice_id = create_response.json()["id"]
        self.created_invoice_ids.append(invoice_id)
        
        # Mark as paid
        mark_paid_payload = {
            "payment_method": "cash",
            "notes": "Paid in cash"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid",
            json=mark_paid_payload,
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the invoice is now paid
        get_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=self.admin_headers())
        assert get_response.status_code == 200
        
        updated_invoice = get_response.json()
        assert updated_invoice["status"] == "paid", f"Status should be 'paid', got {updated_invoice['status']}"
        assert updated_invoice["balance_due"] == 0, f"Balance due should be 0, got {updated_invoice['balance_due']}"
        assert updated_invoice["payment_method"] == "cash", f"Payment method should be 'cash'"
        
        print(f"PASS: Invoice marked as paid, balance_due = 0")
    
    # ==================== ADD PENALTY ====================
    
    def test_add_penalty_invoice(self):
        """Test POST /api/invoices/{id}/add-penalty creates a penalty invoice linked to parent"""
        # First get an existing invoice
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No invoices available to test penalty")
        
        parent_invoice_id = list_response.json()[0]["id"]
        
        penalty_payload = {
            "items": [
                {"code": "PENALTY", "label": "Retard retour vehicule", "quantity": 1, "unit_price": 50.00},
                {"code": "PENALTY", "label": "Frais de nettoyage", "quantity": 1, "unit_price": 75.00}
            ],
            "notes": "Penalites pour retard et nettoyage"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{parent_invoice_id}/add-penalty",
            json=penalty_payload,
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoice_type"] == "penalty", "Invoice type should be penalty"
        assert data["parent_invoice_id"] == parent_invoice_id, "Should be linked to parent invoice"
        assert len(data["items"]) == 2, "Should have 2 penalty items"
        
        # Verify TVA on penalty items
        for item in data["items"]:
            assert item["tax_rate"] == 7.7, "Tax rate should be 7.7%"
        
        self.created_invoice_ids.append(data["id"])
        print(f"PASS: Created penalty invoice {data['invoice_number']} linked to parent")
        return data
    
    # ==================== CREDIT NOTE ====================
    
    def test_create_credit_note(self):
        """Test POST /api/invoices/{id}/credit-note creates credit note with reversed amounts"""
        # First create and pay an invoice
        create_payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "reservation",
            "notes": "Test invoice for credit note"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=create_payload,
            headers=self.admin_headers()
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice for credit note test")
        
        invoice_id = create_response.json()["id"]
        original_total = create_response.json()["total_incl_tax"]
        self.created_invoice_ids.append(invoice_id)
        
        # Mark as paid first (credit notes typically for paid invoices)
        self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid",
            json={"payment_method": "card"},
            headers=self.admin_headers()
        )
        
        # Create credit note
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/credit-note",
            headers=self.admin_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoice_type"] == "credit_note", "Invoice type should be credit_note"
        assert data["parent_invoice_id"] == invoice_id, "Should be linked to parent invoice"
        assert data["status"] == "refunded", "Status should be refunded"
        
        # Verify amounts are negative (reversed)
        for item in data["items"]:
            assert item["total_incl_tax"] < 0, "Credit note items should have negative amounts"
            assert "Avoir" in item["label"], "Credit note items should have 'Avoir' in label"
        
        assert data["total_incl_tax"] < 0, "Total should be negative"
        
        self.created_invoice_ids.append(data["id"])
        print(f"PASS: Created credit note {data['invoice_number']} with reversed amounts")
        return data
    
    # ==================== DELETE INVOICE ====================
    
    def test_delete_draft_invoice(self):
        """Test DELETE /api/invoices/{id} only works for draft/cancelled invoices"""
        # Create an invoice (it will be pending, not draft)
        create_payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "reservation"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=create_payload,
            headers=self.admin_headers()
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice for delete test")
        
        invoice_id = create_response.json()["id"]
        invoice_status = create_response.json()["status"]
        
        # Try to delete - should fail if status is pending (not draft/cancelled)
        response = self.session.delete(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=self.admin_headers()
        )
        
        if invoice_status in ("draft", "cancelled"):
            assert response.status_code == 200, f"Should be able to delete {invoice_status} invoice"
            print(f"PASS: Successfully deleted {invoice_status} invoice")
        else:
            assert response.status_code == 400, f"Should not be able to delete {invoice_status} invoice, got {response.status_code}"
            print(f"PASS: Cannot delete {invoice_status} invoice (only draft/cancelled allowed)")
            self.created_invoice_ids.append(invoice_id)
    
    def test_delete_invoice_not_found(self):
        """Test DELETE /api/invoices/{id} returns 404 for non-existent invoice"""
        response = self.session.delete(
            f"{BASE_URL}/api/invoices/non-existent-id",
            headers=self.admin_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Returns 404 for non-existent invoice")
    
    # ==================== RBAC TESTS ====================
    
    def test_client_cannot_access_other_invoices(self):
        """Test RBAC - client can only see their own invoices"""
        # Get admin's view of all invoices
        admin_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.admin_headers())
        admin_invoices = admin_response.json() if admin_response.status_code == 200 else []
        
        # Get client's view
        client_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.client_headers())
        client_invoices = client_response.json() if client_response.status_code == 200 else []
        
        # Client should see fewer or equal invoices (only their own)
        assert len(client_invoices) <= len(admin_invoices), "Client should see only their own invoices"
        
        # Verify all client invoices belong to the client
        # (We can't easily verify customer_id without knowing the client's user ID)
        print(f"PASS: Admin sees {len(admin_invoices)} invoices, client sees {len(client_invoices)} invoices")
    
    def test_client_cannot_mark_paid(self):
        """Test RBAC - client cannot mark invoices as paid"""
        # Get client's invoices
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.client_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No client invoices available")
        
        invoice_id = list_response.json()[0]["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid",
            json={"payment_method": "cash"},
            headers=self.client_headers()
        )
        
        # Should be 401 or 403 (unauthorized/forbidden)
        assert response.status_code in (401, 403), f"Client should not be able to mark paid, got {response.status_code}"
        print("PASS: Client cannot mark invoices as paid (admin only)")
    
    def test_client_cannot_create_invoice(self):
        """Test RBAC - client cannot create invoices"""
        payload = {
            "reservation_id": EXISTING_RESERVATION_ID,
            "invoice_type": "reservation"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/create-from-reservation",
            json=payload,
            headers=self.client_headers()
        )
        
        # Should be 401 or 403 (unauthorized/forbidden)
        assert response.status_code in (401, 403), f"Client should not be able to create invoice, got {response.status_code}"
        print("PASS: Client cannot create invoices (admin only)")
    
    # ==================== STRIPE PAYMENT (Expected to fail with test key) ====================
    
    def test_stripe_payment_session(self):
        """Test POST /api/invoices/{id}/pay creates Stripe checkout session (may fail with test key)"""
        # Get client's invoices
        list_response = self.session.get(f"{BASE_URL}/api/invoices", headers=self.client_headers())
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No client invoices available")
        
        # Find an unpaid invoice
        unpaid_invoices = [inv for inv in list_response.json() if inv.get("status") in ("pending", "overdue")]
        if not unpaid_invoices:
            pytest.skip("No unpaid invoices available")
        
        invoice_id = unpaid_invoices[0]["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/pay?payment_method=stripe_card&origin_url=https://logirent-preview-3.preview.emergentagent.com",
            headers=self.client_headers()
        )
        
        # Stripe may fail with test key - this is expected
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Should return checkout URL"
            assert "session_id" in data, "Should return session ID"
            print(f"PASS: Stripe checkout session created")
        else:
            # Expected to fail with test key
            print(f"INFO: Stripe payment returned {response.status_code} - expected with test key")
            assert response.status_code in (400, 500), f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
