import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gmail OAuth
  const handleGmailLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/gmail`;
  };

  // LinkedIn OAuth
  const handleLinkedInLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/linkedin`;
  };

  // Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/magic-link/send`, {
        email,
      });

      setLoginMethod(null);
      alert('Check your email for the magic link!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/otp/send`, {
        phone,
      });

      // Show OTP verification form
      setLoginMethod('otp-verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
      <h1>Sign In to HRVerified Resume</h1>

      {!loginMethod ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleGmailLogin}
            style={{
              padding: '12px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2563EB',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Sign in with Gmail
          </button>

          <button
            onClick={handleLinkedInLogin}
            style={{
              padding: '12px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#0A66C2',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Sign in with LinkedIn
          </button>

          <button
            onClick={() => setLoginMethod('magic-link')}
            style={{
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Sign in with Email (Magic Link)
          </button>

          <button
            onClick={() => setLoginMethod('otp')}
            style={{
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Sign in with Phone (OTP)
          </button>
        </div>
      ) : loginMethod === 'magic-link' ? (
        <form onSubmit={handleMagicLink}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
          <button onClick={() => setLoginMethod(null)}>Back</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      ) : loginMethod === 'otp' ? (
        <form onSubmit={handleSendOTP}>
          <input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
          <button onClick={() => setLoginMethod(null)}>Back</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      ) : null}
    </div>
  );
}
