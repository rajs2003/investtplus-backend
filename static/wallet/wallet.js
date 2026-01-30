/* eslint-disable no-unused-vars */
const API_BASE = window.location.origin + '/v1';

// State management
let currentPage = 1;
let totalPages = 1;
let currentFilters = {
  type: '',
  reason: '',
};
let walletData = null;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../auth/login/index.html';
}

// Enhanced notification system (reusing from profile page)
class NotificationManager {
  static show(message, type = 'info', duration = 5000) {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach((notif) => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getIcon(type)}</div>
                <div class="notification-message">${message}</div>
                <button class="notification-close">&times;</button>
            </div>
        `;

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
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => notification.remove());
    }

    if (duration > 0) {
      setTimeout(() => notification.remove(), duration);
    }
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
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatReason(reason) {
  const reasonMap = {
    initial_deposit: 'Initial Deposit',
    bonus: 'Bonus',
    stock_buy: 'Stock Purchase',
    stock_sell: 'Stock Sale',
    charges: 'Charges',
    refund: 'Refund',
    order_cancelled: 'Order Cancelled',
    profit_realized: 'Profit Realized',
    loss_realized: 'Loss Realized',
    admin_credit: 'Admin Credit',
    admin_debit: 'Admin Debit',
  };
  return reasonMap[reason] || reason;
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
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Load wallet data
async function loadWalletData() {
  try {
    // GET /wallet/details
    const detailsResponse = await makeRequest(`${API_BASE}/wallet/details`);

    if (detailsResponse) {
      walletData = detailsResponse;
      updateWalletDisplay(detailsResponse);

      // Load transaction summary
      await loadTransactionSummary();

      // Load transaction history
      await loadTransactionHistory();

      NotificationManager.show('Wallet data loaded successfully', 'success', 3000);
    }
  } catch (error) {
    console.error('Error loading wallet:', error);

    // Check if error is 404 (Wallet not found)
    if (error.status === 404 || error.message.includes('Wallet not found') || error.message.includes('not found')) {
      NotificationManager.show('Wallet not found. Creating wallet automatically...', 'info', 3000);
      await createWallet();
    } else {
      NotificationManager.show(`Failed to load wallet: ${error.message}`, 'error');
      showErrorState();
    }
  }
}

// Create wallet automatically
async function createWallet() {
  try {
    const response = await makeRequest(`${API_BASE}/wallet/create`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (response) {
      NotificationManager.show('✅ Wallet created successfully!', 'success', 3000);
      // Reload wallet data after creation
      setTimeout(() => loadWalletData(), 1000);
    }
  } catch (error) {
    console.error('Error creating wallet:', error);
    NotificationManager.show(`Failed to create wallet: ${error.message}`, 'error');
  }
}

function updateWalletDisplay(data) {
  // Update balance cards
  document.getElementById('totalBalance').textContent = formatCurrency(data.balance);
  document.getElementById('availableBalance').textContent = formatCurrency(data.availableBalance);
  document.getElementById('lockedAmount').textContent = formatCurrency(data.lockedAmount);

  // Calculate and display Net P&L
  const netPL = data.netPL || data.totalProfit - data.totalLoss || 0;
  const netPLElement = document.getElementById('netPL');
  netPLElement.textContent = formatCurrency(Math.abs(netPL));

  // Color code P&L
  if (netPL > 0) {
    netPLElement.style.color = '#10b981';
  } else if (netPL < 0) {
    netPLElement.style.color = '#ef4444';
  } else {
    netPLElement.style.color = 'rgba(255, 255, 255, 0.9)';
  }

  // Display return percentage
  const returnPercentage = data.returnPercentage || 0;
  const returnElement = document.getElementById('returnPercentage');
  returnElement.textContent = `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`;
  returnElement.style.color = returnPercentage >= 0 ? '#10b981' : '#ef4444';

  // Update user name
  const userNameElement = document.getElementById('userName');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (userNameElement) {
    userNameElement.textContent = user.name || 'User';
  }
}

async function loadTransactionSummary() {
  try {
    // GET /wallet/transactions/summary
    const summaryResponse = await makeRequest(`${API_BASE}/wallet/transactions/summary`);

    if (summaryResponse) {
      const { credit, debit } = summaryResponse;

      // Update credit stats
      document.getElementById('totalCredits').textContent = formatCurrency(credit?.totalAmount || 0);
      document.getElementById('creditCount').textContent = `${credit?.count || 0} transactions`;

      // Update debit stats
      document.getElementById('totalDebits').textContent = formatCurrency(debit?.totalAmount || 0);
      document.getElementById('debitCount').textContent = `${debit?.count || 0} transactions`;
    }
  } catch (error) {
    console.error('Error loading transaction summary:', error);
    // Don't show error notification for summary as it's secondary data
  }
}

async function loadTransactionHistory(page = 1) {
  try {
    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10',
      sortBy: 'createdAt:desc',
    });

    if (currentFilters.type) {
      params.append('type', currentFilters.type);
    }
    if (currentFilters.reason) {
      params.append('reason', currentFilters.reason);
    }

    // GET /wallet/transactions
    const response = await makeRequest(`${API_BASE}/wallet/transactions?${params.toString()}`);

    if (response) {
      displayTransactions(response.results || []);
      updatePagination(response);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    showTransactionError();
  }
}

function displayTransactions(transactions) {
  const tbody = document.getElementById('transactionTableBody');

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <div>📭</div>
                    <p>No transactions found</p>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = transactions
    .map((txn) => {
      const typeClass = txn.type === 'credit' ? 'credit' : 'debit';
      const typeIcon = txn.type === 'credit' ? '↓' : '↑';

      return `
            <tr class="transaction-row">
                <td>${formatDate(txn.createdAt)}</td>
                <td>
                    <span class="transaction-type ${typeClass}">
                        ${typeIcon} ${txn.type.toUpperCase()}
                    </span>
                </td>
                <td><span class="transaction-reason">${formatReason(txn.reason)}</span></td>
                <td class="amount-cell ${typeClass}">${formatCurrency(txn.amount)}</td>
                <td>${formatCurrency(txn.balanceBefore)}</td>
                <td>${formatCurrency(txn.balanceAfter)}</td>
                <td class="description-cell">${txn.description || '-'}</td>
            </tr>
        `;
    })
    .join('');
}

function updatePagination(response) {
  currentPage = response.page || 1;
  totalPages = response.totalPages || 1;

  const paginationDiv = document.getElementById('pagination');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');

  if (totalPages > 1) {
    paginationDiv.style.display = 'flex';
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  } else {
    paginationDiv.style.display = 'none';
  }
}

function showTransactionError() {
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = `
        <tr>
            <td colspan="7" class="error-row">
                <div>❌</div>
                <p>Failed to load transactions</p>
                <button onclick="loadTransactionHistory()">Retry</button>
            </td>
        </tr>
    `;
}

function showErrorState() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: rgba(255, 255, 255, 0.8);">
                <h2>Failed to load wallet data</h2>
                <p style="margin: 1rem 0;">Please try refreshing the page</p>
                <button onclick="location.reload()" style="padding: 0.75rem 2rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
  }
}

// Action functions
function showAddFunds() {
  NotificationManager.show('Add Funds: This feature will allow you to deposit money into your wallet', 'info');
}

function showWithdraw() {
  NotificationManager.show('Withdraw Funds: This feature will allow you to withdraw money from your wallet', 'info');
}

async function refreshWallet() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Refreshing...';
  }

  try {
    await loadWalletData();
    NotificationManager.show('Wallet data refreshed successfully', 'success', 2000);
  } catch (error) {
    NotificationManager.show('Failed to refresh wallet data', 'error');
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '🔄 Refresh';
    }
  }
}

// Filter functions
function filterTransactions() {
  const typeFilter = document.getElementById('transactionTypeFilter').value;
  const reasonFilter = document.getElementById('transactionReasonFilter').value;

  currentFilters.type = typeFilter;
  currentFilters.reason = reasonFilter;

  currentPage = 1;
  loadTransactionHistory(currentPage);
}

// Pagination functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    loadTransactionHistory(currentPage);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadTransactionHistory(currentPage);
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  NotificationManager.show('Logged out successfully', 'success', 2000);
  setTimeout(() => {
    window.location.href = '../auth/login/index.html';
  }, 1000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadWalletData();
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  NotificationManager.show('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
