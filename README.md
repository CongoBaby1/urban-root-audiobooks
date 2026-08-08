# 🎧 AudioVerse - Audiobook Platform & Stripe Marketplace

A high-performance web application designed for selling digital audiobooks online with integrated **Stripe Payments**, interactive audio previews, personal library stream access, and an author studio dashboard.

Located on your Desktop at: `C:\Users\steve\OneDrive\Desktop\audiobook-store`

---

## 🌟 Key Features

### 🛒 1. Storefront & Catalog
- **Rich Dark Theme Aesthetic**: Glassmorphism cards, glowing badges, vibrant typography, and responsive grid layouts.
- **Genre Filtering & Live Search**: Filter audiobooks by Sci-Fi, Self Improvement, Fantasy, Mystery, Business, and Science.
- **Featured Bestseller Banner**: Highlights weekly bestsellers with instant audio preview buttons and ratings.

### 🎧 2. Sticky Audio Stream Player
- **Interactive Equalizer Visualizer**: Animated waveform bars active during playback.
- **Playback Controls**: Play/Pause, -15s / +15s jump buttons, chapter selection, and timeline seek bar.
- **Variable Playback Speed**: Choose between `0.75x`, `1.0x`, `1.25x`, `1.5x`, and `2.0x`.
- **Volume & Mute Control**: Adjust audio volume dynamically.

### 💳 3. Stripe Payments Integration
- **Stripe Checkout Support**: Built-in support for live/test Stripe API keys (`STRIPE_SECRET_KEY` & `VITE_STRIPE_PUBLISHABLE_KEY`).
- **Express Stripe Backend**: Includes `/api/create-checkout-session` and `/api/create-payment-intent` server routes in `server/index.js`.
- **Instant Test Mode Simulator**: Test purchases right away without needing card credentials.
- **Promo Code Discounts**: Enter `AUDIO20` at checkout for 20% off.

### 📚 4. Digital Audiobook Library
- **Personal Bookshelf**: Unlocked audiobooks automatically move to your library upon payment.
- **Full Track Streaming**: Stream full audiobook chapters anytime.
- **Offline Download Action**: Save MP3 files locally.

### 🎙️ 5. Creator & Author Studio Dashboard
- **Publish Audiobooks**: Upload new titles, author details, narrators, pricing, cover image URLs, and sample mp3 links.
- **Revenue Analytics**: Track total sales revenue, order count, and transaction ledger.
- **Stripe Configuration**: Save custom Stripe API credentials directly in the studio interface.

---

## 🚀 How to Run locally

### 1. Install Dependencies
```bash
cmd /c npm install
```

### 2. Start Both Express Backend Server & Frontend Vite Dev Server
```bash
cmd /c npm start
```
- **Frontend App**: `http://localhost:3000`
- **Backend Stripe API**: `http://localhost:5000`

---

## ⚙️ Stripe API Setup (Optional)

To connect your real Stripe account:
1. Copy `.env.example` to `.env` or open **Seller Studio -> Stripe Settings** in the app.
2. Enter your `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`) and `STRIPE_SECRET_KEY` (`sk_test_...`).
3. Save credentials. All checkouts will now generate official Stripe Hosted Checkout Sessions!
