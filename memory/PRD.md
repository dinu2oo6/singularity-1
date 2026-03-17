# Singularity - PRD v2.0

## Product Overview
Singularity is a premium fintech + crypto trading mobile app combining seamless international money transfers, a digital wallet with Stripe-powered top-ups, real-time crypto trading via CoinGecko, and an AI trading bot powered by Claude Opus 4.5.

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router, Reanimated 3, react-native-svg, Moti
- **Backend**: Python FastAPI
- **Auth**: Supabase Auth (email/password, admin-confirmed users)
- **Database**: MongoDB (wallets, txs, trades, settings, OTP, KYC, watchlist, beneficiaries)
- **Payments**: Stripe (emergentintegrations)
- **Crypto Data**: CoinGecko API (60s cache)
- **AI**: Claude Opus 4.5 (Emergent Universal Key)

## Core Features (v2.0)
1. **Animated Splash** - Logo reveal with rings + glow
2. **Supabase Auth** - Email/password with pre-confirmed demo user
3. **Home Dashboard** - Balance, quick actions, market overview with SVG sparkline charts, recent activity
4. **Wallet** - Custom amount top-up (Stripe), beneficiary contacts, crypto watchlist, holdings
5. **International Transfer** - 18+ currencies, 4 methods (Singularity/PayPal/Bank/Interac), OTP verification, auto-beneficiary
6. **Crypto Trading** - 10 live coins from CoinGecko, interactive SVG price charts, buy/sell modal, portfolio tracking
7. **AI Trading Bot** - Claude Opus 4.5 chat with real-time market data injection, portfolio context
8. **Security** - 2FA toggle, passcode lock, biometric login, recovery codes (8 codes)
9. **KYC Verification** - Multi-field form, auto-approval, increases transfer limit to $50K
10. **OTP for Transfers** - 6-digit code, 5-minute expiry
11. **Scheduled Transfers** - Daily/weekly/biweekly/monthly recurring
12. **Push Notifications** - expo-notifications integrated

## Screens
- `index.tsx` - Animated splash → auth check
- `(auth)/login.tsx` / `register.tsx` - Auth
- `(tabs)/home.tsx` - Dashboard with SVG mini-charts
- `(tabs)/trade.tsx` - Markets with full SVG price charts, buy/sell modal
- `(tabs)/bot.tsx` - AI chat with Claude Opus 4.5
- `(tabs)/wallet.tsx` - Balance, top-up, beneficiaries, watchlist
- `(tabs)/profile.tsx` - Settings (2FA, passcode, biometric, recovery, KYC)
- `send.tsx` - Transfer with OTP + method selection
- `receive.tsx` - Share email, how-it-works

## API Endpoints (26 total)
### Auth: register, login, me, otp/send, otp/verify
### Wallet: balance, topup, topup/status, watchlist (GET/POST/DELETE)
### Transfer: send, history, currencies, beneficiaries (GET/POST/DELETE), schedule (POST/GET), schedule/:id (DELETE)
### Crypto: prices, chart/:id, trade, portfolio
### Settings: GET, PUT, recovery-codes
### KYC: submit, status
### Bot: chat, history
### Stripe webhook

## Demo User
- Email: demo@singularity.app
- Password: Singularity2026!
- Pre-confirmed in Supabase
