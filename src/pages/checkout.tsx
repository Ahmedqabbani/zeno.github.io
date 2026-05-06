import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Calendar, Lock, ShieldCheck, Zap } from 'lucide-react';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '../components/ui/field-1';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Checkout: React.FC = () => {
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // API base URL - adjust if needed for production
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if your backend requires it:
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          // Optional: pass a specific price ID here, 
          // or rely on the backend's STRIPE_PRICE_ID env var
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Hosted Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Failed to initiate checkout. Please ensure Stripe keys are configured in the backend.');
      setIsProcessing(false);
    }
  };

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const renewDate = nextMonth.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-svh bg-black flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-stretch">
        {/* Left: Checkout Form */}
        <div className="relative flex flex-col gap-6 p-6 md:p-8 bg-[#080808] border border-[#222] h-full w-full rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </Link>
            <Link to="/" aria-label="home" className="flex items-center">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-slate-400 to-white rounded-md shadow-sm">
                <span className="text-black text-xl leading-none font-black italic pr-0.5 -mt-0.5">Z</span>
              </div>
            </Link>
          </div>

          <div className="flex flex-col items-start gap-1">
            <h1 className="text-2xl font-bold text-white">
              Upgrade to Pro
            </h1>
            <p className="text-zinc-400 text-sm">
              Enter your payment details below
            </p>
          </div>

          <form onSubmit={handleCheckout} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel
                  htmlFor="name"
                  className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest"
                >
                  Name on Card
                </FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    
                    className="bg-[#0a0a0a] border-[#222] text-white placeholder-zinc-600 hover:border-[#333] focus-visible:ring-[#444] focus-visible:border-[#444] transition-colors rounded-[10px] h-11 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                  />
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="cardNumber"
                  className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest"
                >
                  Card Number
                </FieldLabel>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    
                    maxLength={19}
                    className="bg-[#0a0a0a] border-[#222] text-white placeholder-zinc-600 hover:border-[#333] focus-visible:ring-[#444] focus-visible:border-[#444] transition-colors rounded-[10px] h-11 pl-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="expiry"
                    className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest"
                  >
                    Expiry Date
                  </FieldLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      
                      maxLength={5}
                      className="bg-[#0a0a0a] border-[#222] text-white placeholder-zinc-600 hover:border-[#333] focus-visible:ring-[#444] focus-visible:border-[#444] transition-colors rounded-[10px] h-11 pl-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="cvc"
                    className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest"
                  >
                    CVC
                  </FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                    <Input
                      id="cvc"
                      type="text"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      
                      maxLength={4}
                      className="bg-[#0a0a0a] border-[#222] text-white placeholder-zinc-600 hover:border-[#333] focus-visible:ring-[#444] focus-visible:border-[#444] transition-colors rounded-[10px] h-11 pl-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                    />
                  </div>
                </Field>
              </div>
            </FieldGroup>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-semibold rounded-[10px] transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {isProcessing ? 'Processing...' : 'Pay $14.99'}
            </Button>
          </form>
          
          <div className="text-zinc-500 flex items-center justify-center gap-x-2 text-xs mt-auto">
            <Lock className="size-3" />
            <span>Payments are secure and encrypted</span>
          </div>
        </div>

        {/* Right: Summary Card */}
        <div className="relative group p-[1px] rounded-xl overflow-hidden bg-[#222] transition-all duration-700">
          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-1000"></div>
          
          <div className="relative z-10 h-full w-full bg-[#080808] rounded-xl p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 border-b border-[#222] pb-6 mb-6">
              <div className="flex items-center justify-center size-10 rounded-full bg-[#111] border border-[#222]">
                <Zap className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white leading-none">Pro Plan</h3>
                <p className="text-zinc-400 text-sm mt-1">Unlimited power for serious builders.</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Subscription</span>
                <span className="text-white font-medium">$14.99 / month</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Tax</span>
                <span className="text-white font-medium">$0.00</span>
              </div>
              <div className="pt-4 border-t border-[#222] flex justify-between items-center">
                <span className="text-white font-semibold">Total due today</span>
                <span className="text-2xl font-bold text-white tracking-tight">$14.99</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Unlimited compiles",
                "React & HTML output",
                "Syntax highlighted preview",
                "Priority compile queue",
                "Figma token management"
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-[#888]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            {/* Renewing Alert */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="size-5 text-zinc-400 shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-400">
                You will be charged <span className="text-white font-medium">$14.99</span> today. 
                Your subscription will automatically renew on <span className="text-white font-medium">{renewDate}</span>. 
                Cancel anytime.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
