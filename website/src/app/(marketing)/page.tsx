'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Activity, Lock, Wallet, ChevronRight, ChevronDown } from 'lucide-react';
import styles from './page.module.css';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);
  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroContainer}`}>
          
          <h1 className={`animate-fade-up delay-100 ${styles.heroTitle}`}>
            Commit to your goals. <br />
            <span className="text-gradient-primary">Literally.</span>
          </h1>
          
          <p className={`animate-fade-up delay-200 ${styles.heroDescription}`}>
            The ultimate accountability app. Set a physical goal, stake your money, and let Apple Health verify your success. Miss your goal, and lose your stake.
          </p>
          
          <div className={`animate-fade-up delay-300 ${styles.heroActions}`}>
            <a href="#download" className={`btn btn-primary ${styles.heroBtn}`}>
              <Download size={20} />
              Get the App
            </a>
            {isLoggedIn ? (
              <Link href="/dashboard" className={`btn btn-secondary ${styles.heroBtn}`}>
                Link a Payment Method
                <ChevronRight size={20} />
              </Link>
            ) : (
              <Link href="/login" className={`btn btn-secondary ${styles.heroBtn}`}>
                Link Credit Card
                <ChevronRight size={20} />
              </Link>
            )}
          </div>
        </div>
        
        <div className={`animate-fade-up delay-400 ${styles.scrollIndicator}`}>
          <a href="#how-it-works" className={styles.scrollIndicatorBtn}>
            How it works
            <ChevronDown size={16} />
          </a>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className="text-gradient">How it Works</h2>
            <p>Accountability forced by real consequences.</p>
          </div>
          
          <div className={`grid grid-cols-3 ${styles.stepsGrid}`}>
            <div className={`glass-card ${styles.stepCard}`}>
              <div className={styles.stepIcon}>
                <Activity size={28} />
              </div>
              <h3>1. Set a Goal</h3>
              <p>Choose a fitness metric like steps or running distance, and pledge an amount of money you are willing to lose.</p>
            </div>
            
            <div className={`glass-card ${styles.stepCard}`}>
              <div className={styles.stepIcon}>
                <Lock size={28} />
              </div>
              <h3>2. Lock it in</h3>
              <p>Register your payment method securely via Stripe. No money is blocked or charged upfront—you are simply making a commitment.</p>
            </div>
            
            <div className={`glass-card ${styles.stepCard}`}>
              <div className={styles.stepIcon}>
                <Wallet size={28} />
              </div>
              <h3>3. Succeed or Pay</h3>
              <p>If Apple Health verifies you hit your target, you pay nothing. If you fail, your card is automatically charged.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="download" className={styles.ctaSection}>
        <div className={`container ${styles.ctaContainer}`}>
          <div className={`glass-card ${styles.ctaCard}`}>
            <h2>Ready to transform your habits?</h2>
            <p>Download CommitLock today and start your first challenge.</p>
            
            <div className={styles.storeButtons}>
              <button className={`btn btn-secondary ${styles.storeBtn}`}>
                <div className={styles.storeBtnContent}>
                  <span className={styles.storeBtnSub}>Download on the</span>
                  <span className={styles.storeBtnMain}>App Store</span>
                </div>
              </button>
              <button className={`btn btn-secondary ${styles.storeBtn}`}>
                <div className={styles.storeBtnContent}>
                  <span className={styles.storeBtnSub}>Get it on</span>
                  <span className={styles.storeBtnMain}>Google Play</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
