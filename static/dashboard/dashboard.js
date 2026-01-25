/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const API_BASE = window.location.origin + '/v1';
let socket;
let chartInterval;
let isWebSocketConnected = false;
let retryCount = 0;
const maxRetries = 5;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../auth/login.html';
}

// Enhanced error handling and notifications
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
                @keyframes slideOutRight {
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.hide(notification);
    });

    // Auto hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.hide(notification);
      }, duration);
    }

    return notification;
  }

  static hide(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
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

// Enhanced loading states
class LoadingManager {
  static show(element, message = 'Loading...') {
    element.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
  }

  static showCard(cardId, message = 'Loading...') {
    const card = document.getElementById(cardId);
    if (card) {
      const valueElement = card.querySelector('.value');
      if (valueElement) {
        valueElement.innerHTML = `
                    <div class="loading-inline">
                        <div class="spinner-small"></div>
                        <span>${message}</span>
                    </div>
                `;
      }
    }
  }

  static addStyles() {
    if (!document.getElementById('loading-styles')) {
      const styles = document.createElement('style');
      styles.id = 'loading-styles';
      styles.textContent = `
                .loading-inline {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                }
                .spinner-small {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-top: 2px solid #4ade80;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
            `;
      document.head.appendChild(styles);
    }
  }
}

// Load user data with error handling
function loadUserData() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      userNameElement.textContent = user.name || 'User';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    NotificationManager.show('Error loading user data', 'error');
  }
}

// Enhanced dashboard data loading with better error handling
async function loadDashboardData() {
  try {
    // Show loading states
    LoadingManager.showCard('totalBalance', 'Loading balance...');
    LoadingManager.showCard('activeHoldings', 'Loading holdings...');
    LoadingManager.showCard('portfolioValue', 'Calculating value...');

    // Load wallet data
    await loadWalletData();

    // Load holdings data
    await loadHoldingsData();

    // Load recent orders
    await loadRecentOrders();

    // Calculate today's P&L
    calculateTodayPnL();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    NotificationManager.show('Error loading dashboard data. Some information may not be current.', 'error');
  }
}

// Separate wallet data loading
async function loadWalletData() {
  try {
    const walletResponse = await fetch(`${API_BASE}/wallet`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (walletResponse.ok) {
      const wallet = await walletResponse.json();
      const balance = wallet.balance || 0;
      const totalBalanceElement = document.getElementById('totalBalance');
      if (totalBalanceElement) {
        totalBalanceElement.textContent = `₹${balance.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        // Add a subtle animation
        totalBalanceElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
          totalBalanceElement.style.transform = 'scale(1)';
        }, 200);
      }
    } else if (walletResponse.status === 401) {
      handleAuthError();
    } else {
      throw new Error(`Failed to load wallet data: ${walletResponse.status}`);
    }
  } catch (error) {
    console.error('Error loading wallet data:', error);
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
      totalBalanceElement.textContent = '₹0.00';
    }
  }
}

// Separate holdings data loading
async function loadHoldingsData() {
  try {
    const holdingsResponse = await fetch(`${API_BASE}/holdings`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (holdingsResponse.ok) {
      const holdings = await holdingsResponse.json();
      const activeCount = holdings.results?.length || 0;
      const activeHoldingsElement = document.getElementById('activeHoldings');
      if (activeHoldingsElement) {
        activeHoldingsElement.textContent = activeCount.toString();
      }

      // Calculate portfolio value
      let portfolioValue = 0;
      holdings.results?.forEach((holding) => {
        portfolioValue += holding.quantity * (holding.currentPrice || holding.averagePrice || 0);
      });

      const portfolioValueElement = document.getElementById('portfolioValue');
      if (portfolioValueElement) {
        portfolioValueElement.textContent = `₹${portfolioValue.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        // Add animation
        portfolioValueElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
          portfolioValueElement.style.transform = 'scale(1)';
        }, 200);
      }
    } else if (holdingsResponse.status === 401) {
      handleAuthError();
    } else {
      throw new Error(`Failed to load holdings data: ${holdingsResponse.status}`);
    }
  } catch (error) {
    console.error('Error loading holdings data:', error);
    const activeHoldingsElement = document.getElementById('activeHoldings');
    const portfolioValueElement = document.getElementById('portfolioValue');
    if (activeHoldingsElement) activeHoldingsElement.textContent = '0';
    if (portfolioValueElement) portfolioValueElement.textContent = '₹0.00';
  }
}

// Enhanced recent orders loading
async function loadRecentOrders() {
  try {
    const ordersResponse = await fetch(`${API_BASE}/orders?limit=5&sort=-createdAt`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      displayRecentOrders(orders.results || []);
    } else if (ordersResponse.status === 401) {
      handleAuthError();
    } else {
      throw new Error(`Failed to load recent orders: ${ordersResponse.status}`);
    }
  } catch (error) {
    console.error('Error loading recent orders:', error);
    const ordersContainer = document.getElementById('recentOrders');
    if (ordersContainer) {
      ordersContainer.innerHTML = '<li><p style="color: rgba(255, 255, 255, 0.7);">Unable to load recent orders</p></li>';
    }
  }
}

