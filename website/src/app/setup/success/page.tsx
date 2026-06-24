'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
      <h2>Payment Setup Successful!</h2>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
        Your card has been securely linked. You can now return to the CommitLock mobile app to make your commitments.
      </p>
      <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Redirecting to dashboard in {countdown} seconds...
      </p>
      <button 
        className="btn-primary" 
        style={{ marginTop: '1.5rem', width: '100%' }}
        onClick={() => router.replace('/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function SetupSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
