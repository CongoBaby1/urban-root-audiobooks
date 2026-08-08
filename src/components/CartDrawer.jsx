import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Trash2, ShieldCheck, CreditCard, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartDrawer = () => {
  const {
    cart,
    removeFromCart,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutModalOpen,
    fulfillOrder,
    showToast,
  } = useStore();

  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'AUDIO20' || promoCode.trim().toUpperCase() === 'STRIPE20') {
      setDiscountPercent(20);
      showToast('🎉 Promo code applied: 20% OFF!', 'success');
    } else {
      showToast('Invalid promo code. Try "AUDIO20"', 'error');
    }
  };

  const handleInstantDemoCheckout = () => {
    if (cart.length === 0) return;
    fulfillOrder(cart);
  };

  const handleStripeCheckoutModal = () => {
    if (cart.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel border-l border-slate-800 flex flex-col justify-between shadow-2xl">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Your Cart</h2>
                <p className="text-xs text-slate-400">{cart.length} Audiobook{cart.length === 1 ? '' : 's'}</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Your cart is empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Explore our audiobook catalog and add bestsellers to your library.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 rounded-xl btn-amber font-bold text-xs"
                >
                  Browse Storefront
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center gap-4 group"
                >
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-16 h-20 object-cover rounded-xl border border-slate-700 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">By {item.author}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">
                        ${(Number(item.price) || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        {item.duration}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout Controls */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-slate-800 space-y-4 bg-slate-950/60">
              
              {/* Promo Code Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (Try AUDIO20)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs glass-input"
                />
                <button
                  onClick={applyPromo}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                >
                  Apply
                </button>
              </div>

              {/* Price Calculation breakdown */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Discount (20%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Total</span>
                  <span className="text-amber-400">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Stripe Checkout Options */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleStripeCheckoutModal}
                  className="w-full py-3.5 rounded-xl btn-amber font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay with Stripe — ${finalTotal.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleInstantDemoCheckout}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Test Mode Checkout (No Card Needed)</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted 256-bit SSL via Stripe Payments</span>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
