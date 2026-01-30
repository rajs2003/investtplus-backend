const API_BASE = window.location.origin + '/v1';

// Auto redirect if already logged in
if (localStorage.getItem('token')) {
  window.location.replace('../../dashboard/index.html');
}

// DOM Elements
const form = document.getElementById('loginForm');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const toggleBtn = document.querySelector('.password-toggle');
const toggleText = document.getElementById('toggleText');
const messageEl = document.getElementById('message');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const loginBtn = document.getElementById('loginBtn');

// Add input animations and validation
phoneInput.addEventListener('input', (e) => {
  // Only allow numbers
  e.target.value = e.target.value.replace(/\D/g, '');

  // Limit to 10 digits
  if (e.target.value.length > 10) {
    e.target.value = e.target.value.slice(0, 10);
  }

  // Real-time validation feedback
  if (e.target.value.length === 10) {
    e.target.style.borderColor = '#00aa00';
  } else if (e.target.value.length > 0) {
    e.target.style.borderColor = '#ff4444';
  } else {
    e.target.style.borderColor = 'rgba(102, 126, 234, 0.1)';
  }
});

passwordInput.addEventListener('input', (e) => {
  // Real-time password strength indicator
  const strength = getPasswordStrength(e.target.value);
  if (e.target.value.length >= 6) {
    e.target.style.borderColor = strength > 2 ? '#00aa00' : '#ffaa00';
  } else if (e.target.value.length > 0) {
    e.target.style.borderColor = '#ff4444';
  } else {
    e.target.style.borderColor = 'rgba(102, 126, 234, 0.1)';
  }
});

// Password strength checker
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
}

// Toggle password visibility
toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleText.textContent = isHidden ? 'Hide' : 'Show';

  // Add visual feedback
  toggleBtn.style.transform = 'translateY(-50%) scale(0.95)';
  setTimeout(() => {
    toggleBtn.style.transform = 'translateY(-50%) scale(1)';
  }, 100);
});

// Enhanced message display
function showMessage(msg, type, duration = 5000) {
  messageEl.textContent = msg;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  if (type === 'success' && duration > 0) {
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, duration);
  }
}

// Form submission with enhanced validation
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const phone = phoneInput.value.trim();
  const password = passwordInput.value;

  // Enhanced validation
  if (!phone || !/^\d{10}$/.test(phone)) {
    showMessage('Please enter a valid 10-digit phone number', 'error');
    phoneInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    showMessage('Password must be at least 6 characters long', 'error');
    passwordInput.focus();
    return;
  }

  // Show loading state with animation
  loginBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.textContent = 'Logging in...';
  loginBtn.style.transform = 'translateY(-1px)';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    if (!data?.tokens?.access?.token) {
      throw new Error('Invalid response: missing authentication tokens');
    }

    // Store authentication data
    localStorage.setItem('token', data.tokens.access.token);
    localStorage.setItem('refreshToken', data.tokens.refresh.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Success feedback
    showMessage('Login successful! Redirecting to dashboard...', 'success', 2000);

    // Smooth redirect with delay
    setTimeout(() => {
      window.location.replace('../../dashboard/index.html');
    }, 1500);
  } catch (err) {
    console.error('Login error:', err);

    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (err.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (err.message.includes('401') || err.message.toLowerCase().includes('credential')) {
      errorMessage = 'Invalid phone number or password. Please check your credentials.';
    } else if (err.message.includes('429')) {
      errorMessage = 'Too many login attempts. Please wait a moment and try again.';
    } else if (err.message) {
      errorMessage = err.message;
    }

    showMessage(errorMessage, 'error');

    // Reset form state with animation
    passwordInput.value = '';
    passwordInput.style.borderColor = 'rgba(102, 126, 234, 0.1)';
  } finally {
    // Reset button state
    loginBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Login';
    loginBtn.style.transform = '';
  }
});

// Enter key support for better UX
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !loginBtn.disabled) {
    form.dispatchEvent(new Event('submit'));
  }
});

// Auto-focus first empty field
document.addEventListener('DOMContentLoaded', () => {
  if (!phoneInput.value) {
    phoneInput.focus();
  } else if (!passwordInput.value) {
    passwordInput.focus();
  }
});
