// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Alert {
  id: string;
  summary: string;
  created_at: string;
  emailed: boolean;
}

interface Monitor {
  id: string;
  competitor_name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  alerts: Alert[];
}

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMonitorsByEmail = useCallback(async (emailToFetch: string) => {
    if (!emailToFetch) return;
    setLoading(true);
    setError('');
    setSearchEmail(emailToFetch);
    try {
      const res = await fetch(`/api/monitors?email=${encodeURIComponent(emailToFetch)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch monitors');
      } else {
        setMonitors(data.monitors || []);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fill + auto-fetch when ?email= is present in the URL (e.g. from confirmation email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
      fetchMonitorsByEmail(urlEmail);
    }
  }, [fetchMonitorsByEmail]);

  async function fetchMonitors(e: React.FormEvent) {
    e.preventDefault();
    fetchMonitorsByEmail(email);
  }

  async function deleteMonitor(id: string) {
    if (!confirm('Remove this monitor?')) return;

    const res = await fetch(`/api/monitors?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMonitors((prev) => prev.filter((m) => m.id !== id));
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📡</span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>
            Your Monitors
          </h1>
        </div>
        <a href="/" style={{ color: '#6b7280', fontSize: 14 }}>← Add new monitor</a>
      </div>

      {/* Email lookup form */}
      <form onSubmit={fetchMonitors} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email to view monitors"
          required
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'View Monitors'}
        </button>
      </form>

      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {searchEmail && !loading && monitors.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
          No monitors found for {searchEmail}.<br />
          <a href="/" style={{ color: '#3b82f6' }}>Add your first monitor →</a>
        </div>
      )}

      {/* Monitor list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {monitors.map((monitor) => (
          <div
            key={monitor.id}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: '#111' }}>
                  {monitor.competitor_name}
                </h3>
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#6b7280', wordBreak: 'break-all' }}
                >
                  {monitor.url}
                </a>
              </div>
              <button
                onClick={() => deleteMonitor(monitor.id)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#dc2626',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>

            {/* Alerts */}
            {monitor.alerts.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                No pricing changes detected yet. Checks run daily.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  {monitor.alerts.length} alert{monitor.alerts.length !== 1 ? 's' : ''} detected
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monitor.alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}
                    >
                      <div style={{ fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                        {alert.summary}
                      </div>
                      <div style={{ fontSize: 12, color: '#b45309' }}>
                        {new Date(alert.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {alert.emailed ? ' · Email sent ✓' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
