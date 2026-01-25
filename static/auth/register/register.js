/* eslint-disable no-unused-vars */
const API_BASE = window.location.origin + '/v1';

// Auto redirect if already logged in
if (localStorage.getItem('token')) {
  window.location.replace('../../dashboard/index.html');
}

// DOM Elements
const form = document.getElementById('registerForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('termsAccepted');
const messageEl = document.getElementById('message');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const registerBtn = document.getElementById('registerBtn');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const passwordStrength = document.getElementById('passwordStrength');

// Password toggle functionality
const toggleButtons = document.querySelectorAll('.password-toggle');
toggleButtons.forEach((btn, index) => {
  btn.addEventListener('click', () => {
    const input = index === 0 ? passwordInput : confirmPasswordInput;
    const text = index === 0 ? document.getElementById('toggleText') : document.getElementById('toggleText2');

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    text.textContent = isHidden ? 'Hide' : 'Show';

    // Visual feedback
    btn.style.transform = 'translateY(-50%) scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'translateY(-50%) scale(1)';
    }, 100);
  });
});

// Real-time validation functions
function validateName(input) {
  const value = input.value.trim();
  const isValid = value.length >= 2 && /^[a-zA-Z\s]+$/.test(value);

  input.classList.toggle('valid', isValid && value.length > 0);
  input.classList.toggle('invalid', !isValid && value.length > 0);

  return isValid;
}

function validateEmail(input) {
  const value = input.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(value);

  input.classList.toggle('valid', isValid);
  input.classList.toggle('invalid', !isValid && value.length > 0);

  return isValid;
}

function validatePhone(input) {
  const value = input.value.trim();
  const isValid = /^\d{10}$/.test(value);

  input.classList.toggle('valid', isValid);
  input.classList.toggle('invalid', !isValid && value.length > 0);

  return isValid;
}

function getPasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password),
  };

  score = Object.values(checks).filter(Boolean).length;

  return {
    score,
    checks,
    level: score < 2 ? 'weak' : score < 4 ? 'fair' : score < 5 ? 'good' : 'strong',
  };
}

function updatePasswordStrength(password) {
  const strength = getPasswordStrength(password);

  if (password.length === 0) {
    passwordStrength.classList.remove('visible');
    strengthText.textContent = 'Enter a password';
    return;
  }

  passwordStrength.classList.add('visible');
  strengthBar.className = `strength-bar ${strength.level}`;

  const messages = {
    weak: 'Very weak password',
    fair: 'Weak password',
    good: 'Good password',
    strong: 'Strong password',
  };
  strengthText.textContent = messages[strength.level];
  const suggestions = [];
  if (!strength.checks.length) suggestions.push('at least 8 characters');
  if (!strength.checks.lowercase) suggestions.push('lowercase letters');
  if (!strength.checks.uppercase) suggestions.push('uppercase letters');
  if (!strength.checks.numbers) suggestions.push('numbers');
  if (!strength.checks.symbols) suggestions.push('special characters');
  if (suggestions.length > 0 && strength.level !== 'strong') {
    strengthText.textContent += ` - Add ${suggestions.slice(0, 2).join(' and ')}`;
  }
}

function validatePasswordMatch() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const isValid = password === confirmPassword && password.length > 0;

  confirmPasswordInput.classList.toggle('valid', isValid);
  confirmPasswordInput.classList.toggle('invalid', !isValid && confirmPassword.length > 0);

  return isValid;
}

// Real-time validation event listeners
firstNameInput.addEventListener('input', () => validateName(firstNameInput));
lastNameInput.addEventListener('input', () => validateName(lastNameInput));
emailInput.addEventListener('input', () => validateEmail(emailInput));

phoneInput.addEventListener('input', (e) => {
  // Only allow numbers
  e.target.value = e.target.value.replace(/\\D/g, '');

  // Limit to 10 digits
  if (e.target.value.length > 10) {
    e.target.value = e.target.value.slice(0, 10);
  }

  validatePhone(phoneInput);
});

passwordInput.addEventListener('input', (e) => {
  updatePasswordStrength(e.target.value);
  if (confirmPasswordInput.value) {
    validatePasswordMatch();
  }
});

confirmPasswordInput.addEventListener('input', validatePasswordMatch);

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

// Form submission with comprehensive validation
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const termsAccepted = termsCheckbox.checked;

  // Comprehensive validation
  const validations = [
    {
      check: validateName(firstNameInput),
      message: 'Please enter a valid first name (letters only, min 2 characters)',
      field: firstNameInput,
    },
    {
      check: validateName(lastNameInput),
      message: 'Please enter a valid last name (letters only, min 2 characters)',
      field: lastNameInput,
    },
    { check: validateEmail(emailInput), message: 'Please enter a valid email address', field: emailInput },
    { check: validatePhone(phoneInput), message: 'Please enter a valid 10-digit phone number', field: phoneInput },
    { check: password.length >= 6, message: 'Password must be at least 6 characters long', field: passwordInput },
    { check: validatePasswordMatch(), message: 'Passwords do not match', field: confirmPasswordInput },
    { check: termsAccepted, message: 'You must accept the terms and conditions', field: termsCheckbox },
  ];

  for (const validation of validations) {
    if (!validation.check) {
      showMessage(validation.message, 'error');
      validation.field.focus();
      return;
    }
  }

  // Show loading state
  registerBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.textContent = 'Creating Account...';
  registerBtn.style.transform = 'translateY(-1px)';

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        phoneNumber: phone,
        password: password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    if (!data?.tokens?.access?.token) {
      throw new Error('Registration successful but authentication failed. Please try logging in.');
    }

    // Store authentication data
    localStorage.setItem('token', data.tokens.access.token);
    localStorage.setItem('refreshToken', data.tokens.refresh.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Success feedback
    showMessage('Account created successfully! Redirecting to dashboard...', 'success', 2000);

    // Smooth redirect with delay
    setTimeout(() => {
      window.location.replace('../../dashboard/index.html');
    }, 1500);
  } catch (err) {
    console.error('Registration error:', err);

    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (err.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (err.message.includes('409') || err.message.toLowerCase().includes('already exists')) {
      errorMessage = 'An account with this email or phone number already exists.';
    } else if (err.message.includes('400')) {
      errorMessage = 'Please check your information and try again.';
    } else if (err.message.includes('429')) {
      errorMessage = 'Too many registration attempts. Please wait a moment and try again.';
    } else if (err.message) {
      errorMessage = err.message;
    }

    showMessage(errorMessage, 'error');
  } finally {
    // Reset button state
    registerBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Create Account';
    registerBtn.style.transform = '';
  }
});

// Enter key support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !registerBtn.disabled) {
    form.dispatchEvent(new Event('submit'));
  }
});

// Auto-focus first empty field
document.addEventListener('DOMContentLoaded', () => {
  const fields = [firstNameInput, lastNameInput, emailInput, phoneInput, passwordInput, confirmPasswordInput];
  const emptyField = fields.find((field) => !field.value);
  if (emptyField) {
    emptyField.focus();
  }
});

// Form reset helper
function resetForm() {
  form.reset();
  document.querySelectorAll('.valid, .invalid').forEach((el) => {
    el.classList.remove('valid', 'invalid');
  });
  passwordStrength.classList.remove('visible');
  messageEl.style.display = 'none';
}
