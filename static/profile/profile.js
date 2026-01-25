/* eslint-disable no-unused-vars */

// import { email } from "../../src/config/config";

const API_BASE = window.location.origin + '/v1';
let isEditing = false;
let originalData = {};
let currentUser = null;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../auth/login';
}

// Enhanced notification system
class NotificationManager {
  static show(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach((notif) => notif.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getIcon(type)}</div>
                <div class="notification-message">${message}</div>
                <button class="notification-close">&times;</button>
            </div>
        `;

    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 1rem;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }
                .notification.success {
                    border-color: rgba(74, 222, 128, 0.4);
                    background: rgba(74, 222, 128, 0.1);
                }
                .notification.error {
                    border-color: rgba(248, 113, 113, 0.4);
                    background: rgba(248, 113, 113, 0.1);
                }
                .notification.warning {
                    border-color: rgba(251, 191, 36, 0.4);
                    background: rgba(251, 191, 36, 0.1);
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .notification-icon {
                    font-size: 1.5rem;
                    color: rgba(255, 255, 255, 0.9);
                }
                .notification-message {
                    flex: 1;
                    color: rgba(255, 255, 255, 0.9);
                    font-weight: 500;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0;
                    margin-left: auto;
                }
                .notification-close:hover {
                    color: rgba(255, 255, 255, 1);
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    position: relative;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 2rem;
                    min-width: 400px;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    animation: modalSlideIn 0.3s ease;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .modal-header h3 {
                    color: white;
                    margin: 0;
                }
                .modal-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                .modal-close:hover {
                    color: white;
                }
                @keyframes modalSlideIn {
                    from {
                        transform: scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Add event listener for close button
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.remove();
      });
    }

    // Auto remove after duration
    setTimeout(() => {
      notification.remove();
    }, duration);
  }

  static getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || icons.info;
  }
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

// API functions
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      NotificationManager.show('Session expired. Please login again.', 'error');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '../auth/login/index.html';
      }, 2000);
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Load user profile data
async function loadProfileData() {
  try {
    // Load user profile
    const userResponse = await makeRequest(`${API_BASE}/users/profile`);
    if (userResponse) {
      currentUser = userResponse;
      updateProfileDisplay(userResponse);
      storeOriginalData(userResponse);
    }

    // Load user stats (portfolio value, trades, etc.)
    await loadUserStats();

    // Load recent activity
    await loadRecentActivity();

    NotificationManager.show('Profile loaded successfully', 'success', 3000);
  } catch (error) {
    console.error('Error loading profile:', error);
    NotificationManager.show('Failed to load profile data', 'error');
    showErrorState();
  }
}

function updateProfileDisplay(user) {
  // Update user name and email displays
  const userNameElements = document.querySelectorAll('#userName, #displayUserName');
  userNameElements.forEach((el) => {
    if (el) el.textContent = user.name || 'User';
  });

  const emailElement = document.getElementById('displayUserEmail');
  if (emailElement) {
    emailElement.textContent = user.email || '';
  }

  // Update verification status
  const statusElement = document.querySelector('.user-status');
  if (statusElement && user.isEmailVerified !== undefined) {
    statusElement.textContent = user.isEmailVerified ? '✅ Verified' : '⚠️ Not Verified';
  }

  // Update form fields according to user schema
  const fieldMap = {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role || 'user',
    accountSetupCompleted: user.accountSetupCompleted ? 'Completed' : 'Pending',
    isEmailVerified: user.isEmailVerified ? 'Verified' : 'Not Verified',
  };

  Object.keys(fieldMap).forEach((field) => {
    const element = document.getElementById(field);
    if (element) {
      element.value = fieldMap[field] || '';
    }
  });

  // Update avatar
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    if (user.avatar) {
      avatar.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      avatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
  }

  // Update member since
  const memberSince = document.getElementById('memberSince');
  if (memberSince && user.createdAt) {
    memberSince.textContent = formatDate(user.createdAt);
  }
}

function storeOriginalData(user) {
  originalData = { ...user };
}

async function loadUserStats() {
  try {
    // Load portfolio data for stats
    const portfolioResponse = await makeRequest(`${API_BASE}/portfolio/summary`);

    if (portfolioResponse) {
      const portfolioValue = document.getElementById('portfolioValue');
      if (portfolioValue) {
        portfolioValue.textContent = formatCurrency(portfolioResponse.totalValue || 0);
      }
    }

    // Mock total trades (replace with actual API call)
    const totalTrades = document.getElementById('totalTrades');
    if (totalTrades) {
      totalTrades.textContent = Math.floor(Math.random() * 100) + 10; // Mock data
    }
  } catch (error) {
    console.error('Error loading user stats:', error);
    // Don't show error notification for stats as it's secondary data
  }
}

async function loadRecentActivity() {
  const activityContainer = document.getElementById('activityTimeline');
  if (!activityContainer) return;

  try {
    // Mock activity data (replace with actual API call)
    const activities = [
      {
        title: 'Profile Updated',
        description: 'Personal information updated',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        title: 'Password Changed',
        description: 'Account password successfully updated',
        time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        title: 'Login from New Device',
        description: 'Signed in from Chrome on Windows',
        time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        title: 'Security Settings Updated',
        description: 'Two-factor authentication enabled',
        time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      },
    ];

    activityContainer.innerHTML = activities
      .map(
        (activity) => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                    <div class="timeline-time">${formatDate(activity.time)}</div>
                </div>
            </div>
        `,
      )
      .join('');
  } catch (error) {
    console.error('Error loading activity:', error);
    activityContainer.innerHTML = '<div class="loading">Failed to load activity</div>';
  }
}

