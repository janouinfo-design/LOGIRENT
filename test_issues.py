#!/usr/bin/env python3
"""
Quick test for specific issues
"""

import requests
import json

# Backend URL from frontend/.env
BACKEND_URL = "https://timesheet-gps-1.preview.emergentagent.com/api"

# Test credentials
MANAGER_CREDS = {"email": "manager@test.ch", "password": "test123"}
EMPLOYEE_CREDS = {"email": "employe@test.ch", "password": "test123"}

def test_excel_issue():
    print("Testing Excel report issue...")
    
    # Login as employee first
    response = requests.post(f"{BACKEND_URL}/auth/login", json=EMPLOYEE_CREDS)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        return
    
    employee_token = response.json()["token"]
    headers = {"Authorization": f"Bearer {employee_token}"}
    
    # Test Excel report
    print("Requesting Excel report...")
    response = requests.get(f"{BACKEND_URL}/reports/excel", headers=headers)
    print(f"Excel response: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.text}")
    else:
        print(f"Success! Content type: {response.headers.get('content-type')}, Size: {len(response.content)}")

def test_current_entry():
    print("\nTesting current entry...")
    
    # Login as employee
    response = requests.post(f"{BACKEND_URL}/auth/login", json=EMPLOYEE_CREDS)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        return
    
    employee_token = response.json()["token"]
    headers = {"Authorization": f"Bearer {employee_token}"}
    
    # Check current entry
    response = requests.get(f"{BACKEND_URL}/timeentries/current", headers=headers)
    print(f"Current entry response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Current entry data: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text}")

def test_invalid_token():
    print("\nTesting invalid token...")
    
    # Test with invalid token 
    headers = {"Authorization": "Bearer invalid_token_test"}
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    print(f"Invalid token response: {response.status_code}")
    print(f"Response text: {response.text}")

if __name__ == "__main__":
    test_excel_issue()
    test_current_entry()
    test_invalid_token()