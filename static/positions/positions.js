/* eslint-disable no-unused-vars */
// API Configuration
const API_BASE_URL = 'http://localhost:3002/v1';
let authToken = localStorage.getItem('token');
let currentPositionType = 'intraday';
let positions = { intraday: [], delivery: [] };
let ws = null;

// Check authentication
function checkAuth() {
  if (!authToken) {
    window.location.href = '../auth/';
    return false;
  }
  return true;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  loadUserInfo();
  loadPositions();
  setupWebSocket();
  setupEventListeners();

  // Auto refresh every 5 seconds
  setInterval(() => loadPositions(), 5000);
});

// Load user information
async function loadUserInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById('userName').textContent = data.user.name;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// Load positions from API
async function loadPositions() {
  try {
    const response = await fetch(`${API_BASE_URL}/positions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error('Failed to fetch positions');
    }

    const data = await response.json();
    positions.intraday = data.positions.filter((p) => p.positionType === 'intraday' && !p.isSquaredOff) || [];
    positions.delivery = data.positions.filter((p) => p.positionType === 'delivery' && !p.isSquaredOff) || [];

    updateStatistics();
    displayPositions();
  } catch (error) {
    console.error('Error loading positions:', error);
    showError('Failed to load positions');
  }
}

// Update statistics
function updateStatistics() {
  const activePositions = positions[currentPositionType];

  let totalInvestment = 0;
  let currentValue = 0;
  let totalPnL = 0;

  activePositions.forEach((position) => {
    const investment = Math.abs(position.quantity) * position.averagePrice;
    const value = Math.abs(position.quantity) * position.currentPrice;
    const pnl = position.quantity > 0 ? value - investment : investment - value;

    totalInvestment += investment;
    currentValue += value;
    totalPnL += pnl;
  });

  const pnlPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

  // Update DOM
  document.getElementById('totalPositions').textContent = activePositions.length;
  document.getElementById('totalInvestment').textContent =
    `₹${totalInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('currentValue').textContent =
    `₹${currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('totalPnL').textContent =
    `₹${totalPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('pnlPercentage').textContent = `${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%`;

  // Update card color
  const pnlCard = document.getElementById('pnlCard');
  pnlCard.className = 'stat-card ' + (totalPnL >= 0 ? 'positive' : 'negative');
}

// Display positions in table
function displayPositions() {
  const activePositions = positions[currentPositionType];

  if (activePositions.length === 0) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('intradaySection').style.display = currentPositionType === 'intraday' ? 'none' : 'block';
    document.getElementById('deliverySection').style.display = currentPositionType === 'delivery' ? 'none' : 'block';
    return;
  } else {
    document.getElementById('emptyState').style.display = 'none';
  }

  if (currentPositionType === 'intraday') {
    displayIntradayPositions(activePositions);
  } else {
    displayDeliveryPositions(activePositions);
  }
}

// Display intraday positions
function displayIntradayPositions(positions) {
  const tbody = document.getElementById('intradayPositionsBody');

  if (positions.length === 0) {
    tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10" style="text-align: center; padding: 2rem;">
                    No intraday positions found
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = positions
    .map((position) => {
      const investment = Math.abs(position.quantity) * position.averagePrice;
      const value = Math.abs(position.quantity) * position.currentPrice;
      const pnl = position.quantity > 0 ? value - investment : investment - value;
      const pnlPercentage = (pnl / investment) * 100;
      const positionType = position.quantity > 0 ? 'long' : 'short';

      return `
            <tr data-position-id="${position._id}">
                <td><strong>${position.symbol}</strong></td>
                <td><span class="position-type ${positionType}">${positionType.toUpperCase()}</span></td>
                <td>${Math.abs(position.quantity)}</td>
                <td>₹${position.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${position.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${investment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ₹${pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="${pnlPercentage >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%
                </td>
                <td>
                    <button class="action-btn btn-square-off" onclick="openSquareOffModal('${position._id}', 'intraday')">
                        Square Off
                    </button>
                </td>
            </tr>
        `;
    })
    .join('');
}

// Display delivery positions
function displayDeliveryPositions(positions) {
  const tbody = document.getElementById('deliveryPositionsBody');

  if (positions.length === 0) {
    tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9" style="text-align: center; padding: 2rem;">
                    No delivery positions found
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = positions
    .map((position) => {
      const investment = position.quantity * position.averagePrice;
      const value = position.quantity * position.currentPrice;
      const pnl = value - investment;
      const pnlPercentage = (pnl / investment) * 100;
      const expiresAt = new Date(position.expiresAt).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return `
            <tr data-position-id="${position._id}">
                <td><strong>${position.symbol}</strong></td>
                <td>${position.quantity}</td>
                <td>₹${position.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${position.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${investment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ₹${pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="${pnlPercentage >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%
                </td>
                <td>${expiresAt}</td>
            </tr>
        `;
    })
    .join('');
}

// Switch between tabs
function switchTab(type) {
  currentPositionType = type;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    }
  });

  // Show/hide sections
  document.getElementById('intradaySection').style.display = type === 'intraday' ? 'block' : 'none';
  document.getElementById('deliverySection').style.display = type === 'delivery' ? 'block' : 'none';

  updateStatistics();
  displayPositions();
}

// Open square off modal
function openSquareOffModal(positionId, type) {
  const position = positions[type].find((p) => p._id === positionId);
  if (!position) return;

  const investment = Math.abs(position.quantity) * position.averagePrice;
  const value = Math.abs(position.quantity) * position.currentPrice;
  const pnl = position.quantity > 0 ? value - investment : investment - value;

  document.getElementById('squareOffSymbol').textContent = position.symbol;
  document.getElementById('squareOffQuantity').textContent =
    `${Math.abs(position.quantity)} (${position.quantity > 0 ? 'LONG' : 'SHORT'})`;
  document.getElementById('squareOffAvgPrice').textContent = `₹${position.averagePrice.toFixed(2)}`;
  document.getElementById('squareOffCurrentPrice').textContent = `₹${position.currentPrice.toFixed(2)}`;
  document.getElementById('squareOffPnL').textContent = `₹${pnl.toFixed(2)}`;
  document.getElementById('squareOffPnL').className = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';

  // Store position ID for confirmation
  document.getElementById('squareOffModal').dataset.positionId = positionId;
  document.getElementById('squareOffModal').classList.add('show');
}

// Close square off modal
function closeSquareOffModal() {
  document.getElementById('squareOffModal').classList.remove('show');
}

// Confirm square off
async function confirmSquareOff() {
  const positionId = document.getElementById('squareOffModal').dataset.positionId;
  const position = [...positions.intraday, ...positions.delivery].find((p) => p._id === positionId);

  if (!position) return;

  try {
    // Place opposite order to square off
    const orderData = {
      symbol: position.symbol,
      exchange: position.exchange,
      orderType: position.positionType,
      orderVariant: 'market',
      transactionType: position.quantity > 0 ? 'sell' : 'buy',
      quantity: Math.abs(position.quantity),
    };

    const response = await fetch(`${API_BASE_URL}/orders/place`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error('Failed to square off position');
    }

    closeSquareOffModal();
    showSuccess('Position squared off successfully');
    loadPositions();
  } catch (error) {
    console.error('Error squaring off position:', error);
    showError('Failed to square off position: ' + error.message);
  }
}

// Setup WebSocket for real-time price updates
function setupWebSocket() {
  ws = new WebSocket('ws://localhost:3002');

  ws.onopen = () => {
    console.log('WebSocket connected');

    // Subscribe to all position symbols
    const symbols = [...new Set([...positions.intraday, ...positions.delivery].map((p) => p.symbol))];
    if (symbols.length > 0) {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          symbols: symbols,
        }),
      );
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'price_update') {
        updatePositionPrice(data.symbol, data.ltp);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    setTimeout(setupWebSocket, 3000);
  };
}

