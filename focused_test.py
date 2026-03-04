#!/usr/bin/env python3
"""
Focused TimeSheet API Test - Core Functionality Verification
"""
import requests
import json

BACKEND_URL = "https://timesheet-gps-1.preview.emergentagent.com/api"
ADMIN_CREDS = {"email": "admin@timesheet.ch", "password": "admin123"}

def test_core_endpoints():
    print("🚀 Testing TimeSheet Core API Endpoints")
    
    # 1. Login as admin
    print("\n1. Admin Authentication...")
    response = requests.post(f"{BACKEND_URL}/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        data = response.json()
        token = data["token"]
        user = data["user"]
        print(f"✅ Admin login successful - Role: {user['role']}, Email: {user['email']}")
    else:
        print(f"❌ Admin login failed: {response.status_code}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test /auth/me
    print("\n2. Auth Me Endpoint...")
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ Auth me successful - Role: {user_data['role']}")
    else:
        print(f"❌ Auth me failed: {response.status_code}")
    
    # 3. Test Projects
    print("\n3. Projects Endpoints...")
    response = requests.get(f"{BACKEND_URL}/projects", headers=headers)
    if response.status_code == 200:
        projects = response.json()
        print(f"✅ Get projects successful - Count: {len(projects)}")
    else:
        print(f"❌ Get projects failed: {response.status_code}")
    
    # 4. Test Time Entries
    print("\n4. Time Entries Endpoints...")
    response = requests.get(f"{BACKEND_URL}/timeentries", headers=headers)
    if response.status_code == 200:
        entries = response.json()
        print(f"✅ Get time entries successful - Count: {len(entries)}")
    else:
        print(f"❌ Get time entries failed: {response.status_code}")
    
    # 5. Test Current Entry
    print("\n5. Current Entry Endpoint...")
    response = requests.get(f"{BACKEND_URL}/timeentries/current", headers=headers)
    if response.status_code == 200:
        current = response.json()
        print(f"✅ Get current entry successful - Active: {current.get('active', False)}")
    else:
        print(f"❌ Get current entry failed: {response.status_code}")
    
    # 6. Test Dashboard Stats
    print("\n6. Dashboard Stats...")
    response = requests.get(f"{BACKEND_URL}/stats/dashboard", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Dashboard stats successful - Employees: {stats.get('total_employees')}, Pending: {stats.get('pending_entries')}")
    else:
        print(f"❌ Dashboard stats failed: {response.status_code}")
    
    # 7. Test Weekly Stats
    print("\n7. Weekly Stats...")
    response = requests.get(f"{BACKEND_URL}/stats/weekly", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Weekly stats successful - Total hours: {stats.get('total_hours')}")
    else:
        print(f"❌ Weekly stats failed: {response.status_code}")
    
    # 8. Test Users endpoint
    print("\n8. Users Endpoint...")
    response = requests.get(f"{BACKEND_URL}/users", headers=headers)
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Get users successful - Count: {len(users)}")
    else:
        print(f"❌ Get users failed: {response.status_code}")
    
    # 9. Test Clients endpoint
    print("\n9. Clients Endpoint...")
    response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
    if response.status_code == 200:
        clients = response.json()
        print(f"✅ Get clients successful - Count: {len(clients)}")
    else:
        print(f"❌ Get clients failed: {response.status_code}")
    
    # 10. Test Departments endpoint
    print("\n10. Departments Endpoint...")
    response = requests.get(f"{BACKEND_URL}/departments", headers=headers)
    if response.status_code == 200:
        depts = response.json()
        print(f"✅ Get departments successful - Count: {len(depts)}")
    else:
        print(f"❌ Get departments failed: {response.status_code}")
    
    # 11. Test Activities endpoint
    print("\n11. Activities Endpoint...")
    response = requests.get(f"{BACKEND_URL}/activities", headers=headers)
    if response.status_code == 200:
        activities = response.json()
        print(f"✅ Get activities successful - Count: {len(activities)}")
    else:
        print(f"❌ Get activities failed: {response.status_code}")
    
    # 12. Test Leaves endpoint
    print("\n12. Leaves Endpoint...")
    response = requests.get(f"{BACKEND_URL}/leaves", headers=headers)
    if response.status_code == 200:
        leaves = response.json()
        print(f"✅ Get leaves successful - Count: {len(leaves)}")
    else:
        print(f"❌ Get leaves failed: {response.status_code}")
    
    # 13. Test Notifications
    print("\n13. Notifications Endpoints...")
    response = requests.get(f"{BACKEND_URL}/notifications", headers=headers)
    if response.status_code == 200:
        notifications = response.json()
        print(f"✅ Get notifications successful - Count: {len(notifications)}")
    else:
        print(f"❌ Get notifications failed: {response.status_code}")
    
    response = requests.get(f"{BACKEND_URL}/notifications/count", headers=headers)
    if response.status_code == 200:
        count_data = response.json()
        print(f"✅ Get notifications count successful - Unread: {count_data.get('unread_count')}")
    else:
        print(f"❌ Get notifications count failed: {response.status_code}")
    
    # 14. Test PDF Report
    print("\n14. PDF Report...")
    response = requests.get(f"{BACKEND_URL}/reports/pdf", headers=headers)
    if response.status_code == 200:
        print(f"✅ PDF report successful - Size: {len(response.content)} bytes")
    else:
        print(f"❌ PDF report failed: {response.status_code}")
    
    # 15. Test Excel Report
    print("\n15. Excel Report...")
    response = requests.get(f"{BACKEND_URL}/reports/excel", headers=headers)
    if response.status_code == 200:
        print(f"✅ Excel report successful - Size: {len(response.content)} bytes")
    else:
        print(f"❌ Excel report failed: {response.status_code}")

    print("\n🎉 Core API functionality testing completed!")

if __name__ == "__main__":
    test_core_endpoints()