# Singularity

> Beyond Borders. Beyond Limits.

A premium fintech + crypto trading mobile app combining seamless international money transfers, a digital wallet, real-time crypto trading, and an AI-powered trading bot.

## Features

- **International Money Transfer** - Send money to 18+ currencies with zero fees, instant delivery
- **Digital Wallet** - Load funds via Stripe, manage balances
- **Crypto Trading** - Live prices from CoinGecko, buy/sell with wallet funds
- **AI Trading Bot** - Claude Opus 4.5 analyzes markets, provides trading signals and portfolio advice
- **Dark Premium UI** - Neon accents, glassmorphism, smooth 60fps animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 54, React Native, Expo Router |
| Backend | Python FastAPI |
| Auth | Supabase (email/password) |
| Database | MongoDB |
| Payments | Stripe (via emergentintegrations) |
| Crypto | CoinGecko API |
| AI | Claude Opus 4.5 (via Emergent Universal Key) |

## Getting Started

1. Clone the repo
2. Install dependencies: `cd frontend && yarn install`
3. Install backend deps: `cd backend && pip install -r requirements.txt`
4. Set up `.env` files (see below)
5. Start backend: `uvicorn server:app --host 0.0.0.0 --port 8001 --reload`
6. Start frontend: `npx expo start`

## Environment Variables

### Backend (`/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=singularity_db
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
STRIPE_API_KEY=<your-stripe-secret-key>
EMERGENT_LLM_KEY=<your-emergent-key-or-anthropic-key>
```

### Frontend (`/frontend/.env`)
```
EXPO_PUBLIC_BACKEND_URL=<your-backend-url>
```

---

## Stripe Migration Guide

To take full control of Stripe payments and migrate away from Emergent's test key:

### Step 1: Create Your Stripe Account
1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete the onboarding and activate your account
3. Get your **Secret Key** from Dashboard → Developers → API Keys

### Step 2: Replace the Stripe Key
1. Open `/backend/.env`
2. Replace `STRIPE_API_KEY=sk_test_emergent` with your own key:
   ```
   STRIPE_API_KEY=sk_live_YOUR_REAL_STRIPE_KEY
   ```
3. Restart the backend server

### Step 3: Set Up Webhooks (Production)
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhook/stripe`
3. Select events: `checkout.session.completed`, `checkout.session.expired`
4. Copy the webhook signing secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

### Step 4: Enable Crypto Payments (Optional)
1. Stripe Dashboard → Settings → Payment Methods → Crypto → Enable
2. Only available in the US

### Step 5: Switch to Production
1. Replace test key (`sk_test_*`) with live key (`sk_live_*`)
2. Update webhook URLs to production domain
3. Test the full payment flow end-to-end

### Custom Integration (Without emergentintegrations)
If you want to replace the `emergentintegrations` Stripe wrapper:

```python
# Install stripe directly
pip install stripe

# Replace the checkout code in server.py:
import stripe
stripe.api_key = os.environ['STRIPE_API_KEY']

# Create checkout session:
session = stripe.checkout.Session.create(
    payment_method_types=['card'],
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {'name': 'Wallet Top-up'},
            'unit_amount': int(amount * 100),  # cents
        },
        'quantity': 1,
    }],
    mode='payment',
    success_url=success_url,
    cancel_url=cancel_url,
    metadata=metadata,
)

# Check status:
session = stripe.checkout.Session.retrieve(session_id)
```

---

## AI Bot Migration Guide

To replace the Emergent Universal Key with your own Anthropic API key:

1. Get your API key from [https://console.anthropic.com](https://console.anthropic.com)
2. Replace in `/backend/.env`:
   ```
   EMERGENT_LLM_KEY=sk-ant-YOUR_ANTHROPIC_KEY
   ```
3. Or replace with direct Anthropic SDK:
   ```python
   pip install anthropic
   
   import anthropic
   client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
   response = client.messages.create(
       model="claude-opus-4-5-20251101",
       system=system_prompt,
       messages=[{"role": "user", "content": user_message}],
   )
   ```

## License
Proprietary - All rights reserved
