'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  Activity,
  ChevronDown,
  Shield,
  Zap,
  Trophy,
  Heart,
  TrendingUp,
  CheckCircle,
  Users,
  Flame,
  Star,
  BadgeCheck,
  Coins,
  Smartphone,
  BarChart3,
  Target,
  Footprints,
  Timer,
  PersonStanding,
} from 'lucide-react';
import styles from './page.module.css';

// ─── Scroll-fade-in hook ───────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'How does CommitLock verify my goals?',
    a: 'CommitLock integrates directly with Apple Health (iOS) and Google Health Connect (Android). When your commitment period ends, we read the verified health data logged by your device to confirm whether you hit your target—no manual input, no cheating.',
  },
  {
    q: 'How does the coin system work?',
    a: 'You purchase coins via in-app purchase and store them in your personal Vault. When creating a commitment, you choose how many coins to stake. Hit your goal and your coins are returned in full. Miss it and you forfeit the coins you staked. Simple, honest consequences.',
  },
  {
    q: 'What happens if there\'s a sync issue with my health data?',
    a: 'We give you a grace period and allow you to trigger a manual re-sync within 24 hours of your commitment deadline. If a verified platform-level sync error is detected, your staked coins will not be deducted.',
  },
  {
    q: 'What are Challenge Passes?',
    a: 'Challenge Passes are the slots that let you run an active commitment. New users receive 3 free passes to get started. Each time you create a commitment, one pass is consumed. You can purchase additional passes via in-app purchase, or subscribe to CommitLock Pro for unlimited pass creation.',
  },
  {
    q: 'Are my coins and purchases secure?',
    a: 'Yes. All in-app purchases are processed entirely through Apple App Store or Google Play—CommitLock never handles your payment details directly. Your coin balance is stored securely in your account and can only be moved by you.',
  },
  {
    q: 'Which commitment types are currently supported?',
    a: 'CommitLock currently supports three commitment types: Daily Step Count (verified via pedometer data), Daily Running Distance (verified via GPS/workout data), and Daily Meditation Minutes (verified via mindfulness session data). All three are read automatically from Apple Health or Google Health Connect.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqItem} ${open ? styles.faqOpen : ''}`}>
      <button className={styles.faqQ} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={20} className={styles.faqChevron} />
      </button>
      <div className={styles.faqA}>
        <p>{a}</p>
      </div>
    </div>
  );
}

