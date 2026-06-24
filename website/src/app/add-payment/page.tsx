'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

function PaymentForm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError('Invalid session. Please return to the app and try again.');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || !expiry || !cvc || !name) {
        setError('Please fill in all card details.');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Use the actual backend API to save the mock payment method
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/stripe/mock-save-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save payment method');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sessionId && !isSuccess) {
    return (
      <div className={styles.container}>
        <div className={`glass-card ${styles.card}`}>
          <div className={styles.errorContainer}>
            <h2>Invalid Session</h2>
            <p>We couldn't find a valid payment session. Please start over from the CommitLock app.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={`glass-card ${styles.card} ${styles.successCard} animate-fade-up`}>
          <div className={styles.successIconWrapper}>
            <CheckCircle2 size={64} className={styles.successIcon} />
          </div>
          <h1 className={styles.title}>Payment Method Saved</h1>
          <p className={styles.subtitle}>
            Your payment method has been securely linked to your account.
          </p>
          <div className={styles.securityBadge}>
            <ShieldCheck size={18} className={styles.securityIcon} />
            <span>You will only be charged if you fail your commitment.</span>
          </div>
          <a href="commitlock://payment-success" className={`btn btn-primary ${styles.returnBtn}`}>
            Return to App <ArrowRight size={18} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`glass-card ${styles.card} animate-fade-up`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Secure Payment</h1>
          <p className={styles.subtitle}>
            Add a payment method to lock in your commitment. Apple and Google policies require this step to be completed on our secure web platform.
          </p>
        </div>

        <div className={styles.methodSelector}>
          <button 
            type="button" 
            className={`${styles.methodBtn} ${paymentMethod === 'card' ? styles.methodBtnActive : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard size={20} />
            <span>Credit Card</span>
          </button>
          <button 
            type="button" 
            className={`${styles.methodBtn} ${paymentMethod === 'paypal' ? styles.methodBtnActive : ''}`}
            onClick={() => setPaymentMethod('paypal')}
          >
            <span className={styles.paypalIcon}>P</span>
            <span>PayPal</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {paymentMethod === 'card' ? (
            <div className={`${styles.cardForm} animate-fade-up`}>
              <div className={styles.formGroup}>
                <label className="label">Name on Card</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className="label">Card Number</label>
                <div className={styles.inputWrapper}>
                  <CreditCard size={18} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    className={`input-field ${styles.inputWithIcon}`} 
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className="label">Expiry Date</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className="label">CVC</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={`${styles.paypalForm} animate-fade-up`}>
              <p>You will be redirected to PayPal to complete your authorization securely.</p>
            </div>
          )}

          <div className={styles.securityBadge}>
            <ShieldCheck size={18} className={styles.securityIcon} />
            <span>Payments are secured with bank-grade encryption. We don't store your card details.</span>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className={styles.spin} />
                Processing...
              </>
            ) : paymentMethod === 'card' ? (
              'Save Payment Method'
            ) : (
              'Continue with PayPal'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddPaymentPage() {
  return (
    <Suspense fallback={<div className="page-center"><Loader2 size={32} className={styles.spin} /></div>}>
      <PaymentForm />
    </Suspense>
  );
}