// Enhanced recent orders display
function displayRecentOrders(orders) {
  const ordersContainer = document.getElementById('recentOrders');
  if (!ordersContainer) return;

  if (orders.length === 0) {
    ordersContainer.innerHTML = '<li><p style="color: rgba(255, 255, 255, 0.7);">No recent orders found</p></li>';
    return;
  }

  ordersContainer.innerHTML = orders
    .map(
      (order, index) => `
        <li style="animation: slideInUp 0.5s ease ${index * 0.1}s both;">
            <div class="order-info">
                <div class="order-details">
                    <div class="order-symbol">${order.symbol || 'N/A'}</div>
                    <div class="order-type">
                        ${(order.type || 'Unknown').toUpperCase()} - ${order.quantity || 0} shares @ ₹${(order.price || 0).toFixed(2)}
                    </div>
                </div>
                <div class="order-status status-${(order.status || 'unknown').toLowerCase()}">
                    ${order.status || 'Unknown'}
                </div>
            </div>
        </li>
    `,
    )
    .join('');
}

// Enhanced WebSocket initialization with retry logic
function initializeWebSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not loaded, falling back to REST API');
    loadMarketDataRest();
    return;
  }

  try {
    // Close existing connection if any
    if (socket) {
      socket.disconnect();
    }

    socket = io('/market', {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: maxRetries,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('Connected to market data WebSocket');
      isWebSocketConnected = true;
      retryCount = 0;
      NotificationManager.show('Connected to live market data', 'success', 3000);
    });

    socket.on('stockUpdate', (data) => {
      if (data && Array.isArray(data)) {
        displayMarketData(data);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from market data:', reason);
      isWebSocketConnected = false;

      if (reason === 'io server disconnect') {
        NotificationManager.show('Market data connection closed by server', 'warning');
      } else {
        NotificationManager.show('Lost connection to market data. Attempting to reconnect...', 'warning');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      retryCount++;

      if (retryCount >= maxRetries) {
        NotificationManager.show('Unable to connect to live market data. Using cached data.', 'error');
        loadMarketDataRest();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to market data after', attemptNumber, 'attempts');
      NotificationManager.show('Reconnected to live market data', 'success', 3000);
    });
  } catch (error) {
    console.error('WebSocket initialization failed:', error);
    loadMarketDataRest();
  }
}

// Enhanced market data display with animations
function displayMarketData(stocksData) {
  const marketContainer = document.getElementById('marketData');
  if (!marketContainer) return;

  if (!stocksData || stocksData.length === 0) {
    marketContainer.innerHTML = '<li><p style="color: rgba(255, 255, 255, 0.7);">No market data available</p></li>';
    return;
  }

  const displayData = stocksData.slice(0, 10);
  marketContainer.innerHTML = displayData
    .map((stock, index) => {
      const change = stock.change || 0;
      const changePercent = stock.changePercent || 0;
      const changeClass = change >= 0 ? 'positive' : 'negative';
      const changePrefix = change >= 0 ? '+' : '';

      return `
            <li style="animation: slideInUp 0.5s ease ${index * 0.05}s both;">
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol || 'N/A'}</div>
                    <div class="stock-name">${stock.name || stock.symbol || 'Unknown'}</div>
                </div>
                <div class="price-info">
                    <div class="price">₹${(stock.price || 0).toFixed(2)}</div>
                    <div class="change ${changeClass}">
                        ${changePrefix}${change.toFixed(2)} 
                        (${changePrefix}${changePercent.toFixed(2)}%)
                    </div>
                </div>
            </li>
        `;
    })
    .join('');
}

// Enhanced REST API fallback
async function loadMarketDataRest() {
  const marketContainer = document.getElementById('marketData');
  if (!marketContainer) return;

  try {
    LoadingManager.show(marketContainer, 'Loading market data...');

    const response = await fetch(`${API_BASE}/stocks?limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      displayMarketData(data.results || []);
    } else if (response.status === 401) {
      handleAuthError();
    } else {
      throw new Error(`Failed to load market data: ${response.status}`);
    }
  } catch (error) {
    console.error('Error loading market data:', error);
    if (marketContainer) {
      marketContainer.innerHTML = '<li><p style="color: rgba(255, 255, 255, 0.7);">Unable to load market data</p></li>';
    }
    NotificationManager.show('Unable to load market data', 'error');
  }
}

// Enhanced P&L calculation (placeholder with better logic)
function calculateTodayPnL() {
  try {
    // This is a placeholder calculation
    // In a real app, this would calculate based on actual holdings and price changes
    const portfolioValueText = document.getElementById('portfolioValue')?.textContent || '₹0';
    const portfolioValue = parseFloat(portfolioValueText.replace(/[₹,]/g, '')) || 0;

    // Simulate daily P&L as 0.5% to 2% of portfolio value
    const pnlPercentage = (Math.random() - 0.5) * 0.04; // -2% to +2%
    const todayPnL = portfolioValue * pnlPercentage;

    const pnlElement = document.getElementById('todayPnL');
    if (pnlElement) {
      pnlElement.textContent = `₹${Math.abs(todayPnL).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      // Update class and add appropriate styling
      const parentCard = pnlElement.closest('.stat-card');
      if (parentCard) {
        parentCard.classList.remove('positive', 'negative', 'neutral');
        if (todayPnL > 0) {
          parentCard.classList.add('positive');
          pnlElement.textContent = '+' + pnlElement.textContent;
        } else if (todayPnL < 0) {
          parentCard.classList.add('negative');
          pnlElement.textContent = '-' + pnlElement.textContent;
        } else {
          parentCard.classList.add('neutral');
        }
      }
    }
  } catch (error) {
    console.error('Error calculating today P&L:', error);
  }
}

// Handle authentication errors
function handleAuthError() {
  console.warn('Authentication token invalid or expired');
  NotificationManager.show('Session expired. Please login again.', 'warning', 3000);
  setTimeout(() => {
    logout();
  }, 3000);
}

// Enhanced logout function
function logout() {
  try {
    // Show logout notification
    NotificationManager.show('Logging out...', 'info', 1000);

    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();

    // Disconnect WebSocket
    if (socket) {
      socket.disconnect();
    }

    // Clear any intervals
    if (chartInterval) {
      clearInterval(chartInterval);
    }

    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = '../auth/login/index.html';
    }, 1000);
  } catch (error) {
    console.error('Error during logout:', error);
    // Force redirect even if there's an error
    window.location.href = '../auth/login/index.html';
  }
}

// Auto-refresh data periodically
function startAutoRefresh() {
  // Refresh dashboard data every 5 minutes
  const refreshInterval = setInterval(
    () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData();

        // If WebSocket is not connected, try to refresh market data via REST
        if (!isWebSocketConnected) {
          loadMarketDataRest();
        }
      }
    },
    5 * 60 * 1000,
  ); // 5 minutes

  // Clean up interval when page is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });
}

