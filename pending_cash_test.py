#!/usr/bin/env python3
"""
Test the specific scenario: marking a pending_cash reservation as paid
should change reservation status to confirmed
"""

import requests
import json

def test_pending_cash_to_paid():
    """Test pending_cash reservation marked as paid changes status to confirmed"""
    
    base_url = "https://logirent-preview-3.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Login
    print("🔐 Logging in...")
    login_data = {"email": "test@example.com", "password": "password123"}
    response = requests.post(f"{api_url}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
        
    access_token = response.json()['access_token']
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Get reservations
    print("📋 Getting reservations...")
    response = requests.get(f"{api_url}/admin/reservations", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get reservations: {response.status_code}")
        return False
    
    reservations = response.json().get('reservations', [])
    
    # Find a pending_cash reservation
    pending_cash_reservation = None
    for res in reservations:
        if res.get('status') == 'pending_cash' and res.get('payment_status') == 'unpaid':
            pending_cash_reservation = res
            break
    
    if not pending_cash_reservation:
        print("⚠️ No pending_cash reservations found for testing")
        return False
    
    reservation_id = pending_cash_reservation['id']
    print(f"🎯 Testing with pending_cash reservation: {reservation_id}")
    print(f"   Current status: {pending_cash_reservation['status']}")
    print(f"   Current payment_status: {pending_cash_reservation.get('payment_status')}")
    
    # Update payment status to paid
    print(f"\n💳 Marking payment as 'paid'...")
    
    url = f"{api_url}/admin/reservations/{reservation_id}/payment-status"
    params = {"payment_status": "paid"}
    
    response = requests.put(url, params=params, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to update payment status: {response.status_code} {response.text}")
        return False
    
    print(f"✅ {response.json().get('message')}")
    
    # Verify both payment status and reservation status changed
    print(f"\n🔍 Verifying status changes...")
    
    response = requests.get(f"{api_url}/admin/reservations", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to verify: {response.status_code}")
        return False
    
    updated_reservations = response.json().get('reservations', [])
    
    for res in updated_reservations:
        if res['id'] == reservation_id:
            new_payment_status = res.get('payment_status')
            new_status = res.get('status')
            
            print(f"   New payment_status: {new_payment_status}")
            print(f"   New status: {new_status}")
            
            if new_payment_status == 'paid':
                print("✅ Payment status correctly updated to 'paid'")
                
                if new_status == 'confirmed':
                    print("✅ Reservation status correctly changed to 'confirmed'")
                    print("🎉 SUCCESS: pending_cash → paid logic working correctly!")
                    return True
                else:
                    print(f"❌ Expected reservation status 'confirmed', got '{new_status}'")
                    return False
            else:
                print(f"❌ Expected payment status 'paid', got '{new_payment_status}'")
                return False
    
    print(f"❌ Reservation not found after update")
    return False

if __name__ == "__main__":
    print("🧪 Testing pending_cash → paid status change logic")
    print("=" * 55)
    
    if test_pending_cash_to_paid():
        print("\n🎊 TEST PASSED!")
    else:
        print("\n💥 TEST FAILED!")