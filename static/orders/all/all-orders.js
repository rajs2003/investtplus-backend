/* eslint-disable no-unused-vars */
/* All Orders Page JavaScript */

const API_BASE = window.location.origin + '/v1';
let ordersData = [];
let filteredOrders = [];
let isLoading = false;
let currentPage = 1;
let pageSize = 25;
let totalPages = 1;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../../auth/login/index.html';
}

// Enhanced notification system
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
          top: 80px;
          right: 20px;
          z-index: 10000;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem;
          min-width: 300px;
          max-width: 400px;
          animation: slideInRight 0.3s ease;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .notification.success { border-left: 4px solid #10b981; }
        .notification.error { border-left: 4px solid #ef4444; }
        .notification.warning { border-left: 4px solid #f59e0b; }
        .notification.info { border-left: 4px solid #3b82f6; }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        }
        .notification-icon { font-size: 1.5rem; }
        .notification-message { flex: 1; font-weight: 500; }
        .notification-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0;
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

    setTimeout(() => notification.remove(), duration);
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
  // If already formatted as string (from backend), return as is
  if (typeof amount === 'string' && amount.includes('₹')) {
    return amount;
  }

  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// API Functions
async function fetchAllOrders(params = {}) {
  try {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 25,
      sort: 'createdAt:desc',
    });

    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.status) queryParams.append('status', params.status);
    if (params.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params.orderType) queryParams.append('orderType', params.orderType);

    const response = await fetch(`${API_BASE}/orders?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch orders');
    }

    const data = await response.json();
    // Backend returns { success, orders, pagination }
    return {
      results: data.orders || [],
      page: data.pagination?.page || 1,
      totalPages: data.pagination?.totalPages || 1,
      totalResults: data.pagination?.totalResults || 0,
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

async function cancelOrder(orderId, reason = 'User cancelled') {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
}

// Update Statistics
function updateStatistics() {
  const totalOrders = ordersData.length;
  const executedOrders = ordersData.filter((o) => o.status === 'executed').length;
  const pendingOrders = ordersData.filter((o) => o.status === 'pending').length;
  const cancelledOrders = ordersData.filter((o) => ['cancelled', 'rejected', 'expired'].includes(o.status)).length;

  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('executedOrders').textContent = executedOrders;
  document.getElementById('pendingOrders').textContent = pendingOrders;
  document.getElementById('cancelledOrders').textContent = cancelledOrders;
}

// Update Orders Table
function updateOrdersTable() {
  const tableBody = document.getElementById('ordersTableBody');

  if (filteredOrders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.7);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
          <p style="font-size: 1.1rem;">No orders found</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Try adjusting your filters</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredOrders
    .map((order) => {
      const canCancel = order.status === 'pending';
      const executedQty = order.executedQuantity ?? 0;
      const executedPrice = order.executedPrice ?? 0;
      const quantity = order.quantity ?? 0;
      const price = order.price ?? 0;
      // Backend may return formatted strings, handle both
      const orderValue = typeof order.orderValue === 'string' ? order.orderValue : (order.orderValue ?? 0);
      const netAmount = typeof order.netAmount === 'string' ? order.netAmount : (order.netAmount ?? 0);

      return `
        <tr>
          <td>
            <div style="font-weight: 500; color: white;">${formatDate(order.createdAt)}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: white;">${order.symbol || 'N/A'}</div>
            <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6);">${order.exchange || 'NSE'}</div>
          </td>
          <td>
            <span class="order-type ${(order.transactionType || 'buy').toLowerCase()}">
              ${(order.transactionType || 'N/A').toUpperCase()}
            </span>
          </td>
          <td>
            <span class="order-type ${(order.orderType || 'intraday').toLowerCase()}">
              ${(order.orderType || 'N/A').toUpperCase()}
            </span>
          </td>
          <td>
            <div style="font-weight: 500; color: white;">${(order.orderVariant || 'market').toUpperCase()}</div>
            ${order.triggerPrice > 0 ? `<div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6);">Trigger: ${formatCurrency(order.triggerPrice)}</div>` : ''}
          </td>
          <td>${quantity.toLocaleString()}</td>
          <td>${order.orderVariant === 'market' ? 'Market' : formatCurrency(price)}</td>
          <td>${executedQty > 0 ? executedQty.toLocaleString() : '-'}</td>
          <td>${executedPrice > 0 ? formatCurrency(executedPrice) : '-'}</td>
          <td>
            <span class="status-badge ${(order.status || 'pending').toLowerCase()}">
              ${(order.status || 'N/A').toUpperCase()}
            </span>
          </td>
          <td>${formatCurrency(orderValue)}</td>
          <td style="font-weight: 600; color: white;">${formatCurrency(netAmount)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="action-btn view" onclick="viewOrderDetails('${order.id}')" title="View Details">
                👁️
              </button>
              ${
                canCancel
                  ? `<button class="action-btn cancel" onclick="handleCancelOrder('${order.id}')" title="Cancel Order">
                ❌
              </button>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Update Pagination
function updatePagination(paginationData) {
  totalPages = paginationData.totalPages || 1;
  currentPage = paginationData.page || 1;

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('pageInfo');

  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages;
  }

  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${paginationData.totalResults || 0} total orders)`;
  }
}

// View Order Details (same as orders.js)
function viewOrderDetails(orderId) {
  const order = ordersData.find((o) => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('orderModal');
  const content = document.getElementById('orderDetailsContent');

  const executedQty = order.executedQuantity ?? 0;
  const executedPrice = order.executedPrice ?? 0;
  const quantity = order.quantity ?? 0;
  const price = order.price ?? 0;

  content.innerHTML = `
    <div class="order-detail-grid">
      <div class="detail-item">
        <label>Order ID</label>
        <div class="value">${order.id}</div>
      </div>
      <div class="detail-item">
        <label>Symbol</label>
        <div class="value">${order.symbol || 'N/A'}</div>
      </div>
      <div class="detail-item">
        <label>Exchange</label>
        <div class="value">${order.exchange || 'NSE'}</div>
      </div>
      <div class="detail-item">
        <label>Transaction Type</label>
        <div class="value">
          <span class="order-type ${(order.transactionType || 'buy').toLowerCase()}">
            ${(order.transactionType || 'N/A').toUpperCase()}
          </span>
        </div>
      </div>
      <div class="detail-item">
        <label>Order Type</label>
        <div class="value">
          <span class="order-type ${(order.orderType || 'intraday').toLowerCase()}">
            ${(order.orderType || 'N/A').toUpperCase()}
          </span>
        </div>
      </div>
      <div class="detail-item">
        <label>Order Variant</label>
        <div class="value">${(order.orderVariant || 'market').toUpperCase()}</div>
      </div>
      <div class="detail-item">
        <label>Quantity</label>
        <div class="value">${quantity.toLocaleString()}</div>
      </div>
      <div class="detail-item">
        <label>Price</label>
        <div class="value">${order.orderVariant === 'market' ? 'Market Price' : formatCurrency(price)}</div>
      </div>
      ${
        order.triggerPrice && order.triggerPrice > 0
          ? `
      <div class="detail-item">
        <label>Trigger Price</label>
        <div class="value">${formatCurrency(order.triggerPrice)}</div>
      </div>
      `
          : ''
      }
      <div class="detail-item">
        <label>Status</label>
        <div class="value">
          <span class="status-badge ${(order.status || 'pending').toLowerCase()}">
            ${(order.status || 'N/A').toUpperCase()}
          </span>
        </div>
      </div>
      ${
        executedQty > 0
          ? `
      <div class="detail-item">
        <label>Executed Quantity</label>
        <div class="value">${executedQty.toLocaleString()}</div>
      </div>
      <div class="detail-item">
        <label>Executed Price</label>
        <div class="value">${formatCurrency(executedPrice)}</div>
      </div>
      <div class="detail-item">
        <label>Executed At</label>
        <div class="value">${formatDate(order.executedAt)}</div>
      </div>
      `
          : ''
      }
      <div class="detail-item">
        <label>Order Value</label>
        <div class="value">${formatCurrency(order.orderValue)}</div>
      </div>
      <div class="detail-item">
        <label>Brokerage</label>
        <div class="value">${formatCurrency(order.brokerage ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>STT</label>
        <div class="value">${formatCurrency(order.stt ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>Transaction Charges</label>
        <div class="value">${formatCurrency(order.transactionCharges ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>GST</label>
        <div class="value">${formatCurrency(order.gst ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>SEBI Charges</label>
        <div class="value">${formatCurrency(order.sebiCharges ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>Stamp Duty</label>
        <div class="value">${formatCurrency(order.stampDuty ?? 0)}</div>
      </div>
      <div class="detail-item">
        <label>Total Charges</label>
        <div class="value">${formatCurrency(order.totalCharges)}</div>
      </div>
      <div class="detail-item">
        <label>Net Amount</label>
        <div class="value" style="font-size: 1.3rem; color: #10b981;">${formatCurrency(order.netAmount)}</div>
      </div>
      <div class="detail-item">
        <label>Created At</label>
        <div class="value">${formatDate(order.createdAt)}</div>
      </div>
      ${
        order.cancelledAt
          ? `
      <div class="detail-item">
        <label>Cancelled At</label>
        <div class="value">${formatDate(order.cancelledAt)}</div>
      </div>
      `
          : ''
      }
      ${
        order.cancellationReason
          ? `
      <div class="detail-item" style="grid-column: 1 / -1;">
        <label>Cancellation Reason</label>
        <div class="value">${order.cancellationReason}</div>
      </div>
      `
          : ''
      }
      ${
        order.rejectionReason
          ? `
      <div class="detail-item" style="grid-column: 1 / -1;">
        <label>Rejection Reason</label>
        <div class="value">${order.rejectionReason}</div>
      </div>
      `
          : ''
      }
    </div>
  `;

  modal.style.display = 'block';
}

// Handle Cancel Order
async function handleCancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }

  try {
    await cancelOrder(orderId);
    NotificationManager.show('Order cancelled successfully', 'success');
    await loadOrders();
  } catch (error) {
    NotificationManager.show(error.message || 'Failed to cancel order', 'error');
  }
}

// Get Filter Parameters
function getFilterParams() {
  const params = {
    page: currentPage,
    limit: pageSize,
  };

  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  const status = document.getElementById('statusFilter')?.value;
  const transactionType = document.getElementById('typeFilter')?.value;
  const orderType = document.getElementById('orderTypeFilter')?.value;

  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (status) params.status = status;
  if (transactionType) params.transactionType = transactionType;
  if (orderType) params.orderType = orderType;

  return params;
}

// Filter Orders Locally (for search)
function filterOrdersLocally() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

  if (!searchTerm) {
    filteredOrders = [...ordersData];
  } else {
    filteredOrders = ordersData.filter((order) => order.symbol.toLowerCase().includes(searchTerm));
  }

  updateOrdersTable();
}

// Load Orders
async function loadOrders() {
  try {
    isLoading = true;
    setLoadingState(true);

    const params = getFilterParams();
    const response = await fetchAllOrders(params);

    ordersData = response.results || [];
    filteredOrders = [...ordersData];

    updateStatistics();
    updateOrdersTable();
    updatePagination(response);

    NotificationManager.show('Orders loaded successfully', 'success', 3000);
  } catch (error) {
    console.error('Error loading orders:', error);
    NotificationManager.show('Failed to load orders', 'error');
    showErrorState();
  } finally {
    isLoading = false;
    setLoadingState(false);
  }
}

// Loading State
function setLoadingState(loading) {
  const refreshBtn = document.getElementById('refreshBtn');
  const applyBtn = document.getElementById('applyFiltersBtn');

  if (refreshBtn) {
    refreshBtn.disabled = loading;
    refreshBtn.innerHTML = loading ? '🔄 Loading...' : '🔄 Refresh';
  }

  if (applyBtn) {
    applyBtn.disabled = loading;
    applyBtn.innerHTML = loading ? '🔍 Loading...' : '🔍 Apply Filters';
  }
}

// Error State
function showErrorState() {
  const tableBody = document.getElementById('ordersTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="13" style="text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.7);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <p style="font-size: 1.1rem;">Failed to load orders</p>
        <button onclick="loadOrders()" class="refresh-btn" style="margin-top: 1rem;">
          Try Again
        </button>
      </td>
    </tr>
  `;
}

// Export Orders
function exportOrders() {
  if (filteredOrders.length === 0) {
    NotificationManager.show('No orders to export', 'warning');
    return;
  }

  const csvContent = [
    [
      'Date & Time',
      'Symbol',
      'Type',
      'Order Type',
      'Variant',
      'Quantity',
      'Price',
      'Executed Qty',
      'Executed Price',
      'Status',
      'Order Value',
      'Net Amount',
    ].join(','),
    ...filteredOrders.map((order) =>
      [
        formatDate(order.createdAt),
        order.symbol,
        order.transactionType,
        order.orderType,
        order.orderVariant,
        order.quantity,
        order.price || 0,
        order.executedQuantity || 0,
        order.executedPrice || 0,
        order.status,
        order.orderValue,
        order.netAmount,
      ].join(','),
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all_orders_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  NotificationManager.show('Orders exported successfully', 'success');
}

// Pagination handlers
function goToNextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadOrders();
  }
}

function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    loadOrders();
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../../auth/login/index.html';
}

// Display user name
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = document.getElementById('userName');
  if (userName && user.name) {
    userName.textContent = `Welcome, ${user.name}!`;
  }
}

// Set default date range (last 30 days)
function setDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const endDateInput = document.getElementById('endDate');
  const startDateInput = document.getElementById('startDate');

  if (endDateInput) {
    endDateInput.value = endDate.toISOString().split('T')[0];
  }

  if (startDateInput) {
    startDateInput.value = startDate.toISOString().split('T')[0];
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  displayUserInfo();
  setDefaultDateRange();
  await loadOrders();

  // Setup filters
  document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
    currentPage = 1; // Reset to first page
    loadOrders();
  });

  document.getElementById('searchInput')?.addEventListener('input', filterOrdersLocally);

  // Setup buttons
  document.getElementById('refreshBtn')?.addEventListener('click', loadOrders);
  document.getElementById('exportBtn')?.addEventListener('click', exportOrders);

  // Pagination
  document.getElementById('prevPageBtn')?.addEventListener('click', goToPreviousPage);
  document.getElementById('nextPageBtn')?.addEventListener('click', goToNextPage);

  // Page size change
  document.getElementById('pageSizeSelect')?.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10);
    currentPage = 1;
    loadOrders();
  });

  // Setup modal
  const modal = document.getElementById('orderModal');
  const closeBtn = document.querySelector('.close');

  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
