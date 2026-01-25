/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const API_BASE = window.location.origin + '/v1';

// State management
let currentPage = 1;
let itemsPerPage = 20;
let allStocks = [];
let filteredStocks = [];
let subscribedStocks = new Set();
let socket = null;
let marketStatus = 'CLOSED';

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../auth/login/index.html';
}

// Notification Manager (reusing from wallet)
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
                .notification.success { border-color: rgba(74, 222, 128, 0.4); background: rgba(74, 222, 128, 0.1); }
                .notification.error { border-color: rgba(248, 113, 113, 0.4); background: rgba(248, 113, 113, 0.1); }
                .notification.warning { border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.1); }
                .notification-content { display: flex; align-items: center; gap: 12px; }
                .notification-icon { font-size: 1.5rem; }
                .notification-message { flex: 1; color: rgba(255, 255, 255, 0.9); font-weight: 500; }
                .notification-close { background: none; border: none; color: rgba(255, 255, 255, 0.7); font-size: 1.25rem; cursor: pointer; }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) closeBtn.addEventListener('click', () => notification.remove());
    if (duration > 0) setTimeout(() => notification.remove(), duration);
  }

  static getIcon(type) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    return icons[type] || icons.info;
  }
}

// Utility Functions
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(2) + ' K';
  return num.toString();
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Initialize WebSocket Connection
function initializeWebSocket() {
  const wsUrl = window.location.origin;
  const authToken = localStorage.getItem('token');

  socket = io(`${wsUrl}/market`, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to market WebSocket');
    updateConnectionStatus(true);
    NotificationManager.show('Connected to live market data', 'success', 3000);

    // Subscribe to all stocks
    subscribeToStocks();
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from market WebSocket');
    updateConnectionStatus(false);
    NotificationManager.show('Disconnected from market data', 'warning', 3000);
  });

  socket.on('marketStatus', (status) => {
    marketStatus = status.status;
    updateMarketStatus(status);
  });

  socket.on('tick', (data) => {
    updateStockPrice(data);
  });

  socket.on('priceUpdate', (data) => {
    updateStockPrice(data);
  });

  socket.on('subscribed', (data) => {
    console.log(`Subscribed to ${data.count} symbols`);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    NotificationManager.show(error.message || 'WebSocket error occurred', 'error');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
  });
}

function updateConnectionStatus(connected) {
  const statusDiv = document.getElementById('connectionStatus');
  if (statusDiv) {
    const dot = statusDiv.querySelector('.status-dot');
    const text = statusDiv.querySelector('.status-text');

    if (connected) {
      dot.style.background = '#10b981';
      text.textContent = 'Connected';
      statusDiv.style.color = '#10b981';
    } else {
      dot.style.background = '#ef4444';
      text.textContent = 'Disconnected';
      statusDiv.style.color = '#ef4444';
    }
  }
}

function updateMarketStatus(status) {
  const statusDiv = document.getElementById('marketStatus');
  if (statusDiv) {
    const dot = statusDiv.querySelector('.status-dot');
    const text = statusDiv.querySelector('.status-text');

    if (status.status === 'OPEN') {
      dot.style.background = '#10b981';
      text.textContent = 'Market Open';
      statusDiv.style.color = '#10b981';
    } else {
      dot.style.background = '#ef4444';
      text.textContent = `Market ${status.status}`;
      statusDiv.style.color = '#ef4444';
    }
  }
}

function subscribeToStocks() {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected, cannot subscribe');
    return;
  }

  const symbols = allStocks.map((stock) => ({
    exchange: stock.exchange || 'NSE',
    symbol: stock.symbol,
  }));

  if (symbols.length > 0) {
    console.log('📡 Subscribing to', symbols.length, 'stocks:', symbols);
    socket.emit('subscribe', { symbols });
    symbols.forEach((s) => subscribedStocks.add(`${s.exchange}:${s.symbol}`));
  } else {
    console.warn('No stocks to subscribe to');
  }
}

function updateStockPrice(data) {
  const { symbol, exchange, ltp, change, changePercent, volume, open, high, low } = data;

  console.log('📈 Price update:', { symbol, exchange, ltp, change, changePercent });

  // Update in allStocks array
  const stock = allStocks.find((s) => s.symbol === symbol && s.exchange === exchange);
  if (stock) {
    stock.ltp = ltp;
    stock.lastPrice = ltp; // Also set for compatibility
    stock.change = change || 0;
    stock.changePercent = changePercent || 0;
    if (volume !== undefined) stock.volume = volume;
    if (open !== undefined) stock.open = open;
    if (high !== undefined) stock.high = high;
    if (low !== undefined) stock.low = low;
  }

  // Update in filteredStocks array
  const filteredStock = filteredStocks.find((s) => s.symbol === symbol && s.exchange === exchange);
  if (filteredStock) {
    filteredStock.ltp = ltp;
    filteredStock.lastPrice = ltp;
    filteredStock.change = change || 0;
    filteredStock.changePercent = changePercent || 0;
    if (volume !== undefined) filteredStock.volume = volume;
    if (open !== undefined) filteredStock.open = open;
    if (high !== undefined) filteredStock.high = high;
    if (low !== undefined) filteredStock.low = low;
  }

  // Update in UI
  const stockCard = document.querySelector(`[data-symbol="${symbol}"][data-exchange="${exchange}"]`);
  if (stockCard) {
    const priceElement = stockCard.querySelector('.stock-price');
    const changeElement = stockCard.querySelector('.price-change');
    const volumeElement = stockCard.querySelector('.stock-volume');

    if (priceElement) priceElement.textContent = formatCurrency(ltp);
    if (changeElement) {
      changeElement.textContent = `${formatPercentage(changePercent || 0)} (${formatCurrency(Math.abs(change || 0))})`;
      changeElement.className = `price-change ${(changePercent || 0) >= 0 ? 'positive' : 'negative'}`;
    }
    if (volumeElement && volume !== undefined) {
      volumeElement.textContent = `Vol: ${formatNumber(volume)}`;
    }

    // Add flash animation
    stockCard.classList.add('price-flash');
    setTimeout(() => stockCard.classList.remove('price-flash'), 300);
  }
}

