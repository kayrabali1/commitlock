'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './page.module.css';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLinkCard = async () => {
    setSetupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/create-setup-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error linking card:', err);
      alert('Could not start payment setup. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <header className={styles.dashboardHeader}>
        <div className={`container ${styles.nav}`}>
          <Link href="/" className={styles.logo}>
            <ShieldCheck size={24} className={styles.icon} />
            <span className={styles.logoText}>CommitLock</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className={`container ${styles.mainContent}`}>
        <div className={`glass-card animate-fade-up ${styles.dashboardCard}`}>
          <div className={styles.profileSection}>
            <div className={styles.avatar}>
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className={styles.profileInfo}>
              <h2>Welcome, {profile?.name || 'User'}!</h2>
              <p>{profile?.email}</p>
            </div>
          </div>

          <div className={styles.statusSection}>
            <div className={styles.statusHeader}>
              <h3>Payment Method</h3>
              <div className={`${styles.statusBadge} ${profile?.hasPaymentMethod ? styles.statusActive : styles.statusMissing}`}>
                {profile?.hasPaymentMethod ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {profile?.hasPaymentMethod ? 'Linked' : 'Missing'}
              </div>
            </div>
            
            <p className={styles.statusText}>
              {profile?.hasPaymentMethod 
                ? 'Your account is ready. You can now make secure commitments in the mobile app.' 
                : 'You need to link a credit card to authorize blocks for your accountability commitments.'}
            </p>

            <button 
              onClick={handleLinkCard} 
              className={`btn btn-primary ${styles.actionBtn}`}
              disabled={setupLoading}
            >
              <CreditCard size={20} />
              {setupLoading ? 'Redirecting...' : profile?.hasPaymentMethod ? 'Update Payment Method' : 'Link Credit Card'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
