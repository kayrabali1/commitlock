'use client';

import { useRouter } from 'next/navigation';

export default function SetupCancelPage() {
  const router = useRouter();

  return (
    <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h2>Setup Canceled</h2>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
        You canceled the payment setup process. No card was linked to your account.
      </p>
      <button 
        className="btn-primary" 
        style={{ marginTop: '2rem', width: '100%' }}
        onClick={() => router.replace('/dashboard')}
      >
        Return to Dashboard
      </button>
    </div>
  );
}