function showErrorState() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: rgba(255, 255, 255, 0.8);">
                <h2>Failed to load profile</h2>
                <p style="margin: 1rem 0;">Please try refreshing the page</p>
                <button onclick="location.reload()" style="padding: 0.75rem 2rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
  }
}

// Edit functionality
function toggleEdit() {
  isEditing = !isEditing;
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const formInputs = document.querySelectorAll('.form-input');

  if (isEditing) {
    // Enable editing
    editBtn.style.display = 'none';
    saveBtn.style.display = 'flex';

    formInputs.forEach((input) => {
      // Only allow editing for name, phoneNumber - keep email, role, etc readonly
      if (input.id === 'name' || input.id === 'phoneNumber') {
        input.disabled = false;
      }
    });

    NotificationManager.show('Edit mode enabled. You can update name and phone number.', 'info', 3000);
  } else {
    // Disable editing
    editBtn.style.display = 'flex';
    saveBtn.style.display = 'none';

    formInputs.forEach((input) => {
      input.disabled = true;
    });

    // Restore original data
    if (currentUser) {
      updateProfileDisplay(currentUser);
    }

    NotificationManager.show('Edit mode disabled', 'info', 2000);
  }
}

async function saveProfile() {
  try {
    // Collect only editable form data according to updateCurrentUser validation
    const formData = {
      name: document.getElementById('name').value?.trim(),
      phoneNumber: document.getElementById('phoneNumber').value?.trim(),
    };

    // Validate required fields
    if (!formData.name || formData.name.length < 2) {
      NotificationManager.show('Name is required (min 2 characters)', 'error');
      return;
    }

    if (!formData.phoneNumber || !/^[0-9]{10}$/.test(formData.phoneNumber)) {
      NotificationManager.show('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    // Update profile via API
    const response = await makeRequest(`${API_BASE}/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });

    if (response) {
      currentUser = { ...currentUser, ...response };
      toggleEdit(); // Exit edit mode
      NotificationManager.show('Profile updated successfully', 'success');

      // Update displays
      updateProfileDisplay(currentUser);
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    NotificationManager.show(error.message || 'Failed to save profile', 'error');
  }
}

// Avatar upload
function uploadAvatar() {
  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput) {
    avatarInput.click();
  }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    NotificationManager.show('Please select an image file', 'error');
    return;
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    NotificationManager.show('Image size must be less than 5MB', 'error');
    return;
  }

  // Create preview
  const reader = new FileReader();
  reader.onload = function (e) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }

    // TODO: Upload to server
    NotificationManager.show('Avatar updated successfully', 'success');
  };

  reader.readAsDataURL(file);
}

// Security functions
function changePassword() {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closePasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.style.display = 'none';

    // Clear form
    const form = document.getElementById('passwordForm');
    if (form) {
      form.reset();
    }
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validate passwords
  if (!currentPassword || !newPassword || !confirmPassword) {
    NotificationManager.show('All password fields are required', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    NotificationManager.show('New passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 6) {
    NotificationManager.show('New password must be at least 6 characters', 'error');
    return;
  }

  try {
    await makeRequest(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    NotificationManager.show('Password changed successfully', 'success');
    closePasswordModal();
  } catch (error) {
    console.error('Error changing password:', error);
    NotificationManager.show('Failed to change password', 'error');
  }
}

function toggle2FA() {
  // TODO: Implement 2FA functionality
  NotificationManager.show('Two-factor authentication feature coming soon', 'info');
}

function viewSessions() {
  // TODO: Implement session management
  NotificationManager.show('Session management feature coming soon', 'info');
}

function deleteAccount() {
  const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
  if (confirmed) {
    // TODO: Implement account deletion
    NotificationManager.show('Account deletion feature coming soon', 'warning');
  }
}

function logout() {
  localStorage.removeItem('token');
  sessionStorage.clear();
  NotificationManager.show('Logged out successfully', 'success', 2000);
  setTimeout(() => {
    window.location.href = '../auth/login';
  }, 1000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Setup event listeners
  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', toggleEdit);
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveProfile);
  }

  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', handleAvatarUpload);
  }

  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // Load profile data
  await loadProfileData();
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  NotificationManager.show('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  NotificationManager.show('An unexpected error occurred', 'error');
});
