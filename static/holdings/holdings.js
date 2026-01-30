/* eslint-disable no-case-declarations */
/* eslint-disable no-unused-vars */

const API_BASE = window.location.origin + '/v1';
let holdingsData = [];
let transactionsData = [];
let isLoading = false;
let refreshInterval = null;
let sortOrder = 'asc';
let sortBy = 'value';

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

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// Load holdings data
async function loadHoldingsData() {
  if (isLoading) return;

  isLoading = true;
  setLoadingState(true);

  try {
    // Load holdings and recent transactions
    const [holdingsResponse, transactionsResponse] = await Promise.all([
      makeRequest(`${API_BASE}/holdings`),
      makeRequest(`${API_BASE}/wallet/transactions?limit=10&sortBy=createdAt:desc`),
    ]);

    if (holdingsResponse && holdingsResponse.results) {
      holdingsData = holdingsResponse.results;
      updateHoldingsStats();
      updateHoldingsTable();
      updateCharts();
    }

    if (transactionsResponse && transactionsResponse.results) {
      transactionsData = transactionsResponse.results;
      updateTransactionsTable();
    }

    NotificationManager.show('Holdings data loaded successfully', 'success', 3000);
  } catch (error) {
    console.error('Error loading holdings data:', error);
    NotificationManager.show('Failed to load holdings data', 'error');
    showErrorState();
  } finally {
    isLoading = false;
    setLoadingState(false);
  }
}