// Load stocks from API
async function loadStocks() {
  try {
    const response = await fetch(`${API_BASE}/stocks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      NotificationManager.show('Session expired. Please login again.', 'error');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '../auth/login/index.html';
      }, 2000);
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.results) {
      allStocks = data.results;
      filteredStocks = [...allStocks];
      displayStocks();
      subscribeToStocks();
      NotificationManager.show(`Loaded ${allStocks.length} stocks successfully`, 'success', 3000);
    }
  } catch (error) {
    console.error('Error loading stocks:', error);
    NotificationManager.show('Failed to load stocks', 'error');
    showErrorState();
  }
}

function displayStocks() {
  const grid = document.getElementById('stocksGrid');

  if (filteredStocks.length === 0) {
    grid.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📭</div>
                <p>No stocks found</p>
            </div>
        `;
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageStocks = filteredStocks.slice(start, end);

  // Generate stock cards
  grid.innerHTML = pageStocks
    .map(
      (stock) => `
        <div class="stock-card" data-symbol="${stock.symbol}" data-exchange="${stock.exchange || 'NSE'}">
            <div class="stock-header">
                <div class="stock-info">
                    <h3 class="stock-symbol">${stock.symbol}</h3>
                    <p class="stock-name">${stock.name || stock.companyName || ''}</p>
                    <span class="stock-sector">${stock.sector || 'N/A'}</span>
                </div>
            </div>
            
            <div class="stock-body">
                <div class="stock-price">${formatCurrency(stock.ltp || stock.lastPrice || stock.price || 0)}</div>
                <div class="price-change ${(stock.changePercent || 0) >= 0 ? 'positive' : 'negative'}">
                    ${formatPercentage(stock.changePercent || 0)} (${formatCurrency(Math.abs(stock.change || 0))})
                </div>
                <div class="stock-volume">Vol: ${formatNumber(stock.volume || 0)}</div>
            </div>
            
            <div class="stock-footer">
                <a href='detail.html?symbol=${stock.symbol}&exchange=${stock.exchange}'>
                    <button class="btn-detail" onclick="">
                        View Details
                    </button>
                </a>
                
            </div>
        </div>
    `,
    )
    .join('');

  // Update pagination
  updatePagination(totalPages);
}

function updatePagination(totalPages) {
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

function showErrorState() {
  const grid = document.getElementById('stocksGrid');
  grid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">❌</div>
            <h3>Failed to load stocks</h3>
            <p>Please try refreshing the page</p>
            <button onclick="location.reload()" class="btn-retry">Refresh Page</button>
        </div>
    `;
}

// Filter and Sort Functions
function filterStocks() {
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const sectorFilter = document.getElementById('sectorFilter').value;

  filteredStocks = allStocks.filter((stock) => {
    const matchesSearch =
      !searchQuery ||
      stock.symbol.toLowerCase().includes(searchQuery) ||
      (stock.name || stock.companyName || '').toLowerCase().includes(searchQuery);

    const matchesSector = !sectorFilter || stock.sector === sectorFilter;

    return matchesSearch && matchesSector;
  });

  currentPage = 1;
  displayStocks();
}

function sortStocks() {
  const sortBy = document.getElementById('sortBy').value;

  filteredStocks.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'symbol':
        return a.symbol.localeCompare(b.symbol);
      case 'price':
        aVal = a.lastPrice || a.price || 0;
        bVal = b.lastPrice || b.price || 0;
        return bVal - aVal;
      case 'change':
        aVal = a.changePercent || 0;
        bVal = b.changePercent || 0;
        return bVal - aVal;
      case 'volume':
        aVal = a.volume || 0;
        bVal = b.volume || 0;
        return bVal - aVal;
      default:
        return 0;
    }
  });

  displayStocks();
}

// Pagination Functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayStocks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayStocks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Navigation Functions
function viewStockDetail(symbol, exchange) {
  console.log('🔗 Navigating to stock detail:', { symbol, exchange });
  const url = `detail.html?symbol=${symbol}&exchange=${exchange || 'NSE'}`;
  console.log('📍 Detail page URL:', url);
  window.location.href = url;
}

function refreshStocks() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Refreshing...';
  }

  loadStocks().then(() => {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '🔄 Refresh';
    }
  });
}

function logout() {
  if (socket) {
    socket.disconnect();
  }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  NotificationManager.show('Logged out successfully', 'success', 2000);
  setTimeout(() => {
    window.location.href = '../auth/login/index.html';
  }, 1000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Update user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmailElement = document.getElementById('userEmail');
  if (userEmailElement) {
    userEmailElement.textContent = user.email || 'User';
  }
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = user.name || 'User';
  }

  // Add search listener
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterStocks);
  }

  // Initialize WebSocket FIRST
  initializeWebSocket();

  // Load stocks after WebSocket initialization
  await loadStocks();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.disconnect();
  }
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
