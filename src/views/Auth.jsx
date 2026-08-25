import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { KeyRound, Mail, Eye, EyeOff } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.session) {
        onAuthSuccess(data.session);
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg(error.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eef2f6 0%, #e0e7ff 100%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '380px',
          width: '100%',
          padding: '1.75rem 2rem',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          background: '#ffffff',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: '1.6rem',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.2rem',
              letterSpacing: '-1px',
            }}
          >
            ALMAS ERP
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
            Enterprise Resource Planning System
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger-text)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="email"
                type="email"
                placeholder="admin@almasaccessories.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-control"
                style={{
                  paddingLeft: '2.25rem',
                  backgroundColor: '#ffffff',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="password" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-control"
                style={{
                  paddingLeft: '2.25rem',
                  paddingRight: '2.25rem',
                  backgroundColor: '#ffffff',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