// ─── Phone Mock ───────────────────────────────────────────────────────────
function PhoneMock() {
  return (
    <div className={styles.phoneMock} aria-hidden="true">
      <div className={styles.phoneFrame}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneScreen}>
          {/* Status bar */}
          <div className={styles.phoneStatus}>
            <span>9:41</span>
            <div className={styles.phoneStatusIcons}>
              <span>▲▲▲</span>
              <span>🔋</span>
            </div>
          </div>

          {/* App header */}
          <div className={styles.appHeader}>
            <div className={styles.appAvatar}>K</div>
            <div>
              <div className={styles.appGreeting}>Good morning,</div>
              <div className={styles.appName}>Kara 👋</div>
            </div>
            <div className={styles.appCoins}>
              <span className={styles.coinIcon}>🪙</span>
              <span>120 coins</span>
            </div>
          </div>

          {/* Active commitment card */}
          <div className={styles.commitCard}>
            <div className={styles.commitCardHeader}>
              <span className={styles.commitBadge}>🔥 Active</span>
              <span className={styles.commitDays}>3 days left</span>
            </div>
            <div className={styles.commitTitle}>10,000 Steps / Day</div>
            <div className={styles.commitStake}>🪙 25 coins staked</div>
            <div className={styles.commitProgress}>
              <div className={styles.commitProgressBar}>
                <div className={styles.commitProgressFill} style={{ width: '68%' }} />
              </div>
              <div className={styles.commitProgressLabels}>
                <span>6,820 steps today</span>
                <span>68%</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <TrendingUp size={14} />
              <span className={styles.statVal}>4</span>
              <span className={styles.statLabel}>Streak</span>
            </div>
            <div className={styles.statBox}>
              <Trophy size={14} />
              <span className={styles.statVal}>87%</span>
              <span className={styles.statLabel}>Success</span>
            </div>
            <div className={styles.statBox}>
              <Shield size={14} />
              <span className={styles.statVal}>0 🪙</span>
              <span className={styles.statLabel}>Lost</span>
            </div>
          </div>

          {/* Bottom tab bar */}
          <div className={styles.tabBar}>
            {['🏠', '📊', '➕', '🏆', '⚙️'].map((icon, i) => (
              <div key={i} className={`${styles.tabItem} ${i === 0 ? styles.tabActive : ''}`}>
                {icon}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Glow aura */}
      <div className={styles.phoneGlow} />
    </div>
  );
}

// ─── Section wrapper with scroll-in animation ─────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, inView } = useInView();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={`${className} ${styles.scrollSection} ${inView ? styles.scrollSectionVisible : ''}`}
    >
      {children}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pricingAnnual, setPricingAnnual] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const proPrice = pricingAnnual ? '5.83' : '8';
  const proBill = pricingAnnual ? 'Billed $69.99/yr' : 'Billed monthly';

  return (
    <div className={styles.main}>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className={styles.hero} id="hero">
        {/* Background radial glow */}
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGlow2} aria-hidden="true" />

        <div className={`container ${styles.heroContainer}`}>
          {/* Left: copy */}
          <div className={styles.heroContent}>
            <div className={`animate-fade-up delay-50 ${styles.heroBadge}`}>
              <Flame size={14} />
              <span>The habit app where quitting costs you</span>
            </div>

            <h1 className={`animate-fade-up delay-100 ${styles.heroTitle}`}>
              Commit to your<br />
              goals.{' '}
              <span className="text-gradient-primary">Literally.</span>
            </h1>

            <p className={`animate-fade-up delay-200 ${styles.heroSubtitle}`}>
              Stake coins on your daily habits—steps, runs, or meditation.
              Your health data verifies the result. Hit your goal and get
              your coins back. Miss it and they&apos;re gone. Pure accountability.
            </p>

            <div className={`animate-fade-up delay-300 ${styles.heroActions}`}>
              <a href="#download" className={`btn btn-primary ${styles.heroCta}`} id="hero-download-btn">
                <Download size={18} />
                Download Free
              </a>
              {isLoggedIn ? (
                <Link href="/dashboard" className={`btn btn-secondary ${styles.heroCta}`} id="hero-dashboard-btn">
                  Go to Dashboard
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <a href="#how-it-works" className={`btn btn-secondary ${styles.heroCta}`} id="hero-howitworks-btn">
                  See how it works
                  <ArrowRight size={18} />
                </a>
              )}
            </div>

            {/* Trust signals */}
            <div className={`animate-fade-up delay-400 ${styles.heroTrust}`}>
              <div className={styles.trustItem}>
                <CheckCircle size={14} className={styles.trustIcon} />
                <span>Free to start</span>
              </div>
              <div className={styles.trustDot} />
              <div className={styles.trustItem}>
                <CheckCircle size={14} className={styles.trustIcon} />
                <span>Secure in-app purchases</span>
              </div>
              <div className={styles.trustDot} />
              <div className={styles.trustItem}>
                <CheckCircle size={14} className={styles.trustIcon} />
                <span>iOS &amp; Android</span>
              </div>
            </div>
          </div>

          {/* Right: phone mock */}
          <div className={`animate-fade-up delay-300 ${styles.heroVisual}`}>
            <PhoneMock />
          </div>
        </div>

        {/* Scroll cue */}
        <div className={styles.scrollCue}>
          <a href="#proof-ribbon" className={styles.scrollCueBtn} aria-label="Scroll down">
            <ChevronDown size={20} />
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PROOF RIBBON
      ═══════════════════════════════════════════════════════ */}
      <div id="proof-ribbon" className={styles.ribbon}>
        <div className={`container ${styles.ribbonInner}`}>
          {[
            { icon: <Users size={16} />, stat: '50,000+', label: 'Active Users' },
            { icon: <Target size={16} />, stat: '89%', label: 'Goal Completion Rate' },
            { icon: <span style={{ fontSize: '16px' }}>🪙</span>, stat: '8M+', label: 'Coins Staked' },
            { icon: <Star size={16} />, stat: '4.9 ★', label: 'App Store Rating' },
            { icon: <Activity size={16} />, stat: '3B+', label: 'Steps Tracked' },
          ].map(({ icon, stat, label }, i) => (
            <div key={i} className={styles.ribbonStat}>
              <div className={styles.ribbonStatIcon}>{icon}</div>
              <div className={styles.ribbonStatNum}>{stat}</div>
              <div className={styles.ribbonStatLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMMITMENT TYPES
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.commitTypesSection}`} id="commitments">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>Commitment Types</div>
            <h2 className="text-gradient">Three habits. Real stakes.</h2>
            <p>CommitLock focuses on the three daily habits with the highest impact—verified automatically by your device.</p>
          </div>

          <div className={styles.commitTypesGrid}>
            {[
              {
                emoji: '👟',
                icon: <Footprints size={28} />,
                title: 'Daily Step Count',
                body: 'Set a daily step target and let your phone\'s pedometer do the tracking. Whether you hit 5,000 or 15,000—your steps don\'t lie.',
                metric: 'e.g. 10,000 steps / day',
                source: 'Apple Health · Google Health',
              },
              {
                emoji: '🏃',
                icon: <PersonStanding size={28} />,
                title: 'Daily Running Distance',
                body: 'Commit to a daily running or jogging distance goal. GPS workout data verifies every kilometre you log on the road or trail.',
                metric: 'e.g. 5 km / day',
                source: 'Apple Health · Google Health',
              },
              {
                emoji: '🧘',
                icon: <Timer size={28} />,
                title: 'Daily Meditation Minutes',
                body: 'Build a mindfulness habit by committing to daily meditation. Verified through mindfulness session data logged by any meditation app.',
                metric: 'e.g. 10 min / day',
                source: 'Apple Health · Google Health',
              },
            ].map(({ emoji, icon, title, body, metric, source }, i) => (
              <div key={i} className={`glass-card ${styles.commitTypeCard}`}>
                <div className={styles.commitTypeEmoji}>{emoji}</div>
                <div className={styles.commitTypeIcon}>{icon}</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <div className={styles.commitTypeMeta}>
                  <span className={styles.commitTypeMetric}>{metric}</span>
                  <span className={styles.commitTypeSource}>{source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <Section className={styles.section} id="how-it-works">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>How it works</div>
            <h2 className="text-gradient">Accountability with real consequences</h2>
            <p>Three simple steps that turn your habits into genuine commitments.</p>
          </div>

          <div className={styles.stepsGrid}>
            {[
              {
                num: '01',
                icon: <Target size={28} />,
                title: 'Pick Your Habit',
                body: 'Choose one of the three supported commitments—daily steps, running distance, or meditation minutes—and set your daily target and duration.',
              },
              {
                num: '02',
                icon: <Coins size={28} />,
                title: 'Stake Your Coins',
                body: 'Top up your Vault with coins via in-app purchase, then decide how many to stake on your commitment. No coins are moved until the commitment resolves.',
              },
              {
                num: '03',
                icon: <BadgeCheck size={28} />,
                title: 'Health Verifies All',
                body: 'Apple Health or Google Health Connect automatically validates your data each day. Succeed and your coins are returned. Miss your target and the staked coins are forfeited.',
              },
            ].map(({ num, icon, title, body }, i) => (
              <div key={i} className={`glass-card ${styles.stepCard}`}>
                <div className={styles.stepNum}>{num}</div>
                <div className={styles.stepIcon}>{icon}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          FEATURE SHOWCASE
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.featureSection}`} id="features">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>Features</div>
            <h2 className="text-gradient">Everything you need to succeed</h2>
            <p>Built from the ground up for people serious about their daily habits.</p>
          </div>

          <div className={styles.featureGrid}>
            {/* Large feature card */}
            <div className={`glass-card ${styles.featureCardLarge}`}>
              <div className={styles.featureCardIcon}><Activity size={32} /></div>
              <h3>Health-Native Verification</h3>
              <p>
                Your iPhone or Android reads your fitness data automatically. CommitLock taps
                directly into Apple HealthKit and Google Health Connect—no wearable required,
                no manual logging, no chance of manipulation.
              </p>
              <div className={styles.featureIllustration}>
                <div className={styles.healthBadge}>
                  <Heart size={16} className={styles.healthHeart} />
                  <span>Apple Health</span>
                  <CheckCircle size={14} className={styles.healthCheck} />
                </div>
                <div className={styles.healthBadge}>
                  <Activity size={16} className={styles.healthActivity} />
                  <span>Google Health</span>
                  <CheckCircle size={14} className={styles.healthCheck} />
                </div>
              </div>
            </div>

            {/* Feature cards 2-col */}
            <div className={`glass-card ${styles.featureCard}`}>
              <div className={styles.featureCardIcon}><Shield size={28} /></div>
              <h3>Secure Coin Vault</h3>
              <p>Your coin balance is stored securely in your account. Coins are only ever moved when you choose to stake them on a commitment you create.</p>
            </div>

            <div className={`glass-card ${styles.featureCard}`}>
              <div className={styles.featureCardIcon}><Flame size={28} /></div>
              <h3>Commitment Streaks</h3>
              <p>Build momentum with visual streaks. Consecutive successful commitments unlock cosmetic tiers—Bronze, Silver, and Gold status.</p>
            </div>

            <div className={`glass-card ${styles.featureCard}`}>
              <div className={styles.featureCardIcon}><BarChart3 size={28} /></div>
              <h3>Weekly Progress Logs</h3>
              <p>Daily breakdowns of your steps, running distance, and meditation minutes. Spot patterns and understand which days need more effort.</p>
            </div>

            <div className={`glass-card ${styles.featureCard}`}>
              <div className={styles.featureCardIcon}><Smartphone size={28} /></div>
              <h3>Home Screen Widgets</h3>
              <p>Glanceable iOS and Android widgets show your active commitment progress directly on your home screen—no app launch needed.</p>
            </div>

            {/* Wide gamification feature */}
            <div className={`glass-card ${styles.featureCardWide}`}>
              <div className={styles.featureCardIcon}><Trophy size={32} /></div>
              <div className={styles.featureCardContent}>
                <div>
                  <h3>Coin Vault &amp; Gamification</h3>
                  <p>
                    Start free with 3 Challenge Passes. Purchase coins via in-app buy, stake
                    them on your commitments, and earn them back every time you succeed. The
                    higher your streak, the more your profile badge glows—Bronze, Silver, Gold.
                  </p>
                </div>
                <div className={styles.passesDisplay}>
                  {['🥉', '🥈', '🥇'].map((medal, i) => (
                    <div key={i} className={`${styles.passChip} ${i === 2 ? styles.passChipActive : ''}`}>
                      <span>{medal}</span>
                      <span>{['Bronze', 'Silver', 'Gold'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.pricingSection}`} id="pricing">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>Pricing</div>
            <h2 className="text-gradient">Simple, transparent pricing</h2>
            <p>Start free. Upgrade when you&apos;re ready to go all-in.</p>
          </div>

          {/* Toggle */}
          <div className={styles.pricingToggle}>
            <span className={!pricingAnnual ? styles.toggleActive : ''}>Monthly</span>
            <button
              className={`${styles.toggleSwitch} ${pricingAnnual ? styles.toggleSwitchOn : ''}`}
              onClick={() => setPricingAnnual(a => !a)}
              aria-label="Toggle annual billing"
              id="pricing-toggle-btn"
            >
              <span className={styles.toggleKnob} />
            </button>
            <span className={pricingAnnual ? styles.toggleActive : ''}>
              Annual
              <span className={styles.saveBadge}>Save 27%</span>
            </span>
          </div>

          <div className={styles.pricingGrid}>
            {/* Free */}
            <div className={`glass-card ${styles.pricingCard}`}>
              <div className={styles.planLabel}>Free</div>
              <div className={styles.planPrice}>
                <span className={styles.planPriceAmount}>$0</span>
                <span className={styles.planPricePer}>/month</span>
              </div>
              <p className={styles.planDesc}>Perfect for getting started with habit accountability.</p>
              <ul className={styles.planFeatures}>
                {[
                  '3 free Challenge Passes',
                  'Steps, running & meditation commitments',
                  'Apple & Google Health sync',
                  'Basic progress tracking',
                  'Streak history',
                  'Home screen widget',
                ].map((f, i) => (
                  <li key={i}>
                    <CheckCircle size={16} className={styles.planCheck} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#download" className={`btn btn-secondary ${styles.planBtn}`} id="plan-free-btn">
                Get Started Free
              </a>
            </div>

            {/* Pro */}
            <div className={`glass-card ${styles.pricingCardPro}`}>
              <div className={styles.proGlow} />
              <div className={styles.planBadge}><Zap size={12} /> Most Popular</div>
              <div className={styles.planLabel}>Pro</div>
              <div className={styles.planPrice}>
                <span className={styles.planPriceAmount}>${proPrice}</span>
                <span className={styles.planPricePer}>/month</span>
              </div>
              <p className={styles.planBillNote}>{proBill}</p>
              <p className={styles.planDesc}>For people serious about building lasting habits.</p>
              <ul className={styles.planFeatures}>
                {[
                  'Unlimited Challenge Passes',
                  'Coin purchase bonus (+10% extra coins)',
                  'Advanced weekly analytics',
                  'Run multiple commitments simultaneously',
                  'Priority health sync',
                  'Gold status badge',
                  'Dedicated support',
                ].map((f, i) => (
                  <li key={i}>
                    <CheckCircle size={16} className={styles.planCheckPro} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#download" className={`btn btn-primary ${styles.planBtn}`} id="plan-pro-btn">
                Start Pro Free Trial
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.testimonialsSection}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>Testimonials</div>
            <h2 className="text-gradient">Real results from real people</h2>
          </div>

          <div className={styles.testimonialsGrid}>
            {[
              {
                quote: 'I\'ve tried every habit app. CommitLock is the only one where I actually fear opening it and seeing I missed my steps. That fear is exactly what I needed.',
                name: 'Marcus T.',
                role: 'Software Engineer',
                avatar: 'M',
              },
              {
                quote: 'Lost 50 coins the first week. Never missed my step goal again. Staking coins is a genius idea—it rewired how I think about skipping a walk.',
                name: 'Priya S.',
                role: 'Product Manager',
                avatar: 'P',
              },
              {
                quote: 'The health sync is seamless. I don\'t have to do anything—CommitLock just knows if I hit my meditation goal or not. It\'s like having an honest personal trainer.',
                name: 'James L.',
                role: 'Founder',
                avatar: 'J',
              },
            ].map(({ quote, name, role, avatar }, i) => (
              <div key={i} className={`glass-card ${styles.testimonialCard}`}>
                <div className={styles.testimonialStars}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} className={styles.starIcon} fill="currentColor" />
                  ))}
                </div>
                <blockquote className={styles.testimonialQuote}>&ldquo;{quote}&rdquo;</blockquote>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{avatar}</div>
                  <div>
                    <div className={styles.testimonialName}>{name}</div>
                    <div className={styles.testimonialRole}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.faqSection}`} id="faq">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionPill}>FAQ</div>
            <h2 className="text-gradient">Questions answered</h2>
            <p>Everything you need to know before your first commitment.</p>
          </div>

          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════
          DOWNLOAD CTA
      ═══════════════════════════════════════════════════════ */}
      <Section className={`${styles.section} ${styles.ctaSection}`} id="download">
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <div className={styles.sectionPill} style={{ alignSelf: 'center', marginBottom: '2rem' }}>Download</div>
            <h2>Ready to lock in your first commitment?</h2>
            <p>Join 50,000+ users building better habits with real accountability.</p>

            <div className={styles.storeButtons}>
              <a href="#" className={`btn btn-primary ${styles.storeBtn}`} id="download-ios-btn" aria-label="Download on the App Store">
                <svg width="20" height="24" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-149.3-77.2C155.1 793.5 97 684.6 97 578.4c0-197.7 133.6-302.1 266.4-302.1 70.9 0 130 46.4 174.4 46.4 42.8 0 109.7-50.8 191.3-50.8.1.1 60.1 5.8 107 56.6zm-174.6-209.5c33.5-39.9 57.9-95.7 57.9-151.5 0-7.7-.6-15.4-1.9-22.4-55.1 2-120.9 36.8-161.3 84.5-30.5 35.8-59.5 91.4-59.5 148 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.4 1.3 49.9 0 112.7-33.5 149.5-79.1z" />
                </svg>
                <div className={styles.storeBtnText}>
                  <span>Download on the</span>
                  <strong>App Store</strong>
                </div>
              </a>

              <a href="#" className={`btn btn-secondary ${styles.storeBtn}`} id="download-android-btn" aria-label="Get it on Google Play">
                <svg width="20" height="22" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                  <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l2.7 1.5 247.2-247v-5.8L47 0zm215.1 511.7l-2.7-1.5-247.2-247 2.7-1.5 247.2-247 2.7 1.5 247.2 247-2.7 1.5-247.2 247z" />
                  <path d="M452.5 276.4l-80.6 46.3-87.8-87.8 87.8-87.8 80.6 46.3c22.9 13.2 22.9 69.8 0 83z" />
                </svg>
                <div className={styles.storeBtnText}>
                  <span>Get it on</span>
                  <strong>Google Play</strong>
                </div>
              </a>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}