// Update holdings statistics
function updateHoldingsStats() {
  const totalHoldings = holdingsData.length;

  const totalInvestment = holdingsData.reduce((sum, holding) => {
    return sum + (holding.totalInvestment || holding.quantity * holding.averageBuyPrice);
  }, 0);

  const currentValue = holdingsData.reduce((sum, holding) => {
    return sum + (holding.currentValue || holding.quantity * (holding.currentPrice || holding.averageBuyPrice));
  }, 0);

  const totalPnL = currentValue - totalInvestment;
  const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

  // Update DOM elements
  updateElement('totalHoldings', totalHoldings.toString());
  updateElement('totalInvestment', formatCurrency(totalInvestment));
  updateElement('currentValue', formatCurrency(currentValue));
  updateElement('totalPnL', formatCurrency(Math.abs(totalPnL)));
  updateElement('pnlPercentage', formatPercentage(totalPnLPercentage));

  // Update P&L card styling
  const pnlCard = document.getElementById('pnlCard');
  if (pnlCard) {
    pnlCard.className = `stat-card ${getColorClass(totalPnL)}`;
  }
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// Sort holdings data
function sortHoldings(data, sortBy, order = 'asc') {
  return [...data].sort((a, b) => {
    let valueA, valueB;

    switch (sortBy) {
      case 'symbol':
        valueA = a.symbol;
        valueB = b.symbol;
        break;
      case 'quantity':
        valueA = a.quantity;
        valueB = b.quantity;
        break;
      case 'value':
        valueA = a.currentValue || a.quantity * (a.currentPrice || a.averageBuyPrice);
        valueB = b.currentValue || b.quantity * (b.currentPrice || b.averageBuyPrice);
        break;
      case 'pnl':
        valueA = a.unrealizedPL || 0;
        valueB = b.unrealizedPL || 0;
        break;
      case 'pnlPercentage':
        const pnlA = a.quantity * (a.currentPrice || a.averageBuyPrice) - a.quantity * a.averageBuyPrice;
        const pnlB = b.quantity * (b.currentPrice || b.averageBuyPrice) - b.quantity * b.averageBuyPrice;
        valueA = (pnlA / (a.quantity * a.averageBuyPrice)) * 100;
        valueB = (pnlB / (b.quantity * b.averageBuyPrice)) * 100;
        break;
      default:
        valueA = a.symbol;
        valueB = b.symbol;
    }

    if (typeof valueA === 'string') {
      return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    return order === 'asc' ? valueA - valueB : valueB - valueA;
  });
}

// Update holdings table
function updateHoldingsTable() {
  const tableBody = document.getElementById('holdingsTableBody');
  if (!tableBody) return;

  if (holdingsData.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
                    <div class="loading">No holdings found</div>
                    <p style="margin-top: 1rem;">Start investing to see your holdings here.</p>
                </td>
            </tr>
        `;
    return;
  }

  const sortedHoldings = sortHoldings(holdingsData, sortBy, sortOrder);

  tableBody.innerHTML = sortedHoldings
    .map((holding) => {
      const investment = holding.totalInvestment || holding.quantity * holding.averageBuyPrice;
      const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const pnl = holding.unrealizedPL || currentValue - investment;
      const pnlPercentage = holding.unrealizedPLPercentage || (investment > 0 ? (pnl / investment) * 100 : 0);
      const dayChange = holding.dayChange || 0; // Day change from backend

      return `
            <tr data-symbol="${holding.symbol}">
                <td>
                    <div class="stock-info">
                        <div class="stock-symbol">${holding.symbol}</div>
                        <div class="stock-name">${holding.exchange || 'NSE'}</div>
                    </div>
                </td>
                <td>${holding.quantity.toLocaleString()}</td>
                <td>${formatCurrency(holding.averageBuyPrice)}</td>
                <td>${formatCurrency(holding.currentPrice || holding.averageBuyPrice)}</td>
                <td>${formatCurrency(investment)}</td>
                <td>${formatCurrency(currentValue)}</td>
                <td class="${getColorClass(pnl)}">${formatCurrency(Math.abs(pnl))}</td>
                <td class="${getColorClass(pnl)}">${formatPercentage(pnlPercentage)}</td>
                <td class="${getColorClass(dayChange)}">${formatPercentage(dayChange)}</td>
                <td>
                    <button class="action-btn" onclick="viewHoldingDetails('${holding.symbol}')">
                        View
                    </button>
                    <button class="action-btn trade" onclick="tradeStock('${holding.symbol}')">
                        Trade
                    </button>
                </td>
            </tr>
        `;
    })
    .join('');
}

// Update transactions table
function updateTransactionsTable() {
  const tableBody = document.getElementById('transactionsTableBody');
  if (!tableBody) return;

  if (transactionsData.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
                    <div class="loading">No transactions found</div>
                    <p style="margin-top: 1rem;">Recent transactions will appear here.</p>
                </td>
            </tr>
        `;
    return;
  }

  tableBody.innerHTML = transactionsData
    .map((transaction) => {
      const quantity = transaction.quantity ?? 0;
      const price = transaction.price ?? 0;
      const totalAmount = quantity * price;

      return `
            <tr>
                <td>${formatDate(transaction.createdAt)}</td>
                <td>
                    <div class="stock-info">
                        <div class="stock-symbol">${transaction.symbol || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <span class="transaction-type ${(transaction.type || 'unknown').toLowerCase()}">
                        ${transaction.type || 'N/A'}
                    </span>
                </td>
                <td>${quantity.toLocaleString()}</td>
                <td>${formatCurrency(price)}</td>
                <td>${formatCurrency(totalAmount)}</td>
                <td>
                    <span class="status-badge ${(transaction.status || 'unknown').toLowerCase()}">
                        ${transaction.status || 'N/A'}
                    </span>
                </td>
            </tr>
        `;
    })
    .join('');
}

// Update charts
function updateCharts() {
  updateSectorAllocation();
  updateTopPerformers();
}

function updateSectorAllocation() {
  const chartContainer = document.getElementById('sectorChart');
  if (!chartContainer) return;

  if (holdingsData.length === 0) {
    chartContainer.innerHTML = '<div class="loading">No sector data available</div>';
    return;
  }

  // Mock sector data (you can replace with real sector mapping)
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy'];
  const sectorData = sectors.map((sector) => ({
    name: sector,
    percentage: Math.random() * 30 + 10,
    value: Math.random() * 100000 + 50000,
  }));

  chartContainer.innerHTML = `
        <div style="width: 100%; padding: 1rem;">
            <h3 style="color: white; text-align: center; margin-bottom: 2rem;">Sector Distribution</h3>
            ${sectorData
              .map(
                (sector, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: hsl(${index * 60}, 70%, 60%);"></div>
                        <span style="color: white; font-weight: 500;">${sector.name}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: white; font-weight: 600;">${formatPercentage(sector.percentage, false)}</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">${formatCurrency(sector.value)}</div>
                    </div>
                </div>
            `,
              )
              .join('')}
        </div>
    `;
}

function updateTopPerformers() {
  const chartContainer = document.getElementById('topPerformers');
  if (!chartContainer) return;

  if (holdingsData.length === 0) {
    chartContainer.innerHTML = '<div class="loading">No performance data available</div>';
    return;
  }

  // Calculate and sort by P&L percentage
  const performers = holdingsData
    .map((holding) => {
      const investment = holding.quantity * holding.averageBuyPrice;
      const currentValue = holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const pnl = currentValue - investment;
      const pnlPercentage = investment > 0 ? (pnl / investment) * 100 : 0;

      return {
        symbol: holding.symbol,
        pnlPercentage: pnlPercentage,
        pnl: pnl,
      };
    })
    .sort((a, b) => b.pnlPercentage - a.pnlPercentage)
    .slice(0, 5);

  chartContainer.innerHTML = `
        <div style="width: 100%; padding: 1rem;">
            <h3 style="color: white; text-align: center; margin-bottom: 2rem;">Best Performers</h3>
            ${performers
              .map((performer, index) => {
                const isPositive = performer.pnlPercentage >= 0;

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem;">
                                ${index + 1}
                            </div>
                            <span style="color: white; font-weight: 500;">${performer.symbol}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: ${isPositive ? '#4ade80' : '#f87171'}; font-weight: 600;">
                                ${formatPercentage(performer.pnlPercentage)}
                            </div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">
                                ${formatCurrency(Math.abs(performer.pnl))}
                            </div>
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
                <td colspan="10" style="text-align: center; padding: 2rem; color: #f87171;">
                    <div style="margin-bottom: 1rem;">Failed to load holdings data</div>
                    <button onclick="refreshHoldings()" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">
                        Retry
                    </button>
                </td>
            </tr>
        `;
  }
}

async function refreshHoldings() {
  try {
    NotificationManager.show('Refreshing holdings data...', 'info', 2000);
    await loadHoldingsData();
  } catch (error) {
    console.error('Refresh failed:', error);
    NotificationManager.show('Failed to refresh holdings', 'error');
  }
}

function exportHoldings() {
  try {
    if (holdingsData.length === 0) {
      NotificationManager.show('No data to export', 'info');
      return;
    }

    // Prepare CSV data
    const headers = [
      'Symbol',
      'Stock Name',
      'Quantity',
      'Avg Price',
      'Current Price',
      'Investment',
      'Current Value',
      'P&L',
      'P&L %',
    ];
    const csvData = holdingsData.map((holding) => {
      const investment = holding.quantity * holding.averageBuyPrice;
      const currentValue = holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
      const pnl = currentValue - investment;
      const pnlPercentage = investment > 0 ? (pnl / investment) * 100 : 0;

      return [
        holding.symbol,
        holding.stockName || holding.symbol,
        holding.quantity,
        holding.averageBuyPrice.toFixed(2),
        (holding.currentPrice || holding.averageBuyPrice).toFixed(2),
        investment.toFixed(2),
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
    link.setAttribute('download', `holdings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    NotificationManager.show('Holdings exported successfully', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    NotificationManager.show('Failed to export holdings', 'error');
  }
}

function viewHoldingDetails(symbol) {
  // Open stock details in new tab
  window.open(`../stocks/?symbol=${encodeURIComponent(symbol)}`, '_blank');
}

function tradeStock(symbol) {
  // Open stocks page with trading modal
  window.open(`../stocks/?symbol=${encodeURIComponent(symbol)}&action=trade`, '_blank');
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

// Sort functionality
function setupSort() {
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      // Toggle sort order if same field
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      updateHoldingsTable();
    });
  }
}

// Transaction filter
function setupTransactionFilter() {
  const transactionFilter = document.getElementById('transactionFilter');
  if (transactionFilter) {
    transactionFilter.addEventListener('change', (e) => {
      const filterValue = e.target.value;
      const tableRows = document.querySelectorAll('#transactionsTableBody tr');

      tableRows.forEach((row) => {
        const typeElement = row.querySelector('.transaction-type');
        if (typeElement) {
          const type = typeElement.textContent.toLowerCase();
          const visible = filterValue === 'all' || type === filterValue;
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
    refreshBtn.addEventListener('click', refreshHoldings);
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportHoldings);
  }

  setupSearch();
  setupSort();
  setupTransactionFilter();

  // Load initial data
  await loadHoldingsData();

  // Setup auto-refresh every 5 minutes
  refreshInterval = setInterval(
    () => {
      if (!document.hidden) {
        loadHoldingsData();
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
