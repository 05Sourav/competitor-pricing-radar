// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInContainer, FadeInItem } from '@/components/animations/FadeIn';
import { RevealOnScroll } from '@/components/animations/RevealOnScroll';
import { Floating } from '@/components/animations/Floating';

export default function Home() {
  const [email, setEmail] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // ── Navbar scroll effect state ──
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, competitorName, url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      } else {
        setStatus('success');
        setMessage("✅ Monitor added! A confirmation email is on its way — if you don't see it, check your spam or Promotions folder and mark us as a trusted sender so you never miss an alert.");
        setCompetitorName('');
        setUrl('');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="mesh-bg" style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#111', minHeight: '100vh', transition: 'background 0.5s ease' }}>

      {/* ── NAVBAR — with scroll-triggered blur/shadow ── */}
      <motion.nav
        animate={{
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.08)' : '0 0px 0px rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="nav-container glass-nav"
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid #f0f0f0',
          padding: '0 40px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
          <img src="/logo.svg?v=2" alt="Pricing Radar" style={{ height: 150, width: 150 }} />
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 32, fontSize: 14, color: '#555' }}>
          <a href="#how-it-works" style={navLinkStyle}>How It Works</a>
          <a href="#preview"      style={navLinkStyle}>Sample Alert</a>
          <a href="#features"     style={navLinkStyle}>Benefits</a>
        </div>
        <a href="#form">
          {/* CTA scale on hover/active */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 999, padding: '8px 20px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Start Free
          </motion.button>
        </a>
      </motion.nav>

      {/* ── HERO — staggered entrance ── */}
      <section className="hero-section" style={{
        maxWidth: 760, margin: '0 auto', textAlign: 'center',
        padding: '62px 24px 80px',
      }}>
        <FadeInContainer>
          {/* Badge */}
          <FadeInItem>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#eff6ff', color: '#2563eb',
              border: '1px solid #bfdbfe', borderRadius: 999,
              padding: '4px 14px', fontSize: 13, fontWeight: 500, marginBottom: 28,
            }}>
              <span>🔔</span>
              Pricing Radar — Free Early Access
            </div>
          </FadeInItem>

          {/* Headline */}
          <FadeInItem>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
              Never Miss a Competitor{' '}
              <span style={{ color: '#2563eb' }}>Pricing Change</span>{' '}
              Again
            </h1>
          </FadeInItem>

          {/* Subheadline */}
          <FadeInItem>
            <p style={{ fontSize: 18, color: '#555', lineHeight: 1.7, margin: '0 0 8px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
              AI-powered daily monitoring that tracks updates, discounts, and plan changes
              so you don't have to. Early Beta — looking for founding users.
            </p>
            <p style={{ fontSize: 13, color: '#999', margin: '0 0 36px' }}>
              Designed for SaaS founders and product teams
            </p>
          </FadeInItem>

          {/* CTA */}
          <FadeInItem>
            <a href="#form">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '14px 36px', fontSize: 16,
                  fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
                }}
              >
                Track Competitor Pricing — Free
              </motion.button>
            </a>
            <p style={{ fontSize: 13, color: '#999', marginTop: 12 }}>
              🔒 No signup required — takes 10 seconds
            </p>
          </FadeInItem>
        </FadeInContainer>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <RevealOnScroll>
            <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Set up in minutes</h2>
            <p style={{ color: '#666', fontSize: 16, margin: '0 0 48px' }}>
              Our simple three-step process keeps you in the loop effortlessly
            </p>
          </RevealOnScroll>

          <div className="responsive-grid-3">
            {[
              {
                icon: '🔗',
                title: 'Add URL',
                desc: "Paste that competitor's pricing page link. No API keys or coding needed.",
              },
              {
                icon: '👁️',
                title: 'We Watch Daily',
                desc: 'Our AI scans for any structural or value changes, including hidden discounts.',
              },
              {
                icon: '📧',
                title: 'Get Email Alerts',
                desc: 'Receive a direct summary the moment prices shift. Only when it matters.',
              },
            ].map((step, i) => (
              <RevealOnScroll key={step.title} delay={i * 0.1} style={{ height: '100%' }}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.09)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{
                    background: '#fff', border: '1px solid #e8e8e8',
                    borderRadius: 16, padding: '32px 24px', textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'default',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: '#eff6ff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 24, margin: '0 auto 16px',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{step.desc}</div>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAMPLE ALERT PREVIEW — with floating effect ── */}
      <section id="preview" className="section-padding" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <RevealOnScroll>
            <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Sample Alert Preview</h2>
            <p style={{ color: '#666', fontSize: 16, margin: '0 0 48px' }}>This is what your inbox will look like</p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1}>
            <Floating>
              {/* Mock email card — polished website showcase */}
              <div style={{
                background: '#fff',
                border: '1px solid #e0e7ff',
                borderRadius: 20,
                boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 20px 60px rgba(37,99,235,0.13), 0 4px 16px rgba(0,0,0,0.06)',
                textAlign: 'left',
                overflow: 'hidden',
              }}>

                {/* macOS window chrome */}
                <div style={{ background: '#f0f0f0', padding: '10px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} />
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#ffbd2e', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} />
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    pricingradar.xyz — Inbox
                  </span>
                  <div style={{ width: 52 }} />
                </div>

                {/* Brand header — gradient accent */}
                <div style={{
                  background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                  padding: '22px 32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
                    Competitor Pricing Radar
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#a1a1aa',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 99, padding: '3px 10px', letterSpacing: '0.04em',
                  }}>ALERT</span>
                </div>

                {/* Title + badge row */}
                <div style={{ padding: '26px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 800, color: '#18181b', letterSpacing: '-0.02em' }}>
                      Pricing Change Detected
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>
                      on <strong style={{ color: '#18181b' }}>Acme SaaS</strong>
                    </p>
                  </div>
                  {/* Change type badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                    fontSize: 12, fontWeight: 700, padding: '5px 13px', borderRadius: 99,
                    boxShadow: '0 0 0 3px rgba(239,68,68,0.08)',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    Price Change
                  </span>
                </div>

                {/* Before / After visual comparison */}
                <div style={{ padding: '20px 32px' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
                    alignItems: 'center', background: '#f8faff',
                    border: '1px solid #e0e7ff', borderRadius: 14, padding: '20px 24px',
                  }}>
                    {/* Before */}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Before</p>
                      <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.03em' }}>$49</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>/ month · Pro</p>
                    </div>
                    {/* Arrow */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                      fontSize: 16, color: '#fff', flexShrink: 0,
                    }}>→</div>
                    {/* After */}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Now</p>
                      <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.03em' }}>$59</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>/ month · Pro</p>
                    </div>
                  </div>
                </div>

                {/* Detected timestamp row */}
                <div style={{ padding: '0 32px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#71717a', fontSize: 12 }}>
                    <span>🕑</span>
                    <span>Detected: <strong style={{ color: '#374151' }}>February 28, 2026, 02:00 AM UTC</strong></span>
                  </div>
                </div>

                {/* Summary callout */}
                <div style={{ padding: '0 32px 20px' }}>
                  <div style={{
                    background: '#fefce8', borderLeft: '4px solid #facc15',
                    borderRadius: '0 8px 8px 0', padding: '13px 16px',
                  }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#78350f', lineHeight: 1.55 }}>
                      Acme SaaS raised their Pro plan from $49 to $59/month — a 20% price increase.
                    </p>
                  </div>
                </div>

                {/* Source URL */}
                <div style={{ padding: '0 32px 26px' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source URL</p>
                  <a href="#" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                    https://acmesaas.com/pricing
                  </a>
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 32px 18px', borderTop: '1px solid #f4f4f5', background: '#fafafa' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa' }}>You're receiving this because you signed up at pricingradar.xyz</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#a1a1aa' }}>To unsubscribe, reply with 'unsubscribe' in the subject line.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#a1a1aa' }}>pricingradar.xyz | contact: pricingradar@gmail.com</p>
                </div>

              </div>
            </Floating>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── FORM SECTION ── */}
      <section id="form" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <RevealOnScroll>
            <div style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20,
              padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', position: 'relative',
            }}>
              {/* Radar icon decoration */}
              <div style={{
                position: 'absolute', top: 20, right: 20,
                width: 36, height: 36, borderRadius: '50%',
                background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                📡
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Start Monitoring Now</h2>
              <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px', lineHeight: 1.5 }}>
                We'll start monitoring immediately and email you when pricing changes
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Your Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Competitor Name</label>
                  <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Pricing Page URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://competitor.com/pricing"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* ── Form success/error message with fade + scale animation ── */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      key="form-message"
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      style={{
                        padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
                        background: status === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: status === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
                      }}
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA button with scale micro-interaction */}
                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  whileHover={status !== 'loading' ? { scale: 1.02 } : {}}
                  whileTap={status !== 'loading' ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    width: '100%', padding: '14px 24px',
                    background: status === 'loading' ? '#93c5fd' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 16, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {status === 'loading' ? 'Setting up radar...' : '🗲 Activate Radar'}
                </motion.button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 14, marginBottom: 16 }}>
                Cancel any time, no credit card needed
              </p>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, textAlign: 'center' }}>
                <a href="/dashboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none', fontWeight: 500 }}>
                  I have an account, <span style={{ color: '#2563eb', textDecoration: 'underline' }}>view my monitors</span>
                </a>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1150, margin: '0 auto' }}>
          <div className="responsive-grid-4">
            {[
              {
                icon: '🕐',
                title: 'Daily automated monitoring',
                desc: 'Our bots visit your competitor pages every single day, monitoring hundreds of changes.',
              },
              {
                icon: '🤖',
                title: 'AI-powered detection',
                desc: "No more HTML diffs. Our LLMs score and filter changes and always make sense for you.",
              },
              {
                icon: '🎯',
                title: 'Meaningful alerts only',
                desc: 'We filter out noise so you only get notified about actual pricing shifts.',
              },
              {
                icon: '🔒',
                title: 'Privacy first approach',
                desc: "We don't use your data beyond what's needed to notify you.",
              },
            ].map((f, i) => (
              <RevealOnScroll key={f.title} delay={i * 0.08} style={{ height: '100%' }}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{
                    padding: '28px 24px',
                    cursor: 'default',
                    borderRadius: 16,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, marginBottom: 14,
                  }}>
                    {f.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#111' }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer-container glass-footer" style={{
        padding: '0px 40px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'center', height: 120,
      }}>
        {/* Left — logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo.svg?v=2" alt="Pricing Radar" style={{ height: 120, width: 120 }} />
        </div>
        {/* Center — links */}
        <div className="footer-links" style={{ display: 'flex', gap: 24, fontSize: 13, color: '#374151', alignItems: 'center', justifyContent: 'center' }}>
          <a href="https://twitter.com" target="_blank" rel="noopener" style={footerLinkStyle}>Twitter</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener" style={footerLinkStyle}>LinkedIn</a>
          <a href="mailto:pricingradar@gmail.com" style={footerLinkStyle}>pricingradar@gmail.com</a>
        </div>
        {/* Right — copyright */}
        <div className="footer-copyright" style={{ fontSize: 13, color: '#4b5563', textAlign: 'right' }}>
          © 2026 Competitor Pricing Radar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// ── Styles ──

const navLinkStyle: React.CSSProperties = {
  color: '#555', textDecoration: 'none', fontWeight: 500, fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  marginBottom: 6, color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 15, color: '#111', outline: 'none',
  boxSizing: 'border-box', background: '#fafafa',
  transition: 'border-color 0.15s',
};

const footerLinkStyle: React.CSSProperties = {
  color: '#4b5563', textDecoration: 'none',
};
