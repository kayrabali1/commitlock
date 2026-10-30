'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, User, Menu, X, Download } from 'lucide-react';
import styles from './layout.module.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    if (token) {
      const apiUrl =
        typeof window !== 'undefined'
          ? `http://${window.location.hostname}:8080`
          : 'http://localhost:8080';
      fetch(`${apiUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) setProfile(data); })
        .catch(console.error);
    }
  }, []);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const navLinks = [
    { href: '#commitments', label: 'Commitments' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <>
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={`container ${styles.nav}`}>
          {/* Logo */}
          <Link href="/" className={styles.logo} id="nav-logo">
            <div className={styles.logoIcon}>
              <ShieldCheck size={18} className={styles.icon} />
            </div>
            <span className={styles.logoText}>CommitLock</span>
          </Link>

          {/* Desktop nav links */}
          <nav className={styles.navLinks} aria-label="Main navigation">
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} className={styles.navLink}>
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className={styles.navActions}>
            {isLoggedIn ? (
              <Link href="/dashboard" className={styles.profileLink} id="nav-profile-link">
                <div className={styles.profileAvatar}>
                  {profile?.name?.charAt(0) || <User size={14} />}
                </div>
                <span className={styles.profileName}>{profile?.name || 'Dashboard'}</span>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginLink} id="nav-login-link">
                Sign in
              </Link>
            )}
            <a href="#download" className={`btn btn-primary ${styles.headerCta}`} id="nav-download-btn">
              <Download size={16} />
              Download
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            id="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu drawer */}
        <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          <nav className={styles.mobileNav}>
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={styles.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <div className={styles.mobileDivider} />
            {isLoggedIn ? (
              <Link href="/dashboard" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
                Sign in
              </Link>
            )}
            <a
              href="#download"
              className={`btn btn-primary ${styles.mobileNavCta}`}
              onClick={() => setMobileMenuOpen(false)}
              id="nav-mobile-download-btn"
            >
              <Download size={16} />
              Download Free
            </a>
          </nav>
        </div>
      </header>

      {children}

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerContent}`}>
          {/* Brand column */}
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <ShieldCheck size={18} className={styles.icon} />
              </div>
              <span className={styles.logoText}>CommitLock</span>
            </Link>
            <p className={styles.footerTagline}>
              The habit accountability app where failure has real consequences.
            </p>
            {/* Social icons */}
            <div className={styles.socialRow}>
              {[
                {
                  label: 'Twitter / X',
                  href: '#',
                  svg: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                },
                {
                  label: 'Instagram',
                  href: '#',
                  svg: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                  ),
                },
                {
                  label: 'TikTok',
                  href: '#',
                  svg: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.36 6.36 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.68a8.16 8.16 0 004.77 1.52V7.75a4.85 4.85 0 01-1-.06z" />
                    </svg>
                  ),
                },
              ].map(({ label, href, svg }) => (
                <a key={label} href={href} className={styles.socialLink} aria-label={label}>
                  {svg}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Product</h4>
              <a href="#commitments">Commitments</a>
              <a href="#how-it-works">How it works</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#download">Download</a>
            </div>
            <div className={styles.footerColumn}>
              <h4>Legal</h4>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Terms of Service</Link>
              <Link href="#">Cookie Policy</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Support</h4>
              <Link href="#">Help Center</Link>
              <Link href="#">Contact Us</Link>
              <Link href="#">Status</Link>
            </div>
          </div>
        </div>

        <div className={`container ${styles.footerBottom}`}>
          <p>© {new Date().getFullYear()} CommitLock. All rights reserved.</p>
          <div className={styles.footerBottomBadges}>
            <span className={styles.footerBadge}>🔒 Secure In-App Purchases</span>
            <span className={styles.footerBadge}>❤️ Apple Health</span>
            <span className={styles.footerBadge}>🏃 Google Health</span>
          </div>
        </div>
      </footer>
    </>
  );
}
