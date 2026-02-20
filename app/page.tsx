// app/page.tsx
'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
        setMessage('✅ Monitor added! You\'ll receive email alerts when pricing changes are detected.');
        setCompetitorName('');
        setUrl('');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>📡</span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111' }}>
            Competitor Pricing Radar
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 18, color: '#555', lineHeight: 1.6 }}>
          Get instant email alerts when your competitors change their pricing.
          Set it up once, monitor forever.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 48 }}>
        {[
          { icon: '🔗', title: 'Add URL', desc: 'Paste your competitor\'s pricing page URL' },
          { icon: '👁️', title: 'We Watch', desc: 'We check it daily using AI' },
          { icon: '📧', title: 'Get Alerted', desc: 'Email when pricing changes are detected' },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#111' }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: '#111' }}>
          Start Monitoring
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Your Email
            </label>
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
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Competitor Name
            </label>
            <input
              type="text"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="Acme Corp"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Pricing Page URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://competitor.com/pricing"
              required
              style={inputStyle}
            />
          </div>

          {message && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
                background: status === 'success' ? '#f0fdf4' : '#fef2f2',
                color: status === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: status === 'loading' ? '#9ca3af' : '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {status === 'loading' ? 'Setting up monitor...' : 'Start Monitoring →'}
          </button>
        </form>
      </div>

      {/* Dashboard link */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <a href="/dashboard" style={{ color: '#6b7280', fontSize: 14 }}>
          View your monitors & alerts →
        </a>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 48, color: '#9ca3af', fontSize: 13 }}>
        Checks run daily • Only meaningful pricing changes trigger alerts • No spam
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 15,
  color: '#111',
  outline: 'none',
  boxSizing: 'border-box',
};
