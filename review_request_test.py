#!/usr/bin/env python3
"""
RentDrive Review Request Specific Tests

Tests the exact scenarios mentioned in the review request:
1. Cash Payment Reservation
2. Admin Reservation Status Change
3. Admin Vehicle Edit
"""

import requests
import json
from datetime import datetime, timedelta


def test_review_request_scenarios():
    """Test the specific scenarios from the review request"""
    
    # Backend URL
    base_url = "https://fleet-ops-portal-2.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing Review Request Scenarios")
    print("=" * 50)
    
    # Step 1: Login to get JWT token
    print("\n📝 Step 1: Login with test@example.com/password123")
    login_response = requests.post(f"{api_url}/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
        return False
    
    token_data = login_response.json()
    access_token = token_data['access_token']
    headers = {"Authorization": f"Bearer {access_token}"}
    print("✅ Login successful, JWT token obtained")
    
    # Step 2: Get list of vehicles
    print("\n🚗 Step 2: Get list of vehicles")
    vehicles_response = requests.get(f"{api_url}/vehicles", headers=headers)
    
    if vehicles_response.status_code != 200:
        print(f"❌ Get vehicles failed: {vehicles_response.status_code}")
        return False
    
    vehicles = vehicles_response.json()
    if not vehicles:
        print("❌ No vehicles found")
        return False
    
    first_vehicle_id = vehicles[0]['id']
    print(f"✅ Retrieved {len(vehicles)} vehicles, using vehicle ID: {first_vehicle_id}")
    
    # Test 1: Cash Payment Reservation
    print("\n💰 Test 1: Cash Payment Reservation")
    print("-" * 30)
    
    start_date = datetime.now() + timedelta(days=30)
    end_date = start_date + timedelta(days=3)
    
    cash_reservation_data = {
        "vehicle_id": first_vehicle_id,
        "start_date": start_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_date": end_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "options": [],
        "payment_method": "cash"
    }
    
    cash_response = requests.post(f"{api_url}/reservations", 
                                 json=cash_reservation_data, 
                                 headers=headers)
    
    if cash_response.status_code in [200, 201]:
        cash_data = cash_response.json()
        if cash_data.get('status') == 'pending_cash' and cash_data.get('payment_method') == 'cash':
            print(f"✅ Cash reservation created successfully")
            print(f"   - Status: {cash_data.get('status')}")
            print(f"   - Payment Method: {cash_data.get('payment_method')}")
            print(f"   - Reservation ID: {cash_data.get('id')}")
            cash_reservation_id = cash_data['id']
        else:
            print(f"❌ Cash reservation status/payment_method incorrect:")
            print(f"   - Status: {cash_data.get('status')} (expected: pending_cash)")
            print(f"   - Payment Method: {cash_data.get('payment_method')} (expected: cash)")
            return False
    else:
        print(f"❌ Cash reservation failed: {cash_response.status_code} - {cash_response.text}")
        return False
    
    # Test 2: Admin Reservation Status Change
    print("\n👨‍💼 Test 2: Admin Reservation Status Change")
    print("-" * 30)
    
    # Get admin reservations
    admin_reservations_response = requests.get(f"{api_url}/admin/reservations", headers=headers)
    
    if admin_reservations_response.status_code != 200:
        print(f"❌ Get admin reservations failed: {admin_reservations_response.status_code}")
        return False
    
    admin_data = admin_reservations_response.json()
    reservations_list = admin_data.get('reservations', [])
    print(f"✅ Admin retrieved {len(reservations_list)} reservations")
    
    if not reservations_list:
        print("❌ No reservations available for admin testing")
        return False
    
    # Use the cash reservation we just created
    test_reservation_id = cash_reservation_id
    
    # Update to confirmed
    status_update_response = requests.put(
        f"{api_url}/admin/reservations/{test_reservation_id}/status?status=confirmed",
        headers=headers
    )
    
    if status_update_response.status_code == 200:
        status_data = status_update_response.json()
        print(f"✅ Status updated to confirmed: {status_data.get('message')}")
    else:
        print(f"❌ Status update to confirmed failed: {status_update_response.status_code} - {status_update_response.text}")
        return False
    
    # Update to pending_cash
    status_update_response2 = requests.put(
        f"{api_url}/admin/reservations/{test_reservation_id}/status?status=pending_cash",
        headers=headers
    )
    
    if status_update_response2.status_code == 200:
        status_data2 = status_update_response2.json()
        print(f"✅ Status updated to pending_cash: {status_data2.get('message')}")
    else:
        print(f"❌ Status update to pending_cash failed: {status_update_response2.status_code} - {status_update_response2.text}")
        return False
    
    # Test 3: Admin Vehicle Edit
    print("\n🔧 Test 3: Admin Vehicle Edit")
    print("-" * 30)
    
    # Get the first vehicle details to backup original data
    vehicle_details_response = requests.get(f"{api_url}/vehicles/{first_vehicle_id}", headers=headers)
    
    if vehicle_details_response.status_code != 200:
        print(f"❌ Get vehicle details failed: {vehicle_details_response.status_code}")
        return False
    
    original_vehicle = vehicle_details_response.json()
    
    # Update vehicle as specified in the review request
    update_data = {
        "brand": "BMW",
        "model": "Series 5 Updated", 
        "year": 2025,
        "type": "berline",
        "price_per_day": 150.0,
        "location": "Geneva",
        "description": "Updated description",
        "seats": 5,
        "transmission": "automatic",
        "fuel_type": "hybrid",
        "photos": [],
        "options": []
    }
    
    vehicle_update_response = requests.put(
        f"{api_url}/admin/vehicles/{first_vehicle_id}",
        json=update_data,
        headers=headers
    )
    
    if vehicle_update_response.status_code == 200:
        updated_vehicle = vehicle_update_response.json()
        
        # Verify the update
        if (updated_vehicle.get('brand') == 'BMW' and
            updated_vehicle.get('model') == 'Series 5 Updated' and
            updated_vehicle.get('year') == 2025 and
            updated_vehicle.get('price_per_day') == 150.0):
            
            print("✅ Vehicle updated successfully:")
            print(f"   - Brand: {updated_vehicle.get('brand')}")
            print(f"   - Model: {updated_vehicle.get('model')}")
            print(f"   - Year: {updated_vehicle.get('year')}")
            print(f"   - Price: CHF {updated_vehicle.get('price_per_day')}")
            
            # Restore original data
            restore_data = {
                "brand": original_vehicle['brand'],
                "model": original_vehicle['model'],
                "year": original_vehicle['year'],
                "type": original_vehicle['type'],
                "price_per_day": original_vehicle['price_per_day'],
                "location": original_vehicle['location'],
                "description": original_vehicle.get('description', ''),
                "seats": original_vehicle['seats'],
                "transmission": original_vehicle['transmission'],
                "fuel_type": original_vehicle['fuel_type'],
                "photos": original_vehicle.get('photos', []),
                "options": original_vehicle.get('options', [])
            }
            
            restore_response = requests.put(
                f"{api_url}/admin/vehicles/{first_vehicle_id}",
                json=restore_data,
                headers=headers
            )
            
            if restore_response.status_code == 200:
                print("✅ Vehicle data restored to original values")
            else:
                print(f"⚠️ Warning: Could not restore original vehicle data")
                
        else:
            print(f"❌ Vehicle update verification failed:")
            print(f"   - Brand: {updated_vehicle.get('brand')} (expected: BMW)")
            print(f"   - Model: {updated_vehicle.get('model')} (expected: Series 5 Updated)")
            print(f"   - Year: {updated_vehicle.get('year')} (expected: 2025)")
            print(f"   - Price: {updated_vehicle.get('price_per_day')} (expected: 150.0)")
            return False
            
    else:
        print(f"❌ Vehicle update failed: {vehicle_update_response.status_code} - {vehicle_update_response.text}")
        return False
    
    print("\n🎉 All Review Request Tests Passed!")
    print("=" * 50)
    print("✅ Cash Payment Reservation: Working")
    print("✅ Admin Reservation Status Change: Working") 
    print("✅ Admin Vehicle Edit: Working")
    
    return True


if __name__ == "__main__":
    success = test_review_request_scenarios()
    
    if success:
        print("\n🚀 All tests completed successfully!")
        exit(0)
    else:
        print("\n❌ Some tests failed!")
        exit(1)