import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { KeyRound, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusedField, setFocusedField] = useState('');

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
        background: 'radial-gradient(circle at 10% 20%, rgba(4, 21, 45, 1) 0%, rgba(14, 18, 30, 1) 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0) 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          margin: '1.5rem',
          padding: '2.5rem 2.25rem',
          borderRadius: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        {/* BRAND LOGO HEADER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              backdropFilter: 'blur(10px)',
            }}
          >
            <img src="/favicon.svg" alt="Almas Logo" style={{ width: '40px', height: '40px' }} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 850,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.75px',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
            }}
          >
            ALMAS ACCS ERP
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.25px',
              textAlign: 'center',
            }}
          >
            Secure Enterprise Resource Portal
          </p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'shake 0.3s ease-in-out',
            }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORM PANEL */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* EMAIL INPUT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="email" style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? '#0ea5e9' : '#64748b',
                  transition: 'color 0.25s ease',
                }}
              />
              <input
                id="email"
                type="email"
                placeholder="admin@almasaccessories.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: focusedField === 'email' ? '1px solid #0ea5e9' : '1px solid rgba(255,255,255,0.08)',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  transition: 'all 0.25s ease',
                  boxShadow: focusedField === 'email' ? '0 0 12px rgba(14, 165, 233, 0.15)' : 'none',
                }}
                required
                autoFocus
              />
            </div>
          </div>

          {/* PASSWORD INPUT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="password" style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={16}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? '#0ea5e9' : '#64748b',
                  transition: 'color 0.25s ease',
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: focusedField === 'password' ? '1px solid #0ea5e9' : '1px solid rgba(255,255,255,0.08)',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  transition: 'all 0.25s ease',
                  boxShadow: focusedField === 'password' ? '0 0 12px rgba(14, 165, 233, 0.15)' : 'none',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  transition: 'color 0.25s ease',
                }}
              >
                {showPassword ? <EyeOff size={16} style={{ color: '#0ea5e9' }} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* SIGN IN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.925rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px -6px rgba(14, 165, 233, 0.35)',
              transition: 'all 0.25s ease',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(14, 165, 233, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px -6px rgba(14, 165, 233, 0.35)';
              }
            }}
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Sign In securely</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* SHAKE ANIMATION CSS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
