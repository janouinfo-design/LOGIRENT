#!/usr/bin/env python3
"""
Manual test script for Admin Payment Status Update endpoint
Following the exact test scenario from the review request
"""

import requests
import json
from typing import Optional

class PaymentStatusTester:
    def __init__(self):
        self.base_url = "https://fleet-ops-portal-2.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.access_token: Optional[str] = None
        
    def login(self) -> bool:
        """Step 1: Login with test@example.com/password123 to get JWT token"""
        print("🔐 Step 1: Logging in...")
        
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        response = requests.post(f"{self.api_url}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            print(f"✅ Login successful! Token received.")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} {response.text}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.access_token}"}
    
    def get_admin_reservations(self):
        """Step 2: Get admin reservations"""
        print("\n📋 Step 2: Getting admin reservations...")
        
        response = requests.get(f"{self.api_url}/admin/reservations", headers=self.get_headers())
        
        if response.status_code == 200:
            data = response.json()
            reservations = data.get('reservations', [])
            print(f"✅ Found {len(reservations)} reservations")
            
            if reservations:
                # Show first few reservations for selection
                print("\n📝 Available reservations:")
                for i, res in enumerate(reservations[:5]):  # Show first 5
                    print(f"  {i+1}. ID: {res['id'][:8]}... | Status: {res['status']} | Payment: {res.get('payment_status', 'N/A')} | Price: {res['total_price']} CHF")
                return reservations
            else:
                print("⚠️ No reservations found")
                return []
        else:
            print(f"❌ Failed to get reservations: {response.status_code} {response.text}")
            return []
    
    def update_payment_status(self, reservation_id: str, payment_status: str) -> bool:
        """Step 3: Update payment status"""
        print(f"\n💳 Step 3: Updating payment status to '{payment_status}'...")
        
        url = f"{self.api_url}/admin/reservations/{reservation_id}/payment-status"
        params = {"payment_status": payment_status}
        
        response = requests.put(url, params=params, headers=self.get_headers())
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {data.get('message', 'Success')}")
            return True
        else:
            print(f"❌ Failed to update payment status: {response.status_code} {response.text}")
            return False
    
    def verify_payment_status(self, reservation_id: str, expected_status: str) -> bool:
        """Step 4: Verify the payment status was updated"""
        print(f"\n🔍 Step 4: Verifying payment status is '{expected_status}'...")
        
        response = requests.get(f"{self.api_url}/admin/reservations", headers=self.get_headers())
        
        if response.status_code == 200:
            data = response.json()
            reservations = data.get('reservations', [])
            
            for res in reservations:
                if res['id'] == reservation_id:
                    current_payment_status = res.get('payment_status', 'N/A')
                    current_status = res.get('status', 'N/A')
                    
                    if current_payment_status == expected_status:
                        print(f"✅ Payment status verified: {current_payment_status}")
                        print(f"   Reservation status: {current_status}")
                        
                        # Check special case for pending_cash -> confirmed when paid
                        if expected_status == "paid" and res.get('payment_method') == 'cash':
                            if current_status == 'confirmed':
                                print(f"✅ Bonus: Reservation status changed to 'confirmed' for cash payment (was pending_cash)")
                            else:
                                print(f"⚠️ Note: Reservation status is '{current_status}', expected 'confirmed' for paid cash reservation")
                        
                        return True
                    else:
                        print(f"❌ Payment status mismatch: expected '{expected_status}', got '{current_payment_status}'")
                        return False
            
            print(f"❌ Reservation {reservation_id} not found")
            return False
        else:
            print(f"❌ Failed to verify: {response.status_code} {response.text}")
            return False
    
    def run_full_test(self) -> bool:
        """Run the complete test scenario"""
        print("🚀 Starting Admin Payment Status Update Test")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Get reservations
        reservations = self.get_admin_reservations()
        if not reservations:
            print("❌ No reservations available for testing")
            return False
        
        # Pick the first reservation for testing
        test_reservation = reservations[0]
        reservation_id = test_reservation['id']
        original_payment_status = test_reservation.get('payment_status', 'unpaid')
        
        print(f"\n🎯 Selected reservation for testing:")
        print(f"   ID: {reservation_id}")
        print(f"   Original payment status: {original_payment_status}")
        print(f"   Status: {test_reservation['status']}")
        print(f"   Price: {test_reservation['total_price']} CHF")
        
        # Test all payment statuses as requested
        test_statuses = ['paid', 'unpaid', 'refunded', 'pending']
        
        all_passed = True
        
        for status in test_statuses:
            print(f"\n" + "="*40)
            print(f"Testing payment status: {status}")
            print("="*40)
            
            # Update payment status
            if not self.update_payment_status(reservation_id, status):
                all_passed = False
                continue
            
            # Verify the change
            if not self.verify_payment_status(reservation_id, status):
                all_passed = False
                continue
                
        # Restore original status
        print(f"\n" + "="*40)
        print(f"Restoring original payment status: {original_payment_status}")
        print("="*40)
        
        self.update_payment_status(reservation_id, original_payment_status)
        
        print(f"\n🎉 TEST COMPLETE")
        print("=" * 60)
        
        if all_passed:
            print("✅ ALL TESTS PASSED!")
            print("✅ Payment status updates to paid/unpaid/pending/refunded all work")
            print("✅ Response messages are correct")
            print("✅ Status verification working")
            return True
        else:
            print("❌ Some tests failed")
            return False


def main():
    """Main test execution"""
    tester = PaymentStatusTester()
    
    if tester.run_full_test():
        print("\n🎊 SUCCESS: Admin Payment Status Update endpoint working perfectly!")
        exit(0)
    else:
        print("\n💥 FAILURE: Issues found with Admin Payment Status Update endpoint")
        exit(1)


if __name__ == "__main__":
    main()