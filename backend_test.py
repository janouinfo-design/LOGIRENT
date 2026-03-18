#!/usr/bin/env python3
"""
RentDrive Backend API Testing Suite

Comprehensive testing for all backend APIs including auth, vehicles, 
reservations, and payments.
"""

import requests
import json
import uuid
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


class RentDriveAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.test_user = {
            "email": "test@example.com",
            "password": "password123"
        }
        self.new_user = {
            "email": f"newuser_{uuid.uuid4().hex[:8]}@example.com",
            "password": "newpass123",
            "name": "John Doe",
            "phone": "+41791234567"
        }
        self.test_results = []

    def log_result(self, test_name: str, success: bool, message: str = "", error: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "error": error
        }
        self.test_results.append(result)
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message or error}")

    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with authentication if available"""
        url = f"{self.api_url}{endpoint}"
        headers = kwargs.get('headers', {})
        
        if self.access_token:
            headers['Authorization'] = f"Bearer {self.access_token}"
        
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, url, **kwargs)
            print(f"  {method} {endpoint} -> {response.status_code}")
            return response
        except Exception as e:
            print(f"  {method} {endpoint} -> ERROR: {e}")
            raise

    # ==================== AUTH TESTS ====================

    def test_user_registration(self) -> bool:
        """Test user registration with new account"""
        try:
            response = self.make_request('POST', '/auth/register', json=self.new_user)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.log_result("User Registration", True, 
                                  f"User created successfully with email {self.new_user['email']}")
                    return True
                else:
                    self.log_result("User Registration", False, 
                                  error=f"Missing fields in response: {data}")
                    return False
            else:
                self.log_result("User Registration", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Registration", False, error=f"Exception: {str(e)}")
            return False

    def test_duplicate_registration(self) -> bool:
        """Test duplicate email registration (should fail)"""
        try:
            # Try to register same user again
            response = self.make_request('POST', '/auth/register', json=self.new_user)
            
            if response.status_code == 400:
                self.log_result("Duplicate Registration Prevention", True, 
                              "Correctly rejected duplicate email")
                return True
            else:
                self.log_result("Duplicate Registration Prevention", False, 
                              error=f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Duplicate Registration Prevention", False, error=f"Exception: {str(e)}")
            return False

    def test_user_login(self) -> bool:
        """Test user login with existing test user"""
        try:
            response = self.make_request('POST', '/auth/login', json=self.test_user)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.access_token = data['access_token']
                    self.log_result("User Login", True, 
                                  f"Login successful for {self.test_user['email']}")
                    return True
                else:
                    self.log_result("User Login", False, 
                                  error=f"Missing fields in response: {data}")
                    return False
            else:
                self.log_result("User Login", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Login", False, error=f"Exception: {str(e)}")
            return False

    def test_invalid_login(self) -> bool:
        """Test login with wrong password"""
        try:
            invalid_creds = {
                "email": self.test_user["email"],
                "password": "wrongpassword"
            }
            response = self.make_request('POST', '/auth/login', json=invalid_creds)
            
            if response.status_code == 401:
                self.log_result("Invalid Login Rejection", True, 
                              "Correctly rejected invalid credentials")
                return True
            else:
                self.log_result("Invalid Login Rejection", False, 
                              error=f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Invalid Login Rejection", False, error=f"Exception: {str(e)}")
            return False

    def test_get_profile(self) -> bool:
        """Test getting user profile (requires JWT)"""
        try:
            if not self.access_token:
                self.log_result("Get Profile", False, error="No access token available")
                return False
                
            response = self.make_request('GET', '/auth/profile')
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'email', 'name', 'created_at']
                missing = [f for f in required_fields if f not in data]
                
                if not missing:
                    self.log_result("Get Profile", True, 
                                  f"Profile retrieved for {data['email']}")
                    return True
                else:
                    self.log_result("Get Profile", False, 
                                  error=f"Missing fields: {missing}")
                    return False
            else:
                self.log_result("Get Profile", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Profile", False, error=f"Exception: {str(e)}")
            return False

    def test_update_profile(self) -> bool:
        """Test updating user profile"""
        try:
            if not self.access_token:
                self.log_result("Update Profile", False, error="No access token available")
                return False
                
            update_data = {
                "name": "Updated Test User",
                "phone": "+41791111111",
                "address": "123 Test Street, Geneva"
            }
            response = self.make_request('PUT', '/auth/profile', json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data['name'] == update_data['name'] and data['phone'] == update_data['phone']:
                    self.log_result("Update Profile", True, 
                                  "Profile updated successfully")
                    return True
                else:
                    self.log_result("Update Profile", False, 
                                  error=f"Profile not updated correctly: {data}")
                    return False
            else:
                self.log_result("Update Profile", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Update Profile", False, error=f"Exception: {str(e)}")
            return False

    def test_forgot_password(self) -> bool:
        """Test forgot password endpoint"""
        try:
            request_data = {"email": "test@example.com"}
            response = self.make_request('POST', '/auth/forgot-password', json=request_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Forgot Password", True, 
                                  "Forgot password request processed")
                    return True
                else:
                    self.log_result("Forgot Password", False, 
                                  error=f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Forgot Password", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Forgot Password", False, error=f"Exception: {str(e)}")
            return False

    # ==================== VEHICLE TESTS ====================

    def test_get_vehicles_list(self) -> bool:
        """Test getting vehicles list"""
        try:
            response = self.make_request('GET', '/vehicles')
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    vehicle = data[0]
                    required_fields = ['id', 'brand', 'model', 'price_per_day', 'type']
                    missing = [f for f in required_fields if f not in vehicle]
                    
                    if not missing:
                        self.log_result("Get Vehicles List", True, 
                                      f"Retrieved {len(data)} vehicles")
                        return True
                    else:
                        self.log_result("Get Vehicles List", False, 
                                      error=f"Vehicle missing fields: {missing}")
                        return False
                else:
                    self.log_result("Get Vehicles List", False, 
                                  error="No vehicles found or invalid format")
                    return False
            else:
                self.log_result("Get Vehicles List", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Vehicles List", False, error=f"Exception: {str(e)}")
            return False

    def test_vehicle_filters(self) -> bool:
        """Test vehicle filtering functionality"""
        try:
            # Test type filter
            response = self.make_request('GET', '/vehicles?type=berline')
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if all vehicles are of type 'berline' (if any returned)
                    if data and all(v['type'] == 'berline' for v in data):
                        self.log_result("Vehicle Type Filter", True, 
                                      f"Type filter working, {len(data)} berline vehicles")
                    elif not data:
                        self.log_result("Vehicle Type Filter", True, 
                                      "Type filter working, no berline vehicles found")
                    else:
                        self.log_result("Vehicle Type Filter", False, 
                                      error="Filter not working correctly")
                        return False
                else:
                    self.log_result("Vehicle Type Filter", False, 
                                  error="Invalid response format")
                    return False
            else:
                self.log_result("Vehicle Type Filter", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False

            # Test price range filter
            response = self.make_request('GET', '/vehicles?min_price=50&max_price=100')
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if data and all(50 <= v['price_per_day'] <= 100 for v in data):
                        self.log_result("Vehicle Price Filter", True, 
                                      f"Price filter working, {len(data)} vehicles in range")
                    elif not data:
                        self.log_result("Vehicle Price Filter", True, 
                                      "Price filter working, no vehicles in range")
                    else:
                        self.log_result("Vehicle Price Filter", False, 
                                      error="Price filter not working correctly")
                        return False
                    return True
                else:
                    self.log_result("Vehicle Price Filter", False, 
                                  error="Invalid response format")
                    return False
            else:
                self.log_result("Vehicle Price Filter", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Vehicle Filters", False, error=f"Exception: {str(e)}")
            return False

    def test_get_vehicle_details(self) -> bool:
        """Test getting specific vehicle details"""
        try:
            # First get a vehicle ID
            vehicles_response = self.make_request('GET', '/vehicles')
            
            if vehicles_response.status_code != 200:
                self.log_result("Get Vehicle Details", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Get Vehicle Details", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            response = self.make_request('GET', f'/vehicles/{vehicle_id}')
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'brand', 'model', 'price_per_day', 'type']
                missing = [f for f in required_fields if f not in data]
                
                if not missing and data['id'] == vehicle_id:
                    self.log_result("Get Vehicle Details", True, 
                                  f"Vehicle details retrieved for {data['brand']} {data['model']}")
                    return True
                else:
                    self.log_result("Get Vehicle Details", False, 
                                  error=f"Missing fields or wrong ID: {missing}")
                    return False
            else:
                self.log_result("Get Vehicle Details", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Vehicle Details", False, error=f"Exception: {str(e)}")
            return False

    def test_vehicle_availability(self) -> bool:
        """Test getting vehicle availability for a month"""
        try:
            # First get a vehicle ID
            vehicles_response = self.make_request('GET', '/vehicles')
            
            if vehicles_response.status_code != 200:
                self.log_result("Vehicle Availability", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Vehicle Availability", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            response = self.make_request('GET', f'/vehicles/{vehicle_id}/availability?month={current_month}&year={current_year}')
            
            if response.status_code == 200:
                data = response.json()
                if 'booked_dates' in data and isinstance(data['booked_dates'], list):
                    self.log_result("Vehicle Availability", True, 
                                  f"Availability retrieved, {len(data['booked_dates'])} booked dates")
                    return True
                else:
                    self.log_result("Vehicle Availability", False, 
                                  error=f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Vehicle Availability", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Vehicle Availability", False, error=f"Exception: {str(e)}")
            return False

    # ==================== RESERVATION TESTS ====================

    def test_create_reservation(self) -> bool:
        """Test creating a new reservation"""
        try:
            if not self.access_token:
                self.log_result("Create Reservation", False, error="No access token available")
                return False
                
            # Get a vehicle ID
            vehicles_response = self.make_request('GET', '/vehicles')
            if vehicles_response.status_code != 200:
                self.log_result("Create Reservation", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Create Reservation", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            
            # Create reservation for next week
            start_date = datetime.now() + timedelta(days=7)
            end_date = start_date + timedelta(days=3)
            
            reservation_data = {
                "vehicle_id": vehicle_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": ["GPS"]
            }
            
            response = self.make_request('POST', '/reservations', json=reservation_data)
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                required_fields = ['id', 'user_id', 'vehicle_id', 'total_price', 'status']
                missing = [f for f in required_fields if f not in data]
                
                if not missing:
                    self.reservation_id = data['id']  # Store for later tests
                    self.log_result("Create Reservation", True, 
                                  f"Reservation created with ID {data['id']}, price {data['total_price']} CHF")
                    return True
                else:
                    self.log_result("Create Reservation", False, 
                                  error=f"Missing fields: {missing}")
                    return False
            else:
                self.log_result("Create Reservation", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Reservation", False, error=f"Exception: {str(e)}")
            return False

    def test_duplicate_reservation(self) -> bool:
        """Test creating overlapping reservation (should fail)"""
        try:
            if not self.access_token:
                self.log_result("Duplicate Reservation Prevention", False, 
                              error="No access token available")
                return False
                
            # Get a vehicle ID
            vehicles_response = self.make_request('GET', '/vehicles')
            if vehicles_response.status_code != 200:
                self.log_result("Duplicate Reservation Prevention", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Duplicate Reservation Prevention", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            
            # Try to create overlapping reservation
            start_date = datetime.now() + timedelta(days=7)
            end_date = start_date + timedelta(days=3)
            
            reservation_data = {
                "vehicle_id": vehicle_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": []
            }
            
            response = self.make_request('POST', '/reservations', json=reservation_data)
            
            if response.status_code == 400:
                self.log_result("Duplicate Reservation Prevention", True, 
                              "Correctly rejected overlapping reservation")
                return True
            else:
                self.log_result("Duplicate Reservation Prevention", False, 
                              error=f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Duplicate Reservation Prevention", False, error=f"Exception: {str(e)}")
            return False

    def test_get_user_reservations(self) -> bool:
        """Test getting user's reservations"""
        try:
            if not self.access_token:
                self.log_result("Get User Reservations", False, error="No access token available")
                return False
                
            response = self.make_request('GET', '/reservations')
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get User Reservations", True, 
                                  f"Retrieved {len(data)} reservations")
                    return True
                else:
                    self.log_result("Get User Reservations", False, 
                                  error=f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Get User Reservations", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get User Reservations", False, error=f"Exception: {str(e)}")
            return False

    def test_get_reservation_details(self) -> bool:
        """Test getting specific reservation details"""
        try:
            if not self.access_token:
                self.log_result("Get Reservation Details", False, error="No access token available")
                return False
                
            # First get reservations to get an ID
            reservations_response = self.make_request('GET', '/reservations')
            
            if reservations_response.status_code != 200:
                self.log_result("Get Reservation Details", False, 
                              error="Cannot get reservations list")
                return False
                
            reservations = reservations_response.json()
            if not reservations:
                self.log_result("Get Reservation Details", False, 
                              error="No reservations found for testing")
                return False
                
            reservation_id = reservations[0]['id']
            response = self.make_request('GET', f'/reservations/{reservation_id}')
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'user_id', 'vehicle_id', 'total_price', 'status']
                missing = [f for f in required_fields if f not in data]
                
                if not missing and data['id'] == reservation_id:
                    self.log_result("Get Reservation Details", True, 
                                  f"Reservation details retrieved for ID {reservation_id}")
                    return True
                else:
                    self.log_result("Get Reservation Details", False, 
                                  error=f"Missing fields or wrong ID: {missing}")
                    return False
            else:
                self.log_result("Get Reservation Details", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Reservation Details", False, error=f"Exception: {str(e)}")
            return False

    def test_cancel_reservation(self) -> bool:
        """Test canceling a reservation"""
        try:
            if not self.access_token:
                self.log_result("Cancel Reservation", False, error="No access token available")
                return False
                
            # First get reservations to find one to cancel
            reservations_response = self.make_request('GET', '/reservations')
            
            if reservations_response.status_code != 200:
                self.log_result("Cancel Reservation", False, 
                              error="Cannot get reservations list")
                return False
                
            reservations = reservations_response.json()
            if not reservations:
                self.log_result("Cancel Reservation", False, 
                              error="No reservations found for testing")
                return False
                
            # Find a pending reservation
            pending_reservation = None
            for res in reservations:
                if res['status'] == 'pending':
                    pending_reservation = res
                    break
                    
            if not pending_reservation:
                self.log_result("Cancel Reservation", False, 
                              error="No pending reservations to cancel")
                return False
                
            reservation_id = pending_reservation['id']
            response = self.make_request('POST', f'/reservations/{reservation_id}/cancel')
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Cancel Reservation", True, 
                                  f"Reservation {reservation_id} cancelled successfully")
                    return True
                else:
                    self.log_result("Cancel Reservation", False, 
                                  error=f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Cancel Reservation", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Cancel Reservation", False, error=f"Exception: {str(e)}")
            return False

    # ==================== PAYMENT TESTS ====================

    def test_stripe_checkout(self) -> bool:
        """Test Stripe checkout creation"""
        try:
            if not self.access_token:
                self.log_result("Stripe Checkout", False, error="No access token available")
                return False
                
            # First get reservations to get one for checkout
            reservations_response = self.make_request('GET', '/reservations')
            
            if reservations_response.status_code != 200:
                self.log_result("Stripe Checkout", False, 
                              error="Cannot get reservations list")
                return False
                
            reservations = reservations_response.json()
            if not reservations:
                self.log_result("Stripe Checkout", False, 
                              error="No reservations found for testing")
                return False
                
            # Find a pending reservation
            pending_reservation = None
            for res in reservations:
                if res['status'] == 'pending' and res['payment_status'] == 'unpaid':
                    pending_reservation = res
                    break
                    
            if not pending_reservation:
                self.log_result("Stripe Checkout", False, 
                              error="No unpaid reservations for checkout testing")
                return False
                
            checkout_data = {
                "reservation_id": pending_reservation['id'],
                "origin_url": self.base_url
            }
            
            response = self.make_request('POST', '/payments/checkout', json=checkout_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'url' in data and 'session_id' in data:
                    self.checkout_session_id = data['session_id']  # Store for status check
                    self.log_result("Stripe Checkout", True, 
                                  f"Checkout session created with ID {data['session_id']}")
                    return True
                else:
                    self.log_result("Stripe Checkout", False, 
                                  error=f"Missing fields in response: {data}")
                    return False
            else:
                self.log_result("Stripe Checkout", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Stripe Checkout", False, error=f"Exception: {str(e)}")
            return False

    def test_payment_status(self) -> bool:
        """Test payment status checking"""
        try:
            if not self.access_token:
                self.log_result("Payment Status", False, error="No access token available")
                return False
                
            if not hasattr(self, 'checkout_session_id') or not self.checkout_session_id:
                self.log_result("Payment Status", False, 
                              error="No checkout session ID available")
                return False
                
            response = self.make_request('GET', f'/payments/status/{self.checkout_session_id}')
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['status', 'payment_status', 'amount', 'currency']
                missing = [f for f in required_fields if f not in data]
                
                if not missing:
                    self.log_result("Payment Status", True, 
                                  f"Payment status retrieved: {data['payment_status']}")
                    return True
                else:
                    self.log_result("Payment Status", False, 
                                  error=f"Missing fields: {missing}")
                    return False
            else:
                self.log_result("Payment Status", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Payment Status", False, error=f"Exception: {str(e)}")
            return False

    # ==================== AUTHENTICATION TESTS ====================

    def test_unauthorized_access(self) -> bool:
        """Test accessing protected endpoints without token"""
        try:
            # Temporarily clear token
            temp_token = self.access_token
            self.access_token = None
            
            response = self.make_request('GET', '/auth/profile')
            
            # Restore token
            self.access_token = temp_token
            
            if response.status_code == 401:
                self.log_result("Unauthorized Access Protection", True, 
                              "Protected endpoint correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Unauthorized Access Protection", False, 
                              error=f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Unauthorized Access Protection", False, error=f"Exception: {str(e)}")
            return False

    # ==================== NEW FEATURES TESTS ====================
    
    def test_cash_payment_reservation(self) -> bool:
        """Test creating a reservation with cash payment method"""
        try:
            if not self.access_token:
                self.log_result("Cash Payment Reservation", False, error="No access token available")
                return False
                
            # Get a vehicle ID
            vehicles_response = self.make_request('GET', '/vehicles')
            if vehicles_response.status_code != 200:
                self.log_result("Cash Payment Reservation", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Cash Payment Reservation", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            
            # Create reservation with cash payment
            start_date = datetime.now() + timedelta(days=14)  # Use different dates to avoid conflicts
            end_date = start_date + timedelta(days=3)
            
            reservation_data = {
                "vehicle_id": vehicle_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "options": [],
                "payment_method": "cash"
            }
            
            response = self.make_request('POST', '/reservations', json=reservation_data)
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                if (data.get('status') == 'pending_cash' and 
                    data.get('payment_method') == 'cash'):
                    self.cash_reservation_id = data['id']  # Store for admin tests
                    self.log_result("Cash Payment Reservation", True, 
                                  f"Cash reservation created with status='{data['status']}', payment_method='{data['payment_method']}'")
                    return True
                else:
                    self.log_result("Cash Payment Reservation", False, 
                                  error=f"Incorrect status/payment_method: status={data.get('status')}, payment_method={data.get('payment_method')}")
                    return False
            else:
                self.log_result("Cash Payment Reservation", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Cash Payment Reservation", False, error=f"Exception: {str(e)}")
            return False

    def test_admin_get_reservations(self) -> bool:
        """Test admin getting all reservations"""
        try:
            if not self.access_token:
                self.log_result("Admin Get Reservations", False, error="No access token available")
                return False
                
            response = self.make_request('GET', '/admin/reservations')
            
            if response.status_code == 200:
                data = response.json()
                if 'reservations' in data and isinstance(data['reservations'], list):
                    self.log_result("Admin Get Reservations", True, 
                                  f"Admin retrieved {len(data['reservations'])} reservations")
                    return True
                else:
                    self.log_result("Admin Get Reservations", False, 
                                  error=f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Admin Get Reservations", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Get Reservations", False, error=f"Exception: {str(e)}")
            return False

    def test_admin_update_reservation_status(self) -> bool:
        """Test admin updating reservation status"""
        try:
            if not self.access_token:
                self.log_result("Admin Update Reservation Status", False, error="No access token available")
                return False
            
            # Use the cash reservation created earlier if available
            reservation_id = getattr(self, 'cash_reservation_id', None)
            if not reservation_id:
                # Try to get a reservation from the list
                reservations_response = self.make_request('GET', '/admin/reservations')
                if reservations_response.status_code != 200:
                    self.log_result("Admin Update Reservation Status", False, 
                                  error="Cannot get reservations for testing")
                    return False
                
                reservations_data = reservations_response.json()
                reservations = reservations_data.get('reservations', [])
                if not reservations:
                    self.log_result("Admin Update Reservation Status", False, 
                                  error="No reservations available for testing")
                    return False
                
                reservation_id = reservations[0]['id']
            
            # Test updating to confirmed status
            response = self.make_request('PUT', f'/admin/reservations/{reservation_id}/status?status=confirmed')
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'confirmed' in data['message']:
                    # Test updating to pending_cash status
                    response2 = self.make_request('PUT', f'/admin/reservations/{reservation_id}/status?status=pending_cash')
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if 'message' in data2 and 'pending_cash' in data2['message']:
                            self.log_result("Admin Update Reservation Status", True, 
                                          f"Successfully updated reservation status to confirmed and pending_cash")
                            return True
                        else:
                            self.log_result("Admin Update Reservation Status", False, 
                                          error=f"Failed to update to pending_cash: {data2}")
                            return False
                    else:
                        self.log_result("Admin Update Reservation Status", False, 
                                      error=f"Failed to update to pending_cash - Status {response2.status_code}: {response2.text}")
                        return False
                else:
                    self.log_result("Admin Update Reservation Status", False, 
                                  error=f"Unexpected response format: {data}")
                    return False
            else:
                self.log_result("Admin Update Reservation Status", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Update Reservation Status", False, error=f"Exception: {str(e)}")
            return False

    def test_admin_edit_vehicle(self) -> bool:
        """Test admin editing vehicle details"""
        try:
            if not self.access_token:
                self.log_result("Admin Edit Vehicle", False, error="No access token available")
                return False
                
            # Get a vehicle to edit
            vehicles_response = self.make_request('GET', '/vehicles')
            if vehicles_response.status_code != 200:
                self.log_result("Admin Edit Vehicle", False, 
                              error="Cannot get vehicles list")
                return False
                
            vehicles = vehicles_response.json()
            if not vehicles:
                self.log_result("Admin Edit Vehicle", False, 
                              error="No vehicles available for testing")
                return False
                
            vehicle_id = vehicles[0]['id']
            original_vehicle = vehicles[0]
            
            # Update vehicle data
            updated_data = {
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
            
            response = self.make_request('PUT', f'/admin/vehicles/{vehicle_id}', json=updated_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('brand') == 'BMW' and 
                    data.get('model') == 'Series 5 Updated' and
                    data.get('year') == 2025 and
                    data.get('price_per_day') == 150.0):
                    # Restore original vehicle data
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
                    
                    # Restore original data
                    self.make_request('PUT', f'/admin/vehicles/{vehicle_id}', json=restore_data)
                    
                    self.log_result("Admin Edit Vehicle", True, 
                                  f"Vehicle updated successfully and restored")
                    return True
                else:
                    self.log_result("Admin Edit Vehicle", False, 
                                  error=f"Vehicle not updated correctly: {data}")
                    return False
            else:
                self.log_result("Admin Edit Vehicle", False, 
                              error=f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Edit Vehicle", False, error=f"Exception: {str(e)}")
            return False

    def test_admin_payment_status_update(self) -> bool:
        """Test admin payment status update endpoint"""
        try:
            if not self.access_token:
                self.log_result("Admin Payment Status Update", False, error="No access token available")
                return False
            
            # Step 1: Get admin reservations to find one to update
            response = self.make_request('GET', '/admin/reservations')
            
            if response.status_code != 200:
                self.log_result("Admin Payment Status Update", False, 
                              error=f"Cannot get admin reservations: Status {response.status_code}: {response.text}")
                return False
            
            reservations_data = response.json()
            reservations = reservations_data.get('reservations', [])
            
            if not reservations:
                self.log_result("Admin Payment Status Update", False, 
                              error="No reservations found for testing")
                return False
            
            # Find a suitable reservation to update (prefer unpaid ones)
            target_reservation = None
            for res in reservations:
                if res.get('payment_status') == 'unpaid':
                    target_reservation = res
                    break
            
            # If no unpaid found, use first reservation
            if not target_reservation:
                target_reservation = reservations[0]
            
            reservation_id = target_reservation['id']
            original_payment_status = target_reservation.get('payment_status', 'unpaid')
            original_status = target_reservation.get('status', 'pending')
            
            print(f"    Testing with reservation {reservation_id}")
            print(f"    Original payment_status: {original_payment_status}, status: {original_status}")
            
            # Step 2: Test updating payment status to "paid"
            response = self.make_request('PUT', f'/admin/reservations/{reservation_id}/payment-status?payment_status=paid')
            
            if response.status_code != 200:
                self.log_result("Admin Payment Status Update", False, 
                              error=f"Failed to update payment status to paid: Status {response.status_code}: {response.text}")
                return False
            
            data = response.json()
            if not data.get('message') or 'paid' not in data['message']:
                self.log_result("Admin Payment Status Update", False, 
                              error=f"Unexpected response for paid status: {data}")
                return False
            
            # Step 3: Verify the payment status was updated
            verification_response = self.make_request('GET', '/admin/reservations')
            if verification_response.status_code == 200:
                updated_reservations = verification_response.json().get('reservations', [])
                updated_reservation = None
                for res in updated_reservations:
                    if res['id'] == reservation_id:
                        updated_reservation = res
                        break
                
                if updated_reservation:
                    if updated_reservation.get('payment_status') != 'paid':
                        self.log_result("Admin Payment Status Update", False, 
                                      error=f"Payment status not updated to paid: {updated_reservation.get('payment_status')}")
                        return False
                    
                    # Check if status changed to confirmed for pending_cash reservations
                    if original_status == 'pending_cash' and updated_reservation.get('status') != 'confirmed':
                        self.log_result("Admin Payment Status Update", False, 
                                      error=f"Reservation status should change to confirmed for pending_cash, got: {updated_reservation.get('status')}")
                        return False
            
            # Step 4: Test other payment statuses
            test_statuses = ['unpaid', 'refunded', 'pending']
            
            for status in test_statuses:
                response = self.make_request('PUT', f'/admin/reservations/{reservation_id}/payment-status?payment_status={status}')
                
                if response.status_code != 200:
                    self.log_result("Admin Payment Status Update", False, 
                                  error=f"Failed to update payment status to {status}: Status {response.status_code}: {response.text}")
                    return False
                
                data = response.json()
                if not data.get('message') or status not in data['message']:
                    self.log_result("Admin Payment Status Update", False, 
                                  error=f"Unexpected response for {status} status: {data}")
                    return False
            
            # Step 5: Test invalid payment status
            invalid_response = self.make_request('PUT', f'/admin/reservations/{reservation_id}/payment-status?payment_status=invalid_status')
            
            if invalid_response.status_code != 400:
                self.log_result("Admin Payment Status Update", False, 
                              error=f"Should reject invalid payment status with 400, got: {invalid_response.status_code}")
                return False
            
            # Step 6: Restore original payment status
            restore_response = self.make_request('PUT', f'/admin/reservations/{reservation_id}/payment-status?payment_status={original_payment_status}')
            
            if restore_response.status_code == 200:
                self.log_result("Admin Payment Status Update", True, 
                              f"All payment status updates working correctly (paid, unpaid, pending, refunded)")
                return True
            else:
                self.log_result("Admin Payment Status Update", False, 
                              error=f"Failed to restore original status: Status {restore_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Payment Status Update", False, error=f"Exception: {str(e)}")
            return False

    # ==================== MAIN TEST RUNNER ====================

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend API tests"""
        print("🚀 Starting RentDrive Backend API Tests")
        print("=" * 60)
        
        # Auth Tests
        print("\n📝 Authentication Tests")
        print("-" * 30)
        self.test_user_registration()
        self.test_duplicate_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_get_profile()
        self.test_update_profile()
        self.test_forgot_password()
        self.test_unauthorized_access()
        
        # Vehicle Tests
        print("\n🚗 Vehicle Tests")
        print("-" * 30)
        self.test_get_vehicles_list()
        self.test_vehicle_filters()
        self.test_get_vehicle_details()
        self.test_vehicle_availability()
        
        # Reservation Tests
        print("\n📅 Reservation Tests")
        print("-" * 30)
        self.test_create_reservation()
        self.test_duplicate_reservation()
        self.test_get_user_reservations()
        self.test_get_reservation_details()
        self.test_cancel_reservation()
        
        # Payment Tests
        print("\n💳 Payment Tests")
        print("-" * 30)
        self.test_stripe_checkout()
        self.test_payment_status()
        
        # New Features Tests
        print("\n🆕 New Features Tests")
        print("-" * 30)
        self.test_cash_payment_reservation()
        self.test_admin_get_reservations()
        self.test_admin_update_reservation_status()
        self.test_admin_edit_vehicle()
        self.test_admin_payment_status_update()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['error']}")
        
        return {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'success_rate': passed_tests/total_tests*100,
            'results': self.test_results
        }


def main():
    """Main test execution"""
    # Use the backend URL from frontend .env
    backend_url = "https://deploy-local-db.preview.emergentagent.com"
    
    tester = RentDriveAPITester(backend_url)
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()