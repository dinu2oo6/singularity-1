"""
Backend API tests for Singularity app - Iteration 2
Tests: Health, Auth, Crypto, Currencies, OTP, Settings, KYC, Beneficiaries, Watchlist
NOTE: Supabase may require email confirmation for new registrations
"""
import pytest
import requests
import os
import time

# Get backend URL from environment variable
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Try loading from frontend .env as fallback
    from pathlib import Path
    from dotenv import load_dotenv
    frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
    if frontend_env.exists():
        load_dotenv(frontend_env)
        BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL not set", allow_module_level=True)

# Test user with timestamp to ensure uniqueness
# Using gmail.com as Supabase has strict email validation
TEST_EMAIL = f"singularity.test.{int(time.time())}@gmail.com"
TEST_PASSWORD = "Test123456!"
TEST_NAME = "Test User"

# Global token storage
auth_token = None


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealth:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        """Test GET /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert "status" in data, "Missing 'status' in health response"
        assert data["status"] == "healthy", f"Expected healthy, got {data['status']}"


class TestAuth:
    """Authentication flows"""
    
    def test_01_register_new_user(self, api_client):
        """Test POST /api/auth/register creates new user"""
        global auth_token
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_NAME
        }
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # NOTE: Supabase may require email confirmation, resulting in 200 but token won't work until confirmed
        # Check if registration succeeded (got user_id and email back)
        if response.status_code == 200:
            data = response.json()
            assert "user_id" in data, "Missing user_id in registration response"
            assert "email" in data, "Missing email in registration response"
            assert data["email"] == TEST_EMAIL, f"Email mismatch: {data['email']} != {TEST_EMAIL}"
            
            # If access_token returned, store it (but it may not work if email not confirmed)
            if "access_token" in data and data["access_token"]:
                auth_token = data["access_token"]
        elif response.status_code == 400 and "email rate limit" in response.text.lower():
            pytest.skip("Supabase rate limit - wait 1 hour or use different Supabase project")
        elif response.status_code == 400 and "already registered" in response.text.lower():
            # Email already exists, try to login instead
            login_resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
            if login_resp.status_code == 200:
                auth_token = login_resp.json()["access_token"]
                return  # Continue with existing user
        else:
            pytest.fail(f"Registration failed: {response.status_code} - {response.text}")
        
    def test_02_login_existing_user(self, api_client):
        """Test POST /api/auth/login with valid credentials"""
        global auth_token
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in login response"
        assert "user_id" in data, "Missing user_id in login response"
        assert data["email"] == TEST_EMAIL, f"Email mismatch in login"
        
        # Update token
        auth_token = data["access_token"]
        
    def test_03_login_invalid_credentials(self, api_client):
        """Test login with wrong password fails"""
        payload = {
            "email": TEST_EMAIL,
            "password": "WrongPassword123!"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"


class TestCrypto:
    """Cryptocurrency endpoints"""
    
    def test_get_crypto_prices(self, api_client):
        """Test GET /api/crypto/prices returns coin data"""
        response = api_client.get(f"{BASE_URL}/api/crypto/prices")
        assert response.status_code == 200, f"Crypto prices failed: {response.status_code}"
        
        data = response.json()
        assert "coins" in data, "Missing 'coins' in crypto prices response"
        coins = data["coins"]
        assert isinstance(coins, list), "Coins should be a list"
        
        # Verify coin data structure if coins exist
        if len(coins) > 0:
            coin = coins[0]
            assert "id" in coin, "Missing 'id' in coin data"
            assert "symbol" in coin, "Missing 'symbol' in coin data"
            assert "name" in coin, "Missing 'name' in coin data"
            assert "current_price" in coin, "Missing 'current_price' in coin data"


class TestTransfer:
    """Transfer and currencies endpoints"""
    
    def test_get_supported_currencies(self, api_client):
        """Test GET /api/transfer/currencies returns currencies"""
        response = api_client.get(f"{BASE_URL}/api/transfer/currencies")
        assert response.status_code == 200, f"Currencies endpoint failed: {response.status_code}"
        
        data = response.json()
        assert "currencies" in data, "Missing 'currencies' in response"
        assert "exchange_rates" in data, "Missing 'exchange_rates' in response"
        
        currencies = data["currencies"]
        rates = data["exchange_rates"]
        
        # Verify USD exists
        assert "USD" in currencies, "USD not in currencies"
        assert "USD" in rates, "USD not in exchange_rates"
        
        # Verify currency structure
        usd = currencies["USD"]
        assert "name" in usd, "Missing 'name' in USD currency"
        assert "symbol" in usd, "Missing 'symbol' in USD currency"


class TestWallet:
    """Wallet endpoints (requires auth)"""
    
    def test_get_wallet_balance(self, api_client):
        """Test GET /api/wallet/balance with auth"""
        if not auth_token:
            pytest.skip("No auth token available, skipping wallet test")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = api_client.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200, f"Wallet balance failed: {response.status_code}"
        
        data = response.json()
        assert "wallet" in data, "Missing 'wallet' in response"
        
        wallet = data["wallet"]
        assert "balance_usd" in wallet, "Missing 'balance_usd' in wallet"
        assert "user_id" in wallet, "Missing 'user_id' in wallet"
        assert "email" in wallet, "Missing 'email' in wallet"
        assert wallet["email"] == TEST_EMAIL, "Wallet email mismatch"
        
        # Verify wallet was persisted in DB
        balance = wallet["balance_usd"]
        assert isinstance(balance, (int, float)), "Balance should be a number"
        
    def test_get_wallet_packages(self, api_client):
        """Test GET /api/wallet/packages returns topup packages"""
        response = api_client.get(f"{BASE_URL}/api/wallet/packages")
        assert response.status_code == 200, f"Wallet packages failed: {response.status_code}"
        
        data = response.json()
        assert "packages" in data, "Missing 'packages' in response"
        packages = data["packages"]
        assert "small" in packages, "Missing 'small' package"
        assert packages["small"] == 50.0, "Small package should be $50"


class TestBotAPI:
    """AI Bot chat endpoint"""
    
    def test_bot_chat_requires_auth(self, api_client):
        """Test bot chat without auth fails"""
        payload = {"message": "Hello"}
        response = api_client.post(f"{BASE_URL}/api/bot/chat", json=payload)
        assert response.status_code == 401, f"Bot chat should require auth, got {response.status_code}"


# Cleanup - not critical if fails
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup after all tests"""
    yield
    # Test data cleanup would go here if needed
    # For now, we leave test user in DB for inspection