// Page visibility handling
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Refresh data when page becomes visible
    loadDashboardData();

    // Reconnect WebSocket if needed
    if (!isWebSocketConnected && typeof io !== 'undefined') {
      setTimeout(initializeWebSocket, 1000);
    }
  }
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Add necessary styles
  LoadingManager.addStyles();

  // Load initial data
  loadUserData();
  loadDashboardData();

  // Start auto-refresh
  startAutoRefresh();

  // Set up sidebar navigation
  setupSidebarNavigation();

  // Initialize WebSocket with delay to ensure DOM is ready
  setTimeout(() => {
    loadSocketIO();
  }, 500);
});

// Sidebar navigation setup
function setupSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
  sidebarLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      // Remove active class from all links
      sidebarLinks.forEach((l) => l.classList.remove('active'));
      // Add active class to clicked link
      link.classList.add('active');
    });
  });
}

// Load Socket.IO dynamically
function loadSocketIO() {
  if (typeof io !== 'undefined') {
    initializeWebSocket();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
  script.integrity = 'sha384-9Z1f7PcJfVKJ6b+YmV0A5XJ9g4K+8FG3K+XJ9KbPQ0K+5vI6zIvSzTmV8Wh3OtVb';
  script.crossOrigin = 'anonymous';

  script.onload = () => {
    console.log('Socket.IO loaded successfully');
    initializeWebSocket();
  };

  script.onerror = (error) => {
    console.error('Failed to load Socket.IO:', error);
    NotificationManager.show('Unable to load real-time features. Using standard data refresh.', 'warning');
    loadMarketDataRest();
  };

  document.head.appendChild(script);
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't show notification for every error to avoid spam
});

// Handle connection status
window.addEventListener('online', () => {
  NotificationManager.show('Connection restored', 'success', 2000);
  loadDashboardData();
});

window.addEventListener('offline', () => {
  NotificationManager.show('Connection lost. Some features may not work.', 'warning');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Alt + R to refresh
  if (e.altKey && e.key === 'r') {
    e.preventDefault();
    NotificationManager.show('Refreshing dashboard...', 'info', 2000);
    loadDashboardData();
  }

  // Alt + L to logout
  if (e.altKey && e.key === 'l') {
    e.preventDefault();
    logout();
  }
});

// Export functions for potential external use
window.DashboardAPI = {
  loadDashboardData,
  logout,
  displayMarketData,
  NotificationManager,
};
