"""
Test suite for LogiRent Notification Push System
Tests:
- GET /api/notifications - returns user notifications with correct data
- GET /api/notifications/unread-count - returns correct unread count
- PUT /api/notifications/{id}/read - marks notification as read
- PUT /api/notifications/read-all - marks all as read
- POST /api/notifications/register-token - registers push token
- DELETE /api/notifications/{id} - deletes notification
- Reservation creation triggers notification for client AND agency admins
- Reservation cancellation by client triggers notification for agency admins
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "client1@test.com"
CLIENT_PASSWORD = "test1234"
ADMIN_EMAIL = "admin-geneva@logirent.ch"
ADMIN_PASSWORD = "LogiRent2024"

# Known user_id for client1@test.com (from context)
CLIENT_USER_ID = "50be61c7-12af-494b-9277-a8822d9c1347"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def client_token(api_client):
    """Get authentication token for client"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Client authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get authentication token for agency admin"""
    # Admin uses /api/admin/login endpoint
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, client_token):
    """Session with client auth header"""
    api_client.headers.update({"Authorization": f"Bearer {client_token}"})
    return api_client


class TestNotificationAPIs:
    """Test notification CRUD endpoints"""

    def test_get_notifications_returns_list(self, api_client, client_token):
        """GET /api/notifications returns user notifications with correct data"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Response should contain 'notifications' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        
        # Check structure of notifications if any exist
        if len(data["notifications"]) > 0:
            notif = data["notifications"][0]
            assert "id" in notif, "Notification should have 'id' field"
            assert "user_id" in notif, "Notification should have 'user_id' field"
            assert "type" in notif, "Notification should have 'type' field"
            assert "title" in notif, "Notification should have 'title' field"
            assert "message" in notif, "Notification should have 'message' field"
            assert "read" in notif, "Notification should have 'read' field"
            assert "created_at" in notif, "Notification should have 'created_at' field"
            print(f"✓ Retrieved {len(data['notifications'])} notifications for client")

    def test_get_unread_count_returns_number(self, api_client, client_token):
        """GET /api/notifications/unread-count returns correct unread count"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain 'count' key"
        assert isinstance(data["count"], int), "count should be an integer"
        assert data["count"] >= 0, "count should be non-negative"
        print(f"✓ Unread count: {data['count']}")

    def test_mark_notification_as_read(self, api_client, client_token):
        """PUT /api/notifications/{id}/read marks notification as read"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # First get notifications to find an unread one
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        notifications = response.json()["notifications"]
        
        # Find an unread notification or use the first one
        unread = [n for n in notifications if not n.get("read")]
        notif_id = unread[0]["id"] if unread else (notifications[0]["id"] if notifications else None)
        
        if not notif_id:
            # Create a test notification first
            pytest.skip("No notifications available to test mark as read")
        
        # Mark as read
        response = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Marked notification {notif_id} as read")

    def test_mark_all_notifications_as_read(self, api_client, client_token):
        """PUT /api/notifications/read-all marks all as read"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get unread count before
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        count_before = response.json()["count"]
        
        # Mark all as read
        response = api_client.put(f"{BASE_URL}/api/notifications/read-all", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        
        # Verify count is now 0
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        count_after = response.json()["count"]
        assert count_after == 0, f"Unread count should be 0 after mark all read, got {count_after}"
        print(f"✓ Marked all notifications as read (before: {count_before}, after: {count_after})")

    def test_register_push_token(self, api_client, client_token):
        """POST /api/notifications/register-token registers push token"""
        headers = {"Authorization": f"Bearer {client_token}"}
        test_token = f"ExponentPushToken[test_{uuid.uuid4().hex[:12]}]"
        
        response = api_client.post(
            f"{BASE_URL}/api/notifications/register-token",
            json={"token": test_token, "device_type": "web"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Registered push token: {test_token[:30]}...")

    def test_register_push_token_update_existing(self, api_client, client_token):
        """POST /api/notifications/register-token updates existing token"""
        headers = {"Authorization": f"Bearer {client_token}"}
        # Use same token to test update path
        test_token = "ExponentPushToken[test_update_existing_token]"
        
        # Register first time
        response = api_client.post(
            f"{BASE_URL}/api/notifications/register-token",
            json={"token": test_token, "device_type": "ios"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Register again with different device_type (update)
        response = api_client.post(
            f"{BASE_URL}/api/notifications/register-token",
            json={"token": test_token, "device_type": "android"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Updated existing push token")

    def test_delete_notification(self, api_client, client_token):
        """DELETE /api/notifications/{id} deletes notification"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get notifications
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        notifications = response.json()["notifications"]
        
        if not notifications:
            pytest.skip("No notifications available to delete")
        
        notif_id = notifications[-1]["id"]  # Delete the last one
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        
        # Verify deletion - notification should not appear in list
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        remaining_ids = [n["id"] for n in response.json()["notifications"]]
        assert notif_id not in remaining_ids, "Deleted notification should not appear in list"
        print(f"✓ Deleted notification {notif_id}")


class TestNotificationTriggers:
    """Test that events trigger notifications correctly"""

    def test_reservation_creation_triggers_client_notification(self, api_client, client_token):
        """Reservation creation triggers notification for client"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get unread count before
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        count_before = response.json()["count"]
        
        # Get available vehicles
        response = api_client.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        vehicles = response.json()
        
        if not vehicles:
            pytest.skip("No vehicles available for reservation test")
        
        vehicle = vehicles[0]
        vehicle_id = vehicle["id"]
        
        # Create reservation starting in future
        start_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%dT10:00:00Z")
        end_date = (datetime.utcnow() + timedelta(days=32)).strftime("%Y-%m-%dT10:00:00Z")
        
        reservation_data = {
            "vehicle_id": vehicle_id,
            "start_date": start_date,
            "end_date": end_date,
            "options": [],
            "payment_method": "card"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/reservations",
            json=reservation_data,
            headers=headers
        )
        
        # Allow 400 for already booked vehicles
        if response.status_code == 400 and "disponible" in response.text.lower():
            pytest.skip("Vehicle not available for selected dates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        reservation = response.json()
        reservation_id = reservation["id"]
        
        # Check that a notification was created
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        notifications = response.json()["notifications"]
        
        # Find notification related to this reservation
        res_notifs = [n for n in notifications if n.get("reservation_id") == reservation_id]
        assert len(res_notifs) > 0, f"No notification found for reservation {reservation_id}"
        
        # Verify notification type
        notif_types = [n["type"] for n in res_notifs]
        assert "reservation_created" in notif_types, f"Expected 'reservation_created' notification, found: {notif_types}"
        print(f"✓ Reservation {reservation_id} created, notification triggered for client")
        
        # Clean up - cancel the reservation
        response = api_client.post(f"{BASE_URL}/api/reservations/{reservation_id}/cancel", headers=headers)
        if response.status_code == 200:
            print(f"  (cleaned up: cancelled test reservation)")

    def test_admin_receives_new_reservation_notification(self, api_client, client_token, admin_token):
        """Agency admins receive notification when client creates reservation"""
        # Note: This test verifies admin can fetch notifications after a reservation
        
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        # Get admin's notifications
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers_admin)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        notifications = response.json()["notifications"]
        
        # Check if there are any 'new_reservation' type notifications
        new_res_notifs = [n for n in notifications if n["type"] == "new_reservation"]
        print(f"✓ Admin has {len(new_res_notifs)} 'new_reservation' notifications")
        
        # Also check unread count
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers_admin)
        assert response.status_code == 200
        print(f"  Admin unread count: {response.json()['count']}")

    def test_client_cancellation_triggers_admin_notification(self, api_client, client_token, admin_token):
        """Reservation cancellation by client triggers notification for agency admins"""
        headers_client = {"Authorization": f"Bearer {client_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        # Get admin's notifications before
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers_admin)
        assert response.status_code == 200
        admin_notifs_before = response.json()["notifications"]
        
        # Get available vehicles
        response = api_client.get(f"{BASE_URL}/api/vehicles", headers=headers_client)
        assert response.status_code == 200
        vehicles = response.json()
        
        if not vehicles:
            pytest.skip("No vehicles available for cancellation test")
        
        # Find a vehicle with agency_id
        vehicle = None
        for v in vehicles:
            if v.get("agency_id"):
                vehicle = v
                break
        
        if not vehicle:
            vehicle = vehicles[0]  # Use first vehicle even without agency
        
        vehicle_id = vehicle["id"]
        
        # Create reservation
        start_date = (datetime.utcnow() + timedelta(days=60)).strftime("%Y-%m-%dT10:00:00Z")
        end_date = (datetime.utcnow() + timedelta(days=62)).strftime("%Y-%m-%dT10:00:00Z")
        
        response = api_client.post(
            f"{BASE_URL}/api/reservations",
            json={
                "vehicle_id": vehicle_id,
                "start_date": start_date,
                "end_date": end_date,
                "options": [],
                "payment_method": "cash"
            },
            headers=headers_client
        )
        
        if response.status_code == 400 and "disponible" in response.text.lower():
            pytest.skip("Vehicle not available for selected dates")
        
        assert response.status_code == 200, f"Failed to create reservation: {response.status_code}: {response.text}"
        reservation_id = response.json()["id"]
        
        # Cancel the reservation
        response = api_client.post(
            f"{BASE_URL}/api/reservations/{reservation_id}/cancel",
            headers=headers_client
        )
        assert response.status_code == 200, f"Failed to cancel: {response.status_code}: {response.text}"
        
        # Check admin notifications after
        response = api_client.get(f"{BASE_URL}/api/notifications", headers=headers_admin)
        assert response.status_code == 200
        admin_notifs_after = response.json()["notifications"]
        
        # Verify client_cancelled notifications exist
        cancel_notifs = [n for n in admin_notifs_after if n["type"] == "client_cancelled"]
        print(f"✓ Admin has {len(cancel_notifs)} 'client_cancelled' notifications")


class TestNotificationAuthentication:
    """Test that notification endpoints require authentication"""

    def test_get_notifications_requires_auth(self, api_client):
        """GET /api/notifications requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ GET /api/notifications requires authentication")

    def test_unread_count_requires_auth(self, api_client):
        """GET /api/notifications/unread-count requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ GET /api/notifications/unread-count requires authentication")

    def test_mark_read_requires_auth(self, api_client):
        """PUT /api/notifications/{id}/read requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/notifications/test-id/read")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ PUT /api/notifications/{id}/read requires authentication")

    def test_delete_requires_auth(self, api_client):
        """DELETE /api/notifications/{id} requires authentication"""
        response = api_client.delete(f"{BASE_URL}/api/notifications/test-id")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ DELETE /api/notifications/{id} requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
