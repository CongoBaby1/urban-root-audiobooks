import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, CreditCard, Lock, CheckCircle2, AlertCircle, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

export const StripeCheckoutModal = () => {
  const {
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    cart,
    fulfillOrder,
    stripeConfig,
    showToast,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [cardHolder, setCardHolder] = useState('John Doe');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  if (!isCheckoutModalOpen) return null;

  const totalAmount = cart.reduce((acc, item) => acc + item.price, 0);

  const handlePayNow = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Attempt backend API checkout session call
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          successUrl: window.location.origin + '/?status=success',
          cancelUrl: window.location.origin + '/?status=cancel',
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to real Stripe Hosted Checkout
        window.location.href = data.url;
        return;
      }

      // Fallback to interactive test payment simulation
      setTimeout(() => {
        setLoading(false);
        fulfillOrder(cart);
      }, 1200);

    } catch (err) {
      console.warn('Backend API offline, completing via client test mode:', err);
      setTimeout(() => {
        setLoading(false);
        fulfillOrder(cart);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setIsCheckoutModalOpen(false)}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Stripe Checkout</h3>
              <p className="text-xs text-slate-400">Secure Payment Gateway</p>
            </div>
          </div>

          <button
            onClick={() => setIsCheckoutModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Badge */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Items ({cart.length})</span>
            <div className="text-sm font-bold text-white truncate max-w-xs">
              {cart.map((c) => c.title).join(', ')}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Due</span>
            <div className="text-xl font-black text-amber-400">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stripe Card Payment Form */}
        <form onSubmit={handlePayNow} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Card Number (Stripe Test Cards Supported)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono"
              />
              <CreditCard className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Expiry Date
              </label>
              <input
                type="text"
                required
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                CVC Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input font-mono"
                />
                <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Test Card Note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Stripe Test Mode Active:</strong> You can click "Confirm Payment" to test instant fulfillment directly or connect your live Stripe Secret Key in Seller Studio.
            </span>
          </div>

          {/* Pay Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl btn-amber font-extrabold text-base flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Payment via Stripe...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm Payment — ${totalAmount.toFixed(2)}</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Powered by Stripe Payments infrastructure</span>
        </div>

      </div>
    </div>
  );
};