// Update position price from WebSocket
function updatePositionPrice(symbol, price) {
  let updated = false;

  positions.intraday.forEach((position) => {
    if (position.symbol === symbol) {
      position.currentPrice = price;
      updated = true;
    }
  });

  positions.delivery.forEach((position) => {
    if (position.symbol === symbol) {
      position.currentPrice = price;
      updated = true;
    }
  });

  if (updated) {
    updateStatistics();
    displayPositions();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  document.getElementById('intradaySearchInput')?.addEventListener('input', (e) => {
    filterPositions(e.target.value, 'intraday');
  });

  document.getElementById('deliverySearchInput')?.addEventListener('input', (e) => {
    filterPositions(e.target.value, 'delivery');
  });

  // Sort functionality
  document.getElementById('intradaySortSelect')?.addEventListener('change', (e) => {
    sortPositions(e.target.value, 'intraday');
  });

  document.getElementById('deliverySortSelect')?.addEventListener('change', (e) => {
    sortPositions(e.target.value, 'delivery');
  });
}

// Filter positions
function filterPositions(query, type) {
  const lowerQuery = query.toLowerCase();
  const filtered = positions[type].filter((position) => position.symbol.toLowerCase().includes(lowerQuery));

  if (type === 'intraday') {
    displayIntradayPositions(filtered);
  } else {
    displayDeliveryPositions(filtered);
  }
}

// Sort positions
function sortPositions(sortBy, type) {
  const sorted = [...positions[type]].sort((a, b) => {
    switch (sortBy) {
      case 'symbol':
        return a.symbol.localeCompare(b.symbol);
      case 'quantity':
        return Math.abs(b.quantity) - Math.abs(a.quantity);
      case 'pnl': {
        const pnlA = Math.abs(a.quantity) * a.currentPrice - Math.abs(a.quantity) * a.averagePrice;
        const pnlB = Math.abs(b.quantity) * b.currentPrice - Math.abs(b.quantity) * b.averagePrice;
        return pnlB - pnlA;
      }
      case 'pnlPercentage': {
        const pnlPercentA = ((a.currentPrice - a.averagePrice) / a.averagePrice) * 100;
        const pnlPercentB = ((b.currentPrice - b.averagePrice) / b.averagePrice) * 100;
        return pnlPercentB - pnlPercentA;
      }
      default:
        return 0;
    }
  });

  if (type === 'intraday') {
    displayIntradayPositions(sorted);
  } else {
    displayDeliveryPositions(sorted);
  }
}

// Show success message
function showSuccess(message) {
  alert(message);
}

// Show error message
function showError(message) {
  alert('Error: ' + message);
}

// Logout
function logout() {
  localStorage.removeItem('authToken');
  if (ws) ws.close();
  window.location.href = '../auth/';
}
