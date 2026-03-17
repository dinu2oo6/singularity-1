from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from supabase import create_client
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'singularity_db')]

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL else None

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
COINGECKO_BASE = "https://api.coingecko.com/api/v3"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

chat_sessions: Dict[str, LlmChat] = {}

# Simple cache for CoinGecko to avoid rate limits
_price_cache: Dict[str, any] = {"data": None, "ts": 0}
CACHE_TTL = 120  # seconds - increase to 2 minutes

# Fallback crypto data when CoinGecko is rate-limited
FALLBACK_COINS = [
    {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin", "image": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", "current_price": 97000, "market_cap": 1920000000000, "price_change_1h": 0.1, "price_change_24h": 1.2, "price_change_7d": -2.1, "sparkline": [96000+i*50 for i in range(168)], "high_24h": 98500, "low_24h": 95200, "total_volume": 42000000000},
    {"id": "ethereum", "symbol": "ETH", "name": "Ethereum", "image": "https://assets.coingecko.com/coins/images/279/large/ethereum.png", "current_price": 2680, "market_cap": 322000000000, "price_change_1h": 0.3, "price_change_24h": 2.5, "price_change_7d": -5.1, "sparkline": [2600+i*0.5 for i in range(168)], "high_24h": 2750, "low_24h": 2580, "total_volume": 18000000000},
    {"id": "solana", "symbol": "SOL", "name": "Solana", "image": "https://assets.coingecko.com/coins/images/4128/large/solana.png", "current_price": 195, "market_cap": 94000000000, "price_change_1h": -0.2, "price_change_24h": 3.8, "price_change_7d": -8.3, "sparkline": [190+i*0.03 for i in range(168)], "high_24h": 203, "low_24h": 188, "total_volume": 4200000000},
    {"id": "ripple", "symbol": "XRP", "name": "XRP", "image": "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", "current_price": 2.45, "market_cap": 141000000000, "price_change_1h": 0.5, "price_change_24h": -1.3, "price_change_7d": -12.5, "sparkline": [2.4+i*0.0003 for i in range(168)], "high_24h": 2.58, "low_24h": 2.32, "total_volume": 8500000000},
    {"id": "cardano", "symbol": "ADA", "name": "Cardano", "image": "https://assets.coingecko.com/coins/images/975/large/cardano.png", "current_price": 0.72, "market_cap": 25600000000, "price_change_1h": 0.1, "price_change_24h": 4.2, "price_change_7d": -6.8, "sparkline": [0.7+i*0.0001 for i in range(168)], "high_24h": 0.76, "low_24h": 0.68, "total_volume": 980000000},
    {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin", "image": "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", "current_price": 0.25, "market_cap": 37000000000, "price_change_1h": -0.4, "price_change_24h": 1.8, "price_change_7d": -9.1, "sparkline": [0.24+i*0.00006 for i in range(168)], "high_24h": 0.27, "low_24h": 0.23, "total_volume": 3200000000},
    {"id": "polkadot", "symbol": "DOT", "name": "Polkadot", "image": "https://assets.coingecko.com/coins/images/12171/large/polkadot.png", "current_price": 4.85, "market_cap": 7400000000, "price_change_1h": 0.2, "price_change_24h": -0.5, "price_change_7d": -14.2, "sparkline": [4.8+i*0.0003 for i in range(168)], "high_24h": 5.12, "low_24h": 4.62, "total_volume": 280000000},
    {"id": "avalanche-2", "symbol": "AVAX", "name": "Avalanche", "image": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png", "current_price": 22.50, "market_cap": 9200000000, "price_change_1h": 0.6, "price_change_24h": 5.2, "price_change_7d": -7.6, "sparkline": [22+i*0.003 for i in range(168)], "high_24h": 24.10, "low_24h": 21.30, "total_volume": 520000000},
    {"id": "chainlink", "symbol": "LINK", "name": "Chainlink", "image": "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png", "current_price": 15.80, "market_cap": 10100000000, "price_change_1h": 0.3, "price_change_24h": 2.1, "price_change_7d": -11.3, "sparkline": [15.5+i*0.002 for i in range(168)], "high_24h": 16.50, "low_24h": 14.90, "total_volume": 680000000},
    {"id": "polygon-ecosystem-token", "symbol": "POL", "name": "Polygon", "image": "https://assets.coingecko.com/coins/images/32440/large/polygon.png", "current_price": 0.28, "market_cap": 2800000000, "price_change_1h": -0.1, "price_change_24h": -2.3, "price_change_7d": -15.8, "sparkline": [0.27+i*0.00006 for i in range(168)], "high_24h": 0.31, "low_24h": 0.26, "total_volume": 190000000},
]

# ============== MODELS ==============
class AuthRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class WalletTopupRequest(BaseModel):
    amount: float
    origin_url: str

class TransferRequest(BaseModel):
    recipient_email: str
    amount: float
    from_currency: str = "USD"
    to_currency: str = "USD"
    recipient_country: str = "US"
    note: Optional[str] = None
    method: str = "singularity"  # singularity, paypal, bank, interac
    otp_code: Optional[str] = None

class CryptoTradeRequest(BaseModel):
    coin_id: str
    amount_usd: float
    action: str

class BotChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class BeneficiaryRequest(BaseModel):
    name: str
    email: str
    country: str = "US"
    currency: str = "USD"
    method: str = "singularity"

class WatchlistRequest(BaseModel):
    coin_id: str
    symbol: str
    name: str

class KYCRequest(BaseModel):
    full_name: str
    date_of_birth: str
    nationality: str
    id_type: str  # passport, drivers_license, national_id
    id_number: str
    address: str
    city: str
    country: str
    postal_code: str

class ScheduledTransferRequest(BaseModel):
    recipient_email: str
    amount: float
    from_currency: str = "USD"
    to_currency: str = "USD"
    frequency: str  # daily, weekly, biweekly, monthly
    start_date: str
    method: str = "singularity"

class SettingsUpdate(BaseModel):
    two_factor_enabled: Optional[bool] = None
    passcode: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    biometric_enabled: Optional[bool] = None
    default_currency: Optional[str] = None
    default_transfer_method: Optional[str] = None
    auto_lock_minutes: Optional[int] = None
    hide_balance: Optional[bool] = None
    email_alerts: Optional[bool] = None
    push_alerts: Optional[bool] = None
    trade_alerts: Optional[bool] = None
    price_alerts: Optional[bool] = None
    language: Optional[str] = None
    theme: Optional[str] = None

class OTPRequest(BaseModel):
    purpose: str = "transfer"  # transfer, login, settings

# ============== CONSTANTS ==============
SUPPORTED_CURRENCIES = {
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "US"},
    "EUR": {"name": "Euro", "symbol": "\u20ac", "flag": "EU"},
    "GBP": {"name": "British Pound", "symbol": "\u00a3", "flag": "GB"},
    "INR": {"name": "Indian Rupee", "symbol": "\u20b9", "flag": "IN"},
    "JPY": {"name": "Japanese Yen", "symbol": "\u00a5", "flag": "JP"},
    "CAD": {"name": "Canadian Dollar", "symbol": "C$", "flag": "CA"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "AU"},
    "MXN": {"name": "Mexican Peso", "symbol": "Mex$", "flag": "MX"},
    "PHP": {"name": "Philippine Peso", "symbol": "\u20b1", "flag": "PH"},
    "BRL": {"name": "Brazilian Real", "symbol": "R$", "flag": "BR"},
    "NGN": {"name": "Nigerian Naira", "symbol": "\u20a6", "flag": "NG"},
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh", "flag": "KE"},
    "CNY": {"name": "Chinese Yuan", "symbol": "\u00a5", "flag": "CN"},
    "KRW": {"name": "South Korean Won", "symbol": "\u20a9", "flag": "KR"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "flag": "SG"},
    "AED": {"name": "UAE Dirham", "symbol": "AED", "flag": "AE"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF", "flag": "CH"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "flag": "ZA"},
}

EXCHANGE_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "INR": 83.12, "JPY": 149.50,
    "CAD": 1.36, "AUD": 1.53, "MXN": 17.15, "PHP": 55.80, "BRL": 4.97,
    "NGN": 1550.0, "KES": 153.50, "CNY": 7.24, "KRW": 1320.0, "SGD": 1.34,
    "AED": 3.67, "CHF": 0.88, "ZAR": 18.60,
}

# ============== HELPERS ==============
async def get_user_from_token(authorization: str = None):
    if not authorization or not supabase:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def ensure_wallet(user_id: str, email: str):
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "email": email,
            "balance_usd": 0.0,
            "preferred_currency": "USD",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)
    return wallet

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_passcode(passcode: str) -> str:
    return hashlib.sha256(passcode.encode()).hexdigest()

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register")
async def register(req: AuthRequest):
    try:
        result = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"full_name": req.full_name or ""}}
        })
        if result.user:
            await ensure_wallet(result.user.id, req.email)
            # Create default settings
            await db.user_settings.update_one(
                {"user_id": result.user.id},
                {"$setOnInsert": {
                    "user_id": result.user.id,
                    "two_factor_enabled": False,
                    "notifications_enabled": True,
                    "biometric_enabled": False,
                    "passcode_hash": None,
                    "recovery_codes": [],
                    "kyc_status": "not_started",
                    "transfer_limit": 500.0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
            return {
                "user_id": result.user.id,
                "email": result.user.email,
                "full_name": req.full_name or "",
                "access_token": result.session.access_token if result.session else None,
                "refresh_token": result.session.refresh_token if result.session else None,
            }
        raise HTTPException(status_code=400, detail="Registration failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/login")
async def login(req: AuthRequest):
    try:
        result = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        if result.user and result.session:
            await ensure_wallet(result.user.id, req.email)
            return {
                "user_id": result.user.id,
                "email": result.user.email,
                "full_name": result.user.user_metadata.get("full_name", ""),
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail=str(e))

@api_router.get("/auth/me")
async def get_me(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    wallet = await ensure_wallet(user.id, user.email)
    settings = await db.user_settings.find_one({"user_id": user.id}, {"_id": 0})
    return {"user_id": user.id, "email": user.email, "full_name": user.user_metadata.get("full_name", ""), "wallet": wallet, "settings": settings}

# ============== OTP ROUTES ==============
@api_router.post("/auth/otp/send")
async def send_otp(req: OTPRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    code = generate_otp()
    await db.otp_codes.delete_many({"user_id": user.id, "purpose": req.purpose})
    await db.otp_codes.insert_one({
        "user_id": user.id,
        "code": code,
        "purpose": req.purpose,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
    })
    # In production, send via email/SMS. For now, return it (demo mode)
    logger.info(f"OTP for {user.email}: {code}")
    return {"message": "OTP sent to your email", "otp_preview": code}

@api_router.post("/auth/otp/verify")
async def verify_otp(code: str, purpose: str = "transfer", authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    otp = await db.otp_codes.find_one(
        {"user_id": user.id, "code": code, "purpose": purpose, "verified": False},
        {"_id": 0}
    )
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    if datetime.fromisoformat(otp["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    await db.otp_codes.update_one(
        {"user_id": user.id, "code": code},
        {"$set": {"verified": True}}
    )
    return {"verified": True}

# ============== WALLET ROUTES ==============
@api_router.get("/wallet/balance")
async def get_wallet(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    wallet = await ensure_wallet(user.id, user.email)
    portfolio = await db.crypto_portfolio.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    return {"wallet": wallet, "crypto_portfolio": portfolio}

@api_router.post("/wallet/topup")
async def topup_wallet(req: WalletTopupRequest, request: Request, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    if req.amount < 1.0 or req.amount > 10000.0:
        raise HTTPException(status_code=400, detail="Amount must be between $1 and $10,000")
    
    amount = round(req.amount, 2)
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/wallet?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/wallet"
    
    checkout_req = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user.id, "email": user.email, "type": "wallet_topup"}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user.id,
        "email": user.email,
        "amount": amount,
        "currency": "usd",
        "type": "wallet_topup",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/wallet/topup/status/{session_id}")
async def check_topup_status(session_id: str, request: Request, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user.id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if status.payment_status == "paid" and tx.get("payment_status") != "completed":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.wallets.update_one(
            {"user_id": user.id},
            {"$inc": {"balance_usd": tx["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user.id, "type": "topup",
            "amount": tx["amount"], "currency": "USD", "status": "completed",
            "description": f"Wallet top-up ${tx['amount']:.2f}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"status": status.status, "payment_status": status.payment_status, "amount": status.amount_total / 100 if status.amount_total else 0}

# ============== WATCHLIST ==============
@api_router.get("/wallet/watchlist")
async def get_watchlist(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    items = await db.watchlist.find({"user_id": user.id}, {"_id": 0}).to_list(50)
    return {"watchlist": items}

@api_router.post("/wallet/watchlist")
async def add_to_watchlist(req: WatchlistRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    existing = await db.watchlist.find_one({"user_id": user.id, "coin_id": req.coin_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    await db.watchlist.insert_one({
        "id": str(uuid.uuid4()), "user_id": user.id,
        "coin_id": req.coin_id, "symbol": req.symbol, "name": req.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": "Added to watchlist"}

@api_router.delete("/wallet/watchlist/{coin_id}")
async def remove_from_watchlist(coin_id: str, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    await db.watchlist.delete_one({"user_id": user.id, "coin_id": coin_id})
    return {"message": "Removed from watchlist"}

# ============== BENEFICIARIES ==============
@api_router.get("/transfer/beneficiaries")
async def get_beneficiaries(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    items = await db.beneficiaries.find({"user_id": user.id}, {"_id": 0}).to_list(50)
    return {"beneficiaries": items}

@api_router.post("/transfer/beneficiaries")
async def add_beneficiary(req: BeneficiaryRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    await db.beneficiaries.insert_one({
        "id": str(uuid.uuid4()), "user_id": user.id,
        "name": req.name, "email": req.email, "country": req.country,
        "currency": req.currency, "method": req.method,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": "Beneficiary added"}

@api_router.delete("/transfer/beneficiaries/{beneficiary_id}")
async def remove_beneficiary(beneficiary_id: str, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    await db.beneficiaries.delete_one({"user_id": user.id, "id": beneficiary_id})
    return {"message": "Beneficiary removed"}

# ============== TRANSFER ROUTES ==============
@api_router.post("/transfer/send")
async def send_transfer(req: TransferRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    wallet = await ensure_wallet(user.id, user.email)
    settings = await db.user_settings.find_one({"user_id": user.id}, {"_id": 0})
    
    # Check OTP for transfers
    if req.otp_code:
        otp = await db.otp_codes.find_one(
            {"user_id": user.id, "code": req.otp_code, "purpose": "transfer", "verified": True},
            {"_id": 0}
        )
        if not otp:
            raise HTTPException(status_code=400, detail="Invalid or unverified OTP")
    
    rate_from = EXCHANGE_RATES.get(req.from_currency, 1.0)
    amount_usd = req.amount / rate_from
    
    if wallet["balance_usd"] < amount_usd:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Check KYC limits
    if settings and settings.get("kyc_status") != "approved" and amount_usd > 500:
        raise HTTPException(status_code=400, detail="KYC required for transfers above $500")
    
    rate_to = EXCHANGE_RATES.get(req.to_currency, 1.0)
    received_amount = amount_usd * rate_to
    
    await db.wallets.update_one(
        {"user_id": user.id},
        {"$inc": {"balance_usd": -amount_usd}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    recipient_wallet = await db.wallets.find_one({"email": req.recipient_email}, {"_id": 0})
    if recipient_wallet:
        await db.wallets.update_one(
            {"email": req.recipient_email},
            {"$inc": {"balance_usd": amount_usd}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Auto-add as beneficiary
    existing_ben = await db.beneficiaries.find_one({"user_id": user.id, "email": req.recipient_email})
    if not existing_ben:
        await db.beneficiaries.insert_one({
            "id": str(uuid.uuid4()), "user_id": user.id,
            "name": req.recipient_email.split("@")[0], "email": req.recipient_email,
            "country": req.recipient_country, "currency": req.to_currency,
            "method": req.method, "created_at": datetime.now(timezone.utc).isoformat(),
        })
    
    transfer = {
        "id": str(uuid.uuid4()), "user_id": user.id, "type": "send",
        "recipient_email": req.recipient_email, "amount": req.amount,
        "from_currency": req.from_currency, "to_currency": req.to_currency,
        "amount_usd": round(amount_usd, 2), "received_amount": round(received_amount, 2),
        "recipient_country": req.recipient_country,
        "exchange_rate": round(rate_to / rate_from, 4),
        "fee": 0.0, "method": req.method, "status": "completed",
        "note": req.note, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(transfer)
    transfer.pop("_id", None)
    return {"transfer": transfer}

@api_router.get("/transfer/history")
async def get_transfer_history(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    txs = await db.transactions.find({"user_id": user.id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"transactions": txs}

@api_router.get("/transfer/currencies")
async def get_currencies():
    return {"currencies": SUPPORTED_CURRENCIES, "exchange_rates": EXCHANGE_RATES}

# ============== SCHEDULED TRANSFERS ==============
@api_router.post("/transfer/schedule")
async def schedule_transfer(req: ScheduledTransferRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    schedule = {
        "id": str(uuid.uuid4()), "user_id": user.id,
        "recipient_email": req.recipient_email, "amount": req.amount,
        "from_currency": req.from_currency, "to_currency": req.to_currency,
        "frequency": req.frequency, "method": req.method,
        "start_date": req.start_date, "next_execution": req.start_date,
        "status": "active", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.scheduled_transfers.insert_one(schedule)
    schedule.pop("_id", None)
    return {"schedule": schedule}

@api_router.get("/transfer/schedules")
async def get_schedules(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    schedules = await db.scheduled_transfers.find({"user_id": user.id}, {"_id": 0}).to_list(50)
    return {"schedules": schedules}

@api_router.delete("/transfer/schedule/{schedule_id}")
async def cancel_schedule(schedule_id: str, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    await db.scheduled_transfers.update_one(
        {"user_id": user.id, "id": schedule_id},
        {"$set": {"status": "cancelled"}}
    )
    return {"message": "Schedule cancelled"}

# ============== KYC ==============
@api_router.post("/kyc/submit")
async def submit_kyc(req: KYCRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    await db.kyc_submissions.update_one(
        {"user_id": user.id},
        {"$set": {
            "user_id": user.id, "full_name": req.full_name,
            "date_of_birth": req.date_of_birth, "nationality": req.nationality,
            "id_type": req.id_type, "id_number": req.id_number,
            "address": req.address, "city": req.city,
            "country": req.country, "postal_code": req.postal_code,
            "status": "pending", "submitted_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    # Auto-approve for demo
    await db.user_settings.update_one(
        {"user_id": user.id},
        {"$set": {"kyc_status": "approved", "transfer_limit": 50000.0}}
    )
    return {"status": "approved", "message": "KYC verification approved. Transfer limit increased to $50,000"}

@api_router.get("/kyc/status")
async def get_kyc_status(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    kyc = await db.kyc_submissions.find_one({"user_id": user.id}, {"_id": 0})
    settings = await db.user_settings.find_one({"user_id": user.id}, {"_id": 0})
    return {
        "kyc": kyc,
        "status": settings.get("kyc_status", "not_started") if settings else "not_started",
        "transfer_limit": settings.get("transfer_limit", 500.0) if settings else 500.0,
    }

# ============== SETTINGS ==============
@api_router.get("/settings")
async def get_settings(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    settings = await db.user_settings.find_one({"user_id": user.id}, {"_id": 0})
    if not settings:
        settings = {
            "user_id": user.id, "two_factor_enabled": False,
            "notifications_enabled": True, "biometric_enabled": False,
            "passcode_hash": None, "kyc_status": "not_started", "transfer_limit": 500.0,
        }
        await db.user_settings.insert_one({**settings, "created_at": datetime.now(timezone.utc).isoformat()})
    safe = {k: v for k, v in settings.items() if k not in ["passcode_hash", "recovery_codes"]}
    safe["has_passcode"] = bool(settings.get("passcode_hash"))
    safe["has_recovery_codes"] = bool(settings.get("recovery_codes"))
    return {"settings": safe}

@api_router.put("/settings")
async def update_settings(req: SettingsUpdate, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    update = {}
    for field in ['two_factor_enabled', 'notifications_enabled', 'biometric_enabled', 'email_alerts', 'push_alerts', 'trade_alerts', 'price_alerts', 'hide_balance', 'default_currency', 'default_transfer_method', 'language', 'theme']:
        val = getattr(req, field, None)
        if val is not None:
            update[field] = val
    if req.auto_lock_minutes is not None:
        update['auto_lock_minutes'] = req.auto_lock_minutes
    if req.passcode:
        update["passcode_hash"] = hash_passcode(req.passcode)
    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.user_settings.update_one({"user_id": user.id}, {"$set": update}, upsert=True)
    return {"message": "Settings updated"}

@api_router.post("/settings/recovery-codes")
async def generate_recovery_codes(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    codes = [''.join(random.choices(string.ascii_uppercase + string.digits, k=8)) for _ in range(8)]
    await db.user_settings.update_one(
        {"user_id": user.id},
        {"$set": {"recovery_codes": [hash_passcode(c) for c in codes], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"codes": codes, "message": "Save these codes securely. They cannot be retrieved again."}

# ============== CRYPTO ROUTES ==============
@api_router.get("/crypto/prices")
async def get_crypto_prices():
    import time
    now = time.time()
    if _price_cache["data"] and (now - _price_cache["ts"]) < CACHE_TTL:
        return {"coins": _price_cache["data"]}
    try:
        async with httpx.AsyncClient(timeout=15) as hclient:
            resp = await hclient.get(
                f"{COINGECKO_BASE}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "ids": "bitcoin,ethereum,solana,cardano,ripple,polkadot,dogecoin,avalanche-2,chainlink,polygon-ecosystem-token",
                    "order": "market_cap_desc",
                    "sparkline": "true",
                    "price_change_percentage": "1h,24h,7d"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                coins = []
                for c in data:
                    coins.append({
                        "id": c.get("id"),
                        "symbol": c.get("symbol", "").upper(),
                        "name": c.get("name"),
                        "image": c.get("image"),
                        "current_price": c.get("current_price", 0),
                        "market_cap": c.get("market_cap", 0),
                        "price_change_1h": c.get("price_change_percentage_1h_in_currency", 0),
                        "price_change_24h": c.get("price_change_percentage_24h", 0),
                        "price_change_7d": c.get("price_change_percentage_7d_in_currency", 0),
                        "sparkline": c.get("sparkline_in_7d", {}).get("price", []),
                        "high_24h": c.get("high_24h", 0),
                        "low_24h": c.get("low_24h", 0),
                        "total_volume": c.get("total_volume", 0),
                    })
                _price_cache["data"] = coins
                _price_cache["ts"] = now
                return {"coins": coins}
            logger.warning(f"CoinGecko returned {resp.status_code}")
            if _price_cache["data"]:
                return {"coins": _price_cache["data"]}
            return {"coins": FALLBACK_COINS}
    except Exception as e:
        logger.error(f"CoinGecko error: {e}")
        if _price_cache["data"]:
            return {"coins": _price_cache["data"]}
        return {"coins": FALLBACK_COINS}

@api_router.get("/crypto/chart/{coin_id}")
async def get_crypto_chart(coin_id: str, days: int = 7):
    try:
        async with httpx.AsyncClient(timeout=15) as hclient:
            resp = await hclient.get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params={"vs_currency": "usd", "days": days})
            if resp.status_code == 200:
                return resp.json()
            return {"prices": []}
    except Exception as e:
        logger.error(f"Chart error: {e}")
        return {"prices": []}

@api_router.post("/crypto/trade")
async def trade_crypto(req: CryptoTradeRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    wallet = await ensure_wallet(user.id, user.email)
    
    try:
        async with httpx.AsyncClient(timeout=10) as hclient:
            resp = await hclient.get(f"{COINGECKO_BASE}/simple/price", params={"ids": req.coin_id, "vs_currencies": "usd"})
            prices = resp.json()
            current_price = prices.get(req.coin_id, {}).get("usd", 0)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not fetch price")
    
    if current_price <= 0:
        raise HTTPException(status_code=400, detail="Invalid coin or price unavailable")
    
    coin_amount = req.amount_usd / current_price
    
    if req.action == "buy":
        if wallet["balance_usd"] < req.amount_usd:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        await db.wallets.update_one(
            {"user_id": user.id},
            {"$inc": {"balance_usd": -req.amount_usd}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        existing = await db.crypto_portfolio.find_one({"user_id": user.id, "coin_id": req.coin_id}, {"_id": 0})
        if existing:
            new_amount = existing["amount"] + coin_amount
            new_invested = existing["total_invested_usd"] + req.amount_usd
            await db.crypto_portfolio.update_one(
                {"user_id": user.id, "coin_id": req.coin_id},
                {"$set": {"amount": new_amount, "total_invested_usd": new_invested, "avg_buy_price": new_invested / new_amount, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.crypto_portfolio.insert_one({
                "id": str(uuid.uuid4()), "user_id": user.id, "coin_id": req.coin_id,
                "symbol": req.coin_id[:3].upper(), "amount": coin_amount,
                "total_invested_usd": req.amount_usd, "avg_buy_price": current_price,
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(),
            })
    elif req.action == "sell":
        holding = await db.crypto_portfolio.find_one({"user_id": user.id, "coin_id": req.coin_id}, {"_id": 0})
        if not holding or holding["amount"] < coin_amount:
            raise HTTPException(status_code=400, detail="Insufficient crypto balance")
        new_amount = holding["amount"] - coin_amount
        if new_amount < 0.00000001:
            await db.crypto_portfolio.delete_one({"user_id": user.id, "coin_id": req.coin_id})
        else:
            ratio = new_amount / holding["amount"]
            await db.crypto_portfolio.update_one(
                {"user_id": user.id, "coin_id": req.coin_id},
                {"$set": {"amount": new_amount, "total_invested_usd": holding["total_invested_usd"] * ratio, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        await db.wallets.update_one(
            {"user_id": user.id},
            {"$inc": {"balance_usd": req.amount_usd}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    trade = {
        "id": str(uuid.uuid4()), "user_id": user.id, "type": f"crypto_{req.action}",
        "coin_id": req.coin_id, "coin_amount": round(coin_amount, 8),
        "amount_usd": req.amount_usd, "price_at_trade": current_price,
        "amount": req.amount_usd, "action": req.action, "status": "completed",
        "description": f"{'Bought' if req.action == 'buy' else 'Sold'} {req.coin_id.upper()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(trade)
    trade.pop("_id", None)
    updated_wallet = await db.wallets.find_one({"user_id": user.id}, {"_id": 0})
    return {"trade": trade, "wallet": updated_wallet}

@api_router.get("/crypto/portfolio")
async def get_portfolio(authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    portfolio = await db.crypto_portfolio.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    return {"portfolio": portfolio}

# ============== AI BOT ==============
@api_router.post("/bot/chat")
async def bot_chat(req: BotChatRequest, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    session_id = req.session_id or f"bot_{user.id}_{str(uuid.uuid4())[:8]}"
    
    if session_id not in chat_sessions:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=session_id,
            system_message="""You are Singularity AI, an elite crypto trading bot and financial advisor. You have deep expertise in:
- Technical analysis (RSI, MACD, Bollinger Bands, Fibonacci retracements, Volume Profile)
- Trading strategies (DCA, momentum, mean reversion, grid trading, scalping, swing trading)
- Risk management (position sizing, stop-loss, take-profit, portfolio diversification)
- Real-time market sentiment analysis
- Macroeconomic factors affecting crypto markets
- On-chain analytics and whale tracking

Your personality: Confident, precise, data-driven. You speak like a seasoned Wall Street quant meets crypto native.
Always provide actionable insights with clear entry/exit points, confidence levels, and risk assessments.
Format responses with clear sections using **bold** headers and bullet points.
Include specific price levels, percentages, and timeframes in your analysis.
For trade signals, always specify: Entry, Stop-Loss, Take-Profit, Position Size (% of portfolio), Timeframe.
NEVER provide financial advice without risk disclaimers."""
        )
        chat.with_model("anthropic", "claude-opus-4-5-20251101")
        chat_sessions[session_id] = chat
    
    chat = chat_sessions[session_id]
    
    enriched_msg = req.message
    try:
        async with httpx.AsyncClient(timeout=8) as hclient:
            resp = await hclient.get(
                f"{COINGECKO_BASE}/simple/price",
                params={"ids": "bitcoin,ethereum,solana,cardano,ripple,dogecoin,avalanche-2,chainlink", "vs_currencies": "usd", "include_24hr_change": "true", "include_market_cap": "true"}
            )
            if resp.status_code == 200:
                market_data = resp.json()
                context = "\n[LIVE MARKET DATA]\n"
                for coin, data in market_data.items():
                    price = data.get("usd", 0)
                    change = data.get("usd_24h_change", 0)
                    mcap = data.get("usd_market_cap", 0)
                    context += f"- {coin.upper()}: ${price:,.2f} ({change:+.2f}% 24h) MCap: ${mcap:,.0f}\n"
                enriched_msg = f"{req.message}\n{context}"
    except Exception:
        pass
    
    portfolio = await db.crypto_portfolio.find({"user_id": user.id}, {"_id": 0}).to_list(50)
    if portfolio:
        portfolio_ctx = "\n[USER PORTFOLIO]\n"
        for p in portfolio:
            portfolio_ctx += f"- {p['coin_id']}: {p['amount']:.6f} (invested ${p['total_invested_usd']:.2f})\n"
        enriched_msg += portfolio_ctx
    
    wallet = await db.wallets.find_one({"user_id": user.id}, {"_id": 0})
    if wallet:
        enriched_msg += f"\n[WALLET] Available: ${wallet.get('balance_usd', 0):.2f} USD\n"
    
    response = await chat.send_message(UserMessage(text=enriched_msg))
    
    await db.bot_messages.insert_one({"id": str(uuid.uuid4()), "session_id": session_id, "user_id": user.id, "role": "user", "content": req.message, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.bot_messages.insert_one({"id": str(uuid.uuid4()), "session_id": session_id, "user_id": user.id, "role": "assistant", "content": response, "created_at": datetime.now(timezone.utc).isoformat()})
    
    return {"response": response, "session_id": session_id}

@api_router.get("/bot/history")
async def get_bot_history(session_id: Optional[str] = None, authorization: str = Header(None)):
    user = await get_user_from_token(authorization)
    query = {"user_id": user.id}
    if session_id:
        query["session_id"] = session_id
    messages = await db.bot_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"messages": messages}

# ============== WEBHOOK ==============
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        event = await stripe_checkout.handle_webhook(body, signature)
        if event.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "completed":
                await db.payment_transactions.update_one({"session_id": event.session_id}, {"$set": {"payment_status": "completed"}})
                await db.wallets.update_one({"user_id": tx["user_id"]}, {"$inc": {"balance_usd": tx["amount"]}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

@api_router.get("/")
async def root():
    return {"message": "Singularity API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
