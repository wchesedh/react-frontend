import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateEmail = (value) => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 3) {
      setPasswordError('Password must be at least 3 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      validateEmail(value);
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      validatePassword(value);
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/login', {
        email,
        password,
      });

      if (response.data && response.data.success) {
        // Store all data synchronously before navigation
        localStorage.setItem('isLoggedIn', 'true');
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
          // Set default authorization header for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        
        // Update auth state immediately (synchronously)
        login();
        
        // Navigate immediately - React Router will handle the transition
        navigate('/home', { replace: true });
      } else {
        setError('Login failed. Please check your credentials.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {loading && <div className="login-overlay"></div>}
      <div className="login-background">
        <svg className="login-svg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#4a90e2', stopOpacity: 0.1}} />
              <stop offset="100%" style={{stopColor: '#357abd', stopOpacity: 0.05}} />
            </linearGradient>
          </defs>
          {/* World map outline */}
          <path d="M200,200 Q300,150 400,200 T600,200 Q700,150 800,200 T1000,200" stroke="#4a90e2" strokeWidth="2" fill="none" opacity="0.3"/>
          <path d="M200,400 Q300,350 400,400 T600,400 Q700,350 800,400 T1000,400" stroke="#4a90e2" strokeWidth="2" fill="none" opacity="0.3"/>
          <path d="M200,600 Q300,550 400,600 T600,600 Q700,550 800,600 T1000,600" stroke="#4a90e2" strokeWidth="2" fill="none" opacity="0.3"/>
          {/* Location pins */}
          <circle cx="300" cy="250" r="8" fill="#4a90e2" opacity="0.4"/>
          <circle cx="500" cy="350" r="8" fill="#4a90e2" opacity="0.4"/>
          <circle cx="700" cy="450" r="8" fill="#4a90e2" opacity="0.4"/>
          <circle cx="900" cy="300" r="8" fill="#4a90e2" opacity="0.4"/>
          {/* Grid lines */}
          <line x1="0" y1="200" x2="1200" y2="200" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
          <line x1="0" y1="400" x2="1200" y2="400" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
          <line x1="0" y1="600" x2="1200" y2="600" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
          <line x1="200" y1="0" x2="200" y2="800" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
          <line x1="600" y1="0" x2="600" y2="800" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
          <line x1="1000" y1="0" x2="1000" y2="800" stroke="#4a90e2" strokeWidth="1" opacity="0.1"/>
        </svg>
      </div>
      <div className={`login-card ${loading ? 'loading' : ''}`}>
        <div className="login-header">
          <div className="login-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4a90e2"/>
            </svg>
          </div>
          <h2>IP Geolocation</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => validateEmail(email)}
              className={emailError ? 'error' : ''}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
            />
            {emailError && <span className="field-error">{emailError}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => validatePassword(password)}
              className={passwordError ? 'error' : ''}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
            {passwordError && <span className="field-error">{passwordError}</span>}
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading || !!emailError || !!passwordError} className="submit-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
