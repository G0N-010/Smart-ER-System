// LoginPage — Premium split-screen login with teal brand panel + mountain silhouettes
// Design: Zodiak (DM Serif Display) serif + Plus Jakarta Sans, teal #2d9b88 primary
// Features: glassmorphism, floating particles, glowing inputs, animated logo
import React, { useState } from 'react';
import type { LoginState } from '../simulation/types';
import { DEMO_USERS } from '../constants/medicalData';
import { Eye, EyeOff, AlertCircle, ArrowRight, Heart } from 'lucide-react';

interface LoginPageProps {
  onLogin: (loginState: LoginState) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1200));

    const user = DEMO_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      onLogin({
        isAuthenticated: true,
        user: { name: user.name, role: user.role, avatar: user.avatar },
      });
    } else {
      setError('Invalid credentials. Use a quick access option below.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demo: typeof DEMO_USERS[0]) => {
    setUsername(demo.username);
    setPassword(demo.password);
    // Auto-login immediately
    setIsLoading(true);
    setTimeout(() => {
      onLogin({
        isAuthenticated: true,
        user: { name: demo.name, role: demo.role, avatar: demo.avatar },
      });
    }, 600);
  };

  return (
    <div className="login-split-container">
      {/* ═══════════ LEFT BRAND PANEL ═══════════ */}
      <div className="login-brand-panel">
        {/* Grid pattern overlay */}
        <div className="login-grid-pattern" />

        {/* Top brand accent */}
        <div className="login-brand-accent">
          <div className="login-brand-line" />
          <span className="login-brand-label">SMART ER PLATFORM</span>
        </div>

        {/* Central heading */}
        <div className="login-brand-content">
          <h1 className="login-brand-heading">
            Where every<br />
            <em>second</em><br />
            counts.
          </h1>
          <p className="login-brand-subtext">
            AI-powered emergency room triage and resource allocation — 
            optimizing patient care when it matters most.
          </p>
        </div>

        {/* Mountain silhouettes */}
        <div className="login-mountain-1" />
        <div className="login-mountain-2" />

        {/* Copyright footer */}
        <div className="login-brand-footer">
          © 2026 SmartER. Built for better healthcare outcomes.
        </div>
      </div>

      {/* ═══════════ RIGHT FORM PANEL ═══════════ */}
      <div className="login-form-panel">
        {/* Floating background particles */}
        <div className="login-particle login-particle-1" />
        <div className="login-particle login-particle-2" />
        <div className="login-particle login-particle-3" />

        {/* Form container */}
        <div className="login-form-wrapper">
          {/* Logo with animated glow */}
          <div className="login-logo-section">
            <div className="login-logo-glow" />
            <div className="login-logo-icon">
              <Heart className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="login-form-title">Welcome back</h2>
            <p className="login-form-subtitle">
              Sign in to access the SmartER dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="login-form-fields">
            {/* Username */}
            <div className="login-field-group">
              <label className="login-field-label">Username</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="login-premium-input"
                  required
                  autoComplete="username"
                  id="login-username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field-group">
              <label className="login-field-label">Password</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-premium-input login-input-password"
                  required
                  autoComplete="current-password"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="login-options-row">
              <label className="login-remember-label" id="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                  id="remember-me-checkbox"
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-forgot-btn">
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error-box">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="login-submit-btn"
              id="login-submit-button"
            >
              {isLoading ? (
                <span className="login-btn-loading">
                  <svg className="login-spinner" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="login-btn-content">
                  Sign in to Dashboard
                  <ArrowRight className="login-btn-arrow" />
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">Quick Demo Access</span>
            <div className="login-divider-line" />
          </div>

          {/* Demo Users */}
          <div className="login-demo-grid">
            {DEMO_USERS.map((user) => (
              <button
                key={user.username}
                onClick={() => handleQuickLogin(user)}
                className="login-demo-btn"
                id={`quick-login-${user.username}`}
              >
                <span className="login-demo-avatar">{user.avatar}</span>
                <div className="login-demo-info">
                  <span className="login-demo-name">{user.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className="login-demo-role">{user.role}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="login-form-footer">
            🔒 Simulated login — No real patient data is used
          </p>
        </div>
      </div>
    </div>
  );
}
