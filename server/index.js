import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Stripe (optional: falls back to simulation mode if key is missing or dummy)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

app.use(cors());
app.use(express.json());

// Check Stripe server status
app.get('/api/stripe-config', (req, res) => {
  res.json({
    hasSecretKey: Boolean(stripeSecretKey && !stripeSecretKey.includes('YOUR_')),
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    mode: stripeSecretKey ? 'live-or-test-key' : 'simulation-mode',
  });
});

// Create Stripe Checkout Session endpoint
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, successUrl, cancelUrl } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for checkout.' });
    }

    // If real Stripe key is provided, use Stripe SDK
    if (stripe && stripeSecretKey && !stripeSecretKey.includes('YOUR_')) {
      const lineItems = items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            description: `Audiobook by ${item.author} | Duration: ${item.duration}`,
            images: item.coverUrl ? [item.coverUrl] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe uses cents
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl || 'http://localhost:3000/?status=success',
        cancel_url: cancelUrl || 'http://localhost:3000/?status=cancel',
      });

      return res.json({ id: session.id, url: session.url });
    }

    // Simulated Stripe Session for demo/test mode without API key
    const simulatedSessionId = `cs_test_simulated_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return res.json({
      id: simulatedSessionId,
      simulated: true,
      message: 'Simulated Stripe Checkout Session created successfully.',
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create PaymentIntent endpoint for Stripe Elements embedded payment
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (stripe && stripeSecretKey && !stripeSecretKey.includes('YOUR_')) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency,
        automatic_payment_methods: { enabled: true },
      });

      return res.json({ clientSecret: paymentIntent.client_secret });
    }

    // Simulated client secret fallback
    res.json({
      clientSecret: `pi_simulated_secret_${Date.now()}`,
      simulated: true,
    });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Audiobook Backend Server listening on http://localhost:${PORT}`);
});
