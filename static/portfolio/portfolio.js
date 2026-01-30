/* eslint-disable no-unused-vars */

const API_BASE = window.location.origin + '/v1';
let portfolioData = null;
let holdingsData = [];
let isLoading = false;
let refreshInterval = null;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../auth/login/index.html';
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

function formatPercentage(value, showSign = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getColorClass(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
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

// Portfolio data loading
async function loadPortfolioData() {
  if (isLoading) return;

  isLoading = true;
  setLoadingState(true);

  try {
    // Load portfolio summary and holdings
    const [portfolioResponse, holdingsResponse] = await Promise.all([
      makeRequest(`${API_BASE}/holdings/portfolio/summary`),
      makeRequest(`${API_BASE}/holdings`),
    ]);

    if (portfolioResponse) {
      portfolioData = portfolioResponse;
      updatePortfolioStats();
    }

    if (holdingsResponse && holdingsResponse.results) {
      holdingsData = holdingsResponse.results;
      updateHoldingsTable();
      updateCharts();
    }

    NotificationManager.show('Portfolio data loaded successfully', 'success', 3000);
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    NotificationManager.show('Failed to load portfolio data', 'error');
    showErrorState();
  } finally {
    isLoading = false;
    setLoadingState(false);
  }
}

// Update portfolio statistics
function updatePortfolioStats() {
  if (!portfolioData) return;

  // Calculate values from portfolio response or holdings
  const totalValue =
    portfolioData?.portfolio?.currentValue ||
    holdingsData.reduce((sum, holding) => {
      return sum + (holding.currentValue || holding.quantity * (holding.currentPrice || holding.averageBuyPrice));
    }, 0);

  const totalInvested =
    portfolioData?.portfolio?.totalInvestment ||
    holdingsData.reduce((sum, holding) => {
      return sum + (holding.totalInvestment || holding.quantity * holding.averageBuyPrice);
    }, 0);

  const totalPnL = portfolioData?.portfolio?.unrealizedPL || totalValue - totalInvested;
  const totalPnLPercentage =
    portfolioData?.portfolio?.unrealizedPLPercentage || (totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0);

  // Update DOM elements
  updateElement('totalValue', formatCurrency(totalValue));
  updateElement('totalInvested', formatCurrency(totalInvested));
  updateElement('totalGains', formatCurrency(Math.abs(totalPnL)));
  updateElement('gainsPercentage', formatPercentage(totalPnLPercentage));
  updateElement('activePositions', holdingsData.length.toString());

  // Update gains card styling
  const gainsCard = document.getElementById('gainsCard');
  if (gainsCard) {
    gainsCard.className = `stat-card ${getColorClass(totalPnL)}`;
  }
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// Update holdings table
function updateHoldingsTable() {
  const tableBody = document.getElementById('holdingsTableBody');
  if (!tableBody) return;

  if (holdingsData.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
                    <div class="loading">No holdings found</div>
                    <p style="margin-top: 1rem;">Start investing to see your portfolio here.</p>
                </td>
            </tr>
        `;
    return;
  }

  tableBody.innerHTML = holdingsData
    .map((holding) => {
      const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const totalInvested = holding.totalInvestment || holding.quantity * holding.averageBuyPrice;
      const pnl = holding.unrealizedPL || currentValue - totalInvested;
      const pnlPercentage = holding.unrealizedPLPercentage || (totalInvested > 0 ? (pnl / totalInvested) * 100 : 0);

      return `
            <tr data-symbol="${holding.symbol}">
                <td>
                    <div style="font-weight: 600; color: #667eea;">${holding.symbol}</div>
                    <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); margin-top: 0.25rem;">
                        ${holding.exchange || 'NSE'}
                    </div>
                </td>
                <td>${holding.quantity}</td>
                <td>${formatCurrency(holding.averageBuyPrice)}</td>
                <td>${formatCurrency(holding.currentPrice || holding.averageBuyPrice)}</td>
                <td>${formatCurrency(currentValue)}</td>
                <td class="${getColorClass(pnl)}">${formatCurrency(Math.abs(pnl))}</td>
                <td class="${getColorClass(pnl)}">${formatPercentage(pnlPercentage)}</td>
                <td>
                <a href="../stocks/detail.html?symbol=${encodeURIComponent(holding.symbol)}&exchange=NSE" target="_blank" class="action-btn">
                    <button class="action-btn">
                        View
                    </button>
                    </a>
                </td>
            </tr>
        `;
    })
    .join('');
}

// Update charts
function updateCharts() {
  updateAssetAllocation();
  updatePerformanceChart();
}

function updateAssetAllocation() {
  const chartContainer = document.getElementById('allocationChart');
  if (!chartContainer) return;

  if (holdingsData.length === 0) {
    chartContainer.innerHTML = '<div class="loading">No allocation data available</div>';
    return;
  }

  // Calculate total portfolio value
  const totalValue = holdingsData.reduce((sum, holding) => {
    return sum + holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
  }, 0);

  // Calculate allocations
  const allocations = holdingsData
    .map((holding) => {
      const value = holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const percentage = (value / totalValue) * 100;
      return {
        symbol: holding.symbol,
        percentage: percentage,
        value: value,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  // Display top 5 allocations
  const topAllocations = allocations.slice(0, 5);
  chartContainer.innerHTML = `
        <div style="width: 100%; padding: 1rem;">
            <h3 style="color: white; text-align: center; margin-bottom: 2rem;">Top Holdings</h3>
            ${topAllocations
              .map(
                (item, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem;">
                            ${index + 1}
                        </div>
                        <span style="color: white; font-weight: 500;">${item.symbol}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: white; font-weight: 600;">${formatPercentage(item.percentage, false)}</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">${formatCurrency(item.value)}</div>
                    </div>
                </div>
            `,
              )
              .join('')}
            ${
              allocations.length > 5
                ? `
                <div style="text-align: center; margin-top: 1rem; color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                    +${allocations.length - 5} more holdings
                </div>
            `
                : ''
            }
        </div>
    `;
}

function updatePerformanceChart() {
  const chartContainer = document.getElementById('performanceChart');
  if (!chartContainer) return;

  if (holdingsData.length === 0) {
    chartContainer.innerHTML = '<div class="loading">No performance data available</div>';
    return;
  }

  // Calculate overall performance metrics
  const totalValue = holdingsData.reduce((sum, holding) => {
    return sum + holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
  }, 0);

  const totalInvested = holdingsData.reduce((sum, holding) => {
    return sum + holding.quantity * holding.averageBuyPrice;
  }, 0);

  const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  // Mock performance data (you can replace with real data from API)
  const performanceData = [
    { label: 'Today', value: Math.random() * 4 - 2 },
    { label: '1 Week', value: Math.random() * 6 - 3 },
    { label: '1 Month', value: Math.random() * 10 - 5 },
    { label: '3 Months', value: Math.random() * 15 - 7.5 },
    { label: 'Overall', value: totalReturn },
  ];

  chartContainer.innerHTML = `
        <div style="width: 100%; padding: 1rem;">
            <h3 style="color: white; text-align: center; margin-bottom: 2rem;">Performance Overview</h3>
            ${performanceData
              .map((item) => {
                const isPositive = item.value >= 0;
                const maxWidth = Math.abs(item.value) > 20 ? 100 : (Math.abs(item.value) / 20) * 100;

                return `
                    <div style="display: flex; align-items: center; margin-bottom: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <div style="min-width: 80px; color: white; font-weight: 500;">${item.label}</div>
                        <div style="flex: 1; margin: 0 1rem; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; position: relative;">
                            <div style="
                                height: 100%; 
                                width: ${maxWidth}%; 
                                background: ${isPositive ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #f87171, #ef4444)'}; 
                                border-radius: 3px;
                                ${!isPositive ? 'margin-left: auto;' : ''}
                            "></div>
                        </div>
                        <div style="min-width: 80px; text-align: right; color: ${isPositive ? '#4ade80' : '#f87171'}; font-weight: 600;">
                            ${formatPercentage(item.value)}
                        </div>
                    </div>
                `;
              })
              .join('')}
        </div>
    `;
}

// Event handlers
function setLoadingState(loading) {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    if (loading) {
      refreshBtn.innerHTML = '⏳ Loading...';
      refreshBtn.disabled = true;
    } else {
      refreshBtn.innerHTML = '🔄 Refresh';
      refreshBtn.disabled = false;
    }
  }
}

function showErrorState() {
  const tableBody = document.getElementById('holdingsTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #f87171;">
                    <div style="margin-bottom: 1rem;">Failed to load portfolio data</div>
                    <button onclick="refreshPortfolio()" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">
                        Retry
                    </button>
                </td>
            </tr>
        `;
  }
}

async function refreshPortfolio() {
  try {
    NotificationManager.show('Refreshing portfolio data...', 'info', 2000);
    await loadPortfolioData();
  } catch (error) {
    console.error('Refresh failed:', error);
    NotificationManager.show('Failed to refresh portfolio', 'error');
  }
}

function exportPortfolio() {
  try {
    if (holdingsData.length === 0) {
      NotificationManager.show('No data to export', 'info');
      return;
    }

    // Prepare CSV data
    const headers = ['Symbol', 'Stock Name', 'Quantity', 'Avg Price', 'Current Price', 'Current Value', 'P&L', 'P&L %'];
    const csvData = holdingsData.map((holding) => {
      const currentValue = holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const totalInvested = holding.quantity * holding.averageBuyPrice;
      const pnl = currentValue - totalInvested;
      const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      return [
        holding.symbol,
        holding.stockName || holding.symbol,
        holding.quantity,
        holding.averageBuyPrice.toFixed(2),
        (holding.currentPrice || holding.averageBuyPrice).toFixed(2),
        currentValue.toFixed(2),
        pnl.toFixed(2),
        pnlPercentage.toFixed(2),
      ];
    });

    // Create CSV content
    const csvContent = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    NotificationManager.show('Portfolio exported successfully', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    NotificationManager.show('Failed to export portfolio', 'error');
  }
}

function viewHoldingDetails(symbol) {
  // Open stock details in new tab
  window.open(`../stocks/?symbol=${encodeURIComponent(symbol)}`, '_blank');
}

function logout() {
  localStorage.removeItem('token');
  sessionStorage.clear();
  NotificationManager.show('Logged out successfully', 'success', 2000);
  setTimeout(() => {
    window.location.href = '../auth/login/index.html';
  }, 1000);
}

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const tableRows = document.querySelectorAll('#holdingsTableBody tr');

      tableRows.forEach((row) => {
        const symbol = row.dataset.symbol;
        if (symbol) {
          const visible = symbol.toLowerCase().includes(query);
          row.style.display = visible ? '' : 'none';
        }
      });
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load user name
    const userResponse = await makeRequest(`${API_BASE}/users/profile`);
    if (userResponse && userResponse.name) {
      const userNameElement = document.getElementById('userName');
      if (userNameElement) {
        userNameElement.textContent = `Welcome, ${userResponse.name}!`;
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }

  // Setup event listeners
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshPortfolio);
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportPortfolio);
  }

  setupSearch();

  // Load initial data
  await loadPortfolioData();

  // Setup auto-refresh every 5 minutes
  refreshInterval = setInterval(
    () => {
      if (!document.hidden) {
        loadPortfolioData();
      }
    },
    5 * 60 * 1000,
  );
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
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
