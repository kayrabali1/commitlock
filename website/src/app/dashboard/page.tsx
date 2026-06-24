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

  const [activeTab, setActiveTab] = useState('profile');

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
            <span className={styles.hideOnMobile}>Sign Out</span>
          </button>
        </div>
      </header>

      <main className={`container ${styles.mainContent}`}>
        <div className={`animate-fade-up ${styles.pageHeader}`}>
          <h1>Account Settings</h1>
          <p>Manage your profile, commitments, and billing details.</p>
        </div>

        <div className={`animate-fade-up delay-100 ${styles.settingsLayout}`}>
          <aside className={styles.sidebar}>
            <nav className={styles.tabNav}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <div className={styles.tabIcon}><ShieldCheck size={18} /></div>
                Profile
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'billing' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('billing')}
              >
                <div className={styles.tabIcon}><CreditCard size={18} /></div>
                Billing
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <div className={styles.tabIcon}><AlertCircle size={18} /></div>
                Preferences
              </button>
            </nav>
          </aside>

          <div className={styles.contentArea}>
            <div className={`glass-card ${styles.settingsCard}`}>
              {activeTab === 'profile' && (
                <div className={styles.tabPanel}>
                  <h2>Personal Information</h2>
                  <p className={styles.panelDesc}>Update your photo and personal details here.</p>
                  
                  <div className={styles.profileSection}>
                    <div className={styles.avatarLarge}>
                      {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <div className={styles.profileDetails}>
                      <div className={styles.infoGroup}>
                        <label>Full Name</label>
                        <div className={styles.infoValue}>{profile?.name || 'User'}</div>
                      </div>
                      <div className={styles.infoGroup}>
                        <label>Email Address</label>
                        <div className={styles.infoValue}>{profile?.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className={styles.tabPanel}>
                  <h2>Payment Methods</h2>
                  <p className={styles.panelDesc}>Manage the cards used to authorize your commitments.</p>
                  
                  <div className={styles.statusSection}>
                    <div className={styles.statusHeader}>
                      <h3>Primary Card</h3>
                      <div className={`${styles.statusBadge} ${profile?.hasPaymentMethod ? styles.statusActive : styles.statusMissing}`}>
                        {profile?.hasPaymentMethod ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {profile?.hasPaymentMethod ? 'Linked' : 'Missing'}
                      </div>
                    </div>
                    
                    <p className={styles.statusText}>
                      {profile?.hasPaymentMethod 
                        ? 'Your account is ready. You can securely make commitments from the mobile app.' 
                        : 'Link a credit card to use CommitLock. No money is charged upfront.'}
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
              )}

              {activeTab === 'preferences' && (
                <div className={styles.tabPanel}>
                  <h2>Preferences</h2>
                  <p className={styles.panelDesc}>Manage your app notifications and privacy settings.</p>
                  <div className={styles.placeholderState}>
                    <p>Coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
