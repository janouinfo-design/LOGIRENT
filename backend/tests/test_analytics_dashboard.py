"""
Test Analytics Dashboard Features:
- GET /api/admin/stats/top-clients: Top clients by revenue
- GET /api/admin/stats/agency-comparison: Agency revenue comparison (super admin only)
- GET /api/admin/stats/revenue-forecast: AI-powered revenue forecast (GPT-5.2)
- GET /api/admin/stats/advanced: Advanced stats
- GET /api/admin/stats: Basic stats with revenue_by_month
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def super_admin_token(api_client):
    """Get super admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Super admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def geneva_admin_token(api_client):
    """Get Geneva agency admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin-geneva@logirent.ch",
        "password": "LogiRent2024"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Geneva admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def lausanne_admin_token(api_client):
    """Get Lausanne agency admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "password123"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    # Not critical if fails - some tests will be skipped
    return None


class TestTopClientsEndpoint:
    """Tests for GET /api/admin/stats/top-clients"""

    def test_top_clients_super_admin(self, api_client, super_admin_token):
        """Super admin can access top clients (global view)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/top-clients",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Verify structure of top client item
            client = data[0]
            assert "id" in client, "Client should have id"
            assert "name" in client, "Client should have name"
            assert "email" in client, "Client should have email"
            assert "total_spent" in client, "Client should have total_spent"
            assert "bookings" in client, "Client should have bookings"
            assert "rating" in client, "Client should have rating"
            
            # Verify data types
            assert isinstance(client["total_spent"], (int, float)), "total_spent should be numeric"
            assert isinstance(client["bookings"], int), "bookings should be int"
            print(f"Top client: {client['name']} - {client['total_spent']} CHF - {client['bookings']} bookings")

    def test_top_clients_agency_admin(self, api_client, geneva_admin_token):
        """Agency admin can access top clients (scoped to agency)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/top-clients",
            headers={"Authorization": f"Bearer {geneva_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Geneva agency has {len(data)} top clients")

    def test_top_clients_unauthorized(self, api_client):
        """Unauthorized request should fail"""
        response = api_client.get(f"{BASE_URL}/api/admin/stats/top-clients")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAgencyComparisonEndpoint:
    """Tests for GET /api/admin/stats/agency-comparison (super admin only)"""

    def test_agency_comparison_super_admin(self, api_client, super_admin_token):
        """Super admin can access agency comparison"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/agency-comparison",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            agency = data[0]
            assert "id" in agency, "Agency should have id"
            assert "name" in agency, "Agency should have name"
            assert "revenue" in agency, "Agency should have revenue"
            assert "bookings" in agency, "Agency should have bookings"
            assert "vehicles" in agency, "Agency should have vehicles"
            
            # Verify data types
            assert isinstance(agency["revenue"], (int, float)), "revenue should be numeric"
            assert isinstance(agency["bookings"], int), "bookings should be int"
            assert isinstance(agency["vehicles"], int), "vehicles should be int"
            print(f"Top agency: {agency['name']} - {agency['revenue']} CHF - {agency['bookings']} bookings - {agency['vehicles']} vehicles")

    def test_agency_comparison_agency_admin_forbidden(self, api_client, geneva_admin_token):
        """Agency admin should get 403 - super admin only"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/agency-comparison",
            headers={"Authorization": f"Bearer {geneva_admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"

    def test_agency_comparison_unauthorized(self, api_client):
        """Unauthorized request should fail"""
        response = api_client.get(f"{BASE_URL}/api/admin/stats/agency-comparison")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestRevenueForecastEndpoint:
    """Tests for GET /api/admin/stats/revenue-forecast (AI-powered with GPT-5.2)"""

    def test_revenue_forecast_super_admin(self, api_client, super_admin_token):
        """Super admin can access AI revenue forecast"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/revenue-forecast",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            timeout=60  # AI call may take longer
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        assert "historical" in data, "Response should have historical data"
        assert "forecast" in data, "Response should have forecast data"
        assert "analysis" in data, "Response should have analysis string"
        assert "trend" in data, "Response should have trend"
        assert "total_vehicles" in data, "Response should have total_vehicles"
        assert "avg_daily_price" in data, "Response should have avg_daily_price"
        
        # Verify historical data structure
        assert isinstance(data["historical"], list), "historical should be a list"
        if len(data["historical"]) > 0:
            hist_item = data["historical"][0]
            assert "month" in hist_item, "Historical item should have month"
            assert "revenue" in hist_item, "Historical item should have revenue"
            assert "bookings" in hist_item, "Historical item should have bookings"
            print(f"Historical data: {len(data['historical'])} months")
        
        # Verify forecast data structure
        assert isinstance(data["forecast"], list), "forecast should be a list"
        if len(data["forecast"]) > 0:
            forecast_item = data["forecast"][0]
            assert "month" in forecast_item, "Forecast item should have month"
            assert "revenue" in forecast_item, "Forecast item should have revenue"
            assert "bookings" in forecast_item, "Forecast item should have bookings"
            assert "confidence" in forecast_item, "Forecast item should have confidence"
            print(f"Forecast data: {len(data['forecast'])} months predicted")
        
        # Verify trend
        assert data["trend"] in ["up", "down", "stable"], f"Invalid trend: {data['trend']}"
        
        # Verify analysis is string
        assert isinstance(data["analysis"], str), "analysis should be a string"
        
        print(f"Trend: {data['trend']}")
        print(f"Analysis: {data['analysis'][:100]}..." if len(data['analysis']) > 100 else f"Analysis: {data['analysis']}")
        print(f"Total vehicles: {data['total_vehicles']}, Avg daily price: {data['avg_daily_price']}")

    def test_revenue_forecast_agency_admin(self, api_client, geneva_admin_token):
        """Agency admin can access revenue forecast (scoped to agency)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/revenue-forecast",
            headers={"Authorization": f"Bearer {geneva_admin_token}"},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "historical" in data
        assert "forecast" in data
        assert "analysis" in data
        assert "trend" in data
        print(f"Geneva agency forecast - Trend: {data['trend']}, Historical months: {len(data['historical'])}")

    def test_revenue_forecast_unauthorized(self, api_client):
        """Unauthorized request should fail"""
        response = api_client.get(f"{BASE_URL}/api/admin/stats/revenue-forecast")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestBasicStatsEndpoint:
    """Tests for GET /api/admin/stats - Basic stats including revenue_by_month"""

    def test_basic_stats_super_admin(self, api_client, super_admin_token):
        """Super admin can access basic stats"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        assert "total_vehicles" in data
        assert "total_users" in data
        assert "total_reservations" in data
        assert "total_revenue" in data
        assert "revenue_by_month" in data
        assert "reservations_by_status" in data
        assert "top_vehicles" in data
        
        # Verify revenue_by_month structure
        assert isinstance(data["revenue_by_month"], list)
        if len(data["revenue_by_month"]) > 0:
            month_item = data["revenue_by_month"][0]
            assert "month" in month_item
            assert "revenue" in month_item
            assert "reservations" in month_item
            
        print(f"Total revenue: {data['total_revenue']}, Vehicles: {data['total_vehicles']}, Users: {data['total_users']}")
        print(f"Revenue by month data points: {len(data['revenue_by_month'])}")

    def test_basic_stats_agency_admin(self, api_client, geneva_admin_token):
        """Agency admin can access basic stats (scoped)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {geneva_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_vehicles" in data
        assert "revenue_by_month" in data
        print(f"Geneva agency - Vehicles: {data['total_vehicles']}, Revenue: {data['total_revenue']}")


class TestAdvancedStatsEndpoint:
    """Tests for GET /api/admin/stats/advanced"""

    def test_advanced_stats_super_admin(self, api_client, super_admin_token):
        """Super admin can access advanced stats"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        assert "revenue_this_month" in data
        assert "revenue_last_month" in data
        assert "revenue_change_pct" in data
        assert "avg_booking_duration" in data
        assert "avg_revenue_per_reservation" in data
        assert "vehicle_utilization" in data
        assert "revenue_per_vehicle" in data
        assert "daily_revenue" in data
        assert "payment_methods" in data
        assert "cancellation_rate" in data
        assert "weekly_trends" in data
        
        # Verify numeric types
        assert isinstance(data["revenue_this_month"], (int, float))
        assert isinstance(data["revenue_change_pct"], (int, float))
        assert isinstance(data["cancellation_rate"], (int, float))
        
        print(f"Revenue this month: {data['revenue_this_month']}, Change: {data['revenue_change_pct']}%")
        print(f"Avg booking duration: {data['avg_booking_duration']} days")
        print(f"Cancellation rate: {data['cancellation_rate']}%")

    def test_advanced_stats_agency_admin(self, api_client, geneva_admin_token):
        """Agency admin can access advanced stats (scoped)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats/advanced",
            headers={"Authorization": f"Bearer {geneva_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "revenue_this_month" in data
        assert "daily_revenue" in data
        print(f"Geneva agency advanced stats - Revenue this month: {data['revenue_this_month']}")


class TestLoginCredentials:
    """Verify all login credentials work"""

    def test_super_admin_login(self, api_client):
        """Super admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Super admin login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data or "token" in data
        print("Super admin login: SUCCESS")

    def test_geneva_admin_login(self, api_client):
        """Geneva agency admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin-geneva@logirent.ch",
            "password": "LogiRent2024"
        })
        assert response.status_code == 200, f"Geneva admin login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data or "token" in data
        print("Geneva admin login: SUCCESS")

    def test_lausanne_admin_login(self, api_client):
        """Lausanne agency admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "password123"
        })
        # This may or may not exist
        if response.status_code == 200:
            print("Lausanne admin login: SUCCESS")
        else:
            pytest.skip("Lausanne admin credentials may not exist")
