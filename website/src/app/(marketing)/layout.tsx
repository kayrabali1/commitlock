'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, User } from 'lucide-react';
import styles from './layout.module.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setProfile(data);
      })
      .catch(console.error);
    }
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.nav}`}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <ShieldCheck size={20} className={styles.icon} />
            </div>
            <span className={styles.logoText}>CommitLock</span>
          </Link>
          
          <div className={styles.navLinks}>
            {isLoggedIn ? (
              <Link href="/dashboard" className={styles.profileLink}>
                <div className={styles.profileAvatar}>
                  {profile?.name?.charAt(0) || <User size={16} />}
                </div>
                <span className={styles.profileName}>{profile?.name || 'Profile'}</span>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginLink}>Log in</Link>
            )}
            <Link href="/#download" className="btn btn-primary">
              Get the App
            </Link>
          </div>
        </div>
      </header>
      
      {children}
      
      <footer className={styles.footer}>
        <div className={`container ${styles.footerContent}`}>
          <div className={styles.footerBrand}>
            <div className={styles.logo}>
              <ShieldCheck size={24} className={styles.icon} />
              <span className={styles.logoText}>CommitLock</span>
            </div>
            <p className={styles.footerTagline}>Commit to your goals. Literally.</p>
          </div>
          
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Product</h4>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#features">Features</Link>
              <Link href="/#download">Download</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Legal</h4>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className={`container ${styles.footerBottom}`}>
          <p>© {new Date().getFullYear()} CommitLock. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
