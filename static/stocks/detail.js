/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// Stock Detail Page - WebSocket Integration & Order Placement
const API_BASE_URL = window.location.origin + '/v1';
const SOCKET_URL = window.location.origin;

// State Management
let socket = null;
let currentStock = null;
let currentPrice = 0;
let isMarketOpen = false;
let currentTradeAction = 'buy'; // 'buy' or 'sell'
let walletBalance = 0;
let leverageBalance = 0;

// Helper Functions
function getAuthToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../auth/login/index.html';
    return null;
  }
  return token;
}

function getUserEmail() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.email || 'User';
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  return 'User';
}

function getStockSymbolFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('symbol');
}

function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return parseFloat(num).toFixed(decimals);
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return `₹${formatNumber(amount, 2)}`;
}

function formatVolume(volume) {
  if (volume === null || volume === undefined || isNaN(volume)) return '0';
  if (volume >= 10000000) return (volume / 10000000).toFixed(2) + ' Cr';
  if (volume >= 100000) return (volume / 100000).toFixed(2) + ' L';
  if (volume >= 1000) return (volume / 1000).toFixed(2) + ' K';
  return volume.toString();
}

function formatMarketCap(cap) {
  if (cap === null || cap === undefined || isNaN(cap)) return '₹0.00 Cr';
  return `₹${formatNumber(cap / 10000000, 2)} Cr`;
}

async function makeRequest(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) return null;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const finalOptions = { ...defaultOptions, ...options };
  if (options.headers) {
    finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);

    console.log(`API Request: ${API_BASE_URL}${endpoint}`, {
      status: response.status,
      ok: response.ok,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('Session expired. Please login again.');
      window.location.href = '../auth/login/index.html';
      return null;
    }

    const data = await response.json();

    console.log('API Response:', data);

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// WebSocket Functions
function initializeWebSocket() {
  const token = getAuthToken();
  if (!token) return;

  console.log('Initializing WebSocket connection...');

  socket = io(`${SOCKET_URL}/market`, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
    updateConnectionStatus(true);

    // Subscribe to current stock when connected
    if (currentStock && currentStock.symbol) {
      console.log('\ud83d\udd17 WebSocket connected, subscribing to', currentStock.symbol);
      subscribeToStock(currentStock.symbol);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
    updateConnectionStatus(false);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    updateConnectionStatus(false);
  });

  socket.on('marketStatus', (data) => {
    console.log('Market status:', data);
    isMarketOpen = data.isOpen;
    updateMarketStatus(data.isOpen);
  });

  socket.on('tick', (data) => {
    console.log('Tick update received:', data);
    if (currentStock && data.symbol === currentStock.symbol) {
      updateStockPrice(data);
    }
  });

  socket.on('priceUpdate', (data) => {
    console.log('Price update received:', data);
    if (currentStock && data.symbol === currentStock.symbol) {
      updateStockPrice(data);
    }
  });

  socket.on('subscribed', (data) => {
    console.log('Subscribed to:', data);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function subscribeToStock(symbol) {
  if (socket && socket.connected && symbol) {
    console.log('Subscribing to:', symbol);
    const subscriptionData = {
      symbols: [
        {
          symbol: symbol,
          exchange: currentStock?.exchange || 'NSE',
        },
      ],
    };
    socket.emit('subscribe', subscriptionData);
  }
}

function updateConnectionStatus(connected) {
  const dot = document.getElementById('connectionDot');
  const text = document.getElementById('connectionText');

  if (connected) {
    dot.classList.add('connected');
    text.textContent = 'Connected';
  } else {
    dot.classList.remove('connected');
    text.textContent = 'Disconnected';
  }
}

function updateMarketStatus(isOpen) {
  const dot = document.getElementById('marketStatusDot');
  const text = document.getElementById('marketStatusText');

  if (isOpen) {
    dot.classList.add('market-open');
    text.textContent = 'Market Open';
  } else {
    dot.classList.remove('market-open');
    text.textContent = 'Market Closed';
  }
}

function updateStockPrice(priceData) {
  const oldPrice = currentPrice;
  currentPrice = priceData.ltp || priceData.currentPrice || priceData.price || currentPrice;

  console.log('💰 Detail page price update:', {
    symbol: priceData.symbol,
    oldPrice,
    newPrice: currentPrice,
    ltp: priceData.ltp,
    change: priceData.change,
    changePercent: priceData.changePercent,
  });

  // Update current price with flash animation
  const priceElement = document.getElementById('currentPrice');
  priceElement.textContent = formatCurrency(currentPrice);

  // Add flash animation based on price movement
  priceElement.classList.remove('price-flash-up', 'price-flash-down');
  if (currentPrice > oldPrice) {
    priceElement.classList.add('price-flash-up');
  } else if (currentPrice < oldPrice) {
    priceElement.classList.add('price-flash-down');
  }

  // Remove flash class after animation
  setTimeout(() => {
    priceElement.classList.remove('price-flash-up', 'price-flash-down');
  }, 500);

  // Update other price fields
  if (priceData.open !== undefined) {
    document.getElementById('openPrice').textContent = formatCurrency(priceData.open);
  }
  if (priceData.high !== undefined) {
    document.getElementById('highPrice').textContent = formatCurrency(priceData.high);
  }
  if (priceData.low !== undefined) {
    document.getElementById('lowPrice').textContent = formatCurrency(priceData.low);
  }
  if (priceData.volume !== undefined) {
    document.getElementById('volume').textContent = formatVolume(priceData.volume);
  }

  // Update price change
  updatePriceChange(priceData);

  // Update order summary with new price
  updateOrderSummary();
}

function updatePriceChange(stock) {
  const changePercent = stock.changePercent || 0;
  const changeValue = stock.change || 0;

  const priceChangeElement = document.getElementById('priceChange');
  const changeValueSpan = priceChangeElement.querySelector('.change-value');

  const sign = changeValue >= 0 ? '+' : '';
  changeValueSpan.textContent = `${sign}${formatCurrency(changeValue)} (${sign}${formatNumber(changePercent, 2)}%)`;

  if (changeValue >= 0) {
    priceChangeElement.classList.remove('negative');
    priceChangeElement.classList.add('positive');
  } else {
    priceChangeElement.classList.remove('positive');
    priceChangeElement.classList.add('negative');
  }
}

// Load Stock Details
async function loadStockDetails() {
  const symbol = getStockSymbolFromURL();

  console.log('🔍 Loading stock details for:', symbol);

  if (!symbol) {
    console.error('❌ No symbol provided in URL');
    showError('No stock symbol provided in URL');
    return;
  }

  try {
    showLoading(true);

    console.log('📡 Fetching stock data from:', `/stocks/${symbol}`);
    const response = await makeRequest(`/stocks/${symbol}`);

    console.log('📦 Stock API Response:', response);

    if (response && response.stock) {
      currentStock = response.stock;
      currentPrice = currentStock.ltp || currentStock.currentPrice || currentStock.price || 0;

      console.log('✅ Stock loaded:', {
        symbol: currentStock.symbol,
        price: currentPrice,
        companyName: currentStock.companyName,
      });

      displayStockDetails(currentStock);

      // Subscribe to WebSocket updates (will subscribe when connected)
      if (socket && socket.connected) {
        console.log('✅ Socket already connected, subscribing now');
        subscribeToStock(currentStock.symbol);
      } else {
        console.log('⏳ Socket not connected yet, will subscribe on connect event');
      }

      showLoading(false);
    } else {
      console.error('❌ Invalid response structure:', response);
      throw new Error('Stock data not found in response');
    }
  } catch (error) {
    console.error('❌ Error loading stock:', error);
    showError(`Failed to load stock: ${error.message}`);
    showLoading(false);
  }
}

async function displayStockDetails(stock) {
  // Update header
  document.getElementById('stockSymbol').textContent = stock.symbol || '-';
  document.getElementById('stockName').textContent = stock.companyName || stock.name || '-';
  document.getElementById('stockSector').textContent = stock.sector || '-';
  document.getElementById('stockExchange').textContent = stock.exchange || 'NSE';

  // Update price section
  currentPrice = stock.ltp || stock.currentPrice || stock.price || 0;
  document.getElementById('currentPrice').textContent = formatCurrency(currentPrice);
  document.getElementById('openPrice').textContent = formatCurrency(stock.open || 0);
  document.getElementById('highPrice').textContent = formatCurrency(stock.high || 0);
  document.getElementById('lowPrice').textContent = formatCurrency(stock.low || 0);
  document.getElementById('volume').textContent = formatVolume(stock.volume || 0);

  updatePriceChange(stock);

  // Update information section
  document.getElementById('marketCap').textContent = formatMarketCap(stock.marketCap || 0);
  document.getElementById('peRatio').textContent = stock.peRatio ? formatNumber(stock.peRatio, 2) : 'N/A';
  document.getElementById('fiftyTwoWeekHigh').textContent = formatCurrency(stock.fiftyTwoWeekHigh || 0);
  document.getElementById('fiftyTwoWeekLow').textContent = formatCurrency(stock.fiftyTwoWeekLow || 0);
  document.getElementById('avgVolume').textContent = formatVolume(stock.avgVolume || 0);
  document.getElementById('sectorInfo').textContent = stock.sector || 'N/A';

  // Initialize order summary
  updateOrderSummary();

  // Fetch wallet balance
  await fetchWalletBalance();

  // Show content
  document.getElementById('stockDetail').style.display = 'block';
}

// Fetch Wallet Balance
async function fetchWalletBalance() {
  try {
    const response = await makeRequest('/wallet');
    if (response && response.wallet) {
      walletBalance = response.wallet.balance || 0;
      leverageBalance = response.wallet.leverageBalance || 0;

      document.getElementById('availableBalance').textContent = formatCurrency(walletBalance);
      document.getElementById('leverageBalance').textContent = formatCurrency(leverageBalance);
    }
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
  }
}

// Toggle Buy/Sell
function toggleTradeAction(action) {
  currentTradeAction = action;

  // Update button states
  const buyBtn = document.getElementById('buyToggleBtn');
  const sellBtn = document.getElementById('sellToggleBtn');

  if (action === 'buy') {
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
  } else {
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
  }

  // Update submit button
  const submitBtn = document.getElementById('tradeSubmitBtn');
  if (action === 'buy') {
    submitBtn.innerHTML = '<span class="icon">🛒</span> Place Buy Order';
    submitBtn.setAttribute('data-action', 'buy');
  } else {
    submitBtn.innerHTML = '<span class="icon">💰</span> Place Sell Order';
    submitBtn.setAttribute('data-action', 'sell');
  }

  updateOrderSummary();
}

// Handle Order Type Change
function handleOrderTypeChange() {
  const orderType = document.getElementById('orderType').value;

  // Show/hide leverage balance based on order type
  if (orderType === 'intraday') {
    document.getElementById('leverageBalanceDisplay').style.display = 'flex';
    document.getElementById('normalBalanceDisplay').style.display = 'none';
    document.getElementById('marginRow').style.display = 'flex';
  } else {
    document.getElementById('leverageBalanceDisplay').style.display = 'none';
    document.getElementById('normalBalanceDisplay').style.display = 'flex';
    document.getElementById('marginRow').style.display = 'none';
  }

  updateOrderSummary();
}

// Handle Order Variant Change
function handleOrderVariantChange() {
  const variant = document.getElementById('orderVariant').value;

  // Show/hide price and trigger price fields
  const priceGroup = document.getElementById('priceGroup');
  const triggerPriceGroup = document.getElementById('triggerPriceGroup');
  const priceInput = document.getElementById('orderPrice');
  const triggerPriceInput = document.getElementById('triggerPrice');

  if (variant === 'market') {
    priceGroup.style.display = 'none';
    triggerPriceGroup.style.display = 'none';
    priceInput.required = false;
    triggerPriceInput.required = false;
  } else if (variant === 'limit') {
    priceGroup.style.display = 'block';
    triggerPriceGroup.style.display = 'none';
    priceInput.required = true;
    triggerPriceInput.required = false;
  } else if (variant === 'sl') {
    priceGroup.style.display = 'block';
    triggerPriceGroup.style.display = 'block';
    priceInput.required = true;
    triggerPriceInput.required = true;
  }

  updateOrderSummary();
}

function updateOrderSummary() {
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const orderType = document.getElementById('orderType').value;
  const orderVariant = document.getElementById('orderVariant').value;

  // Get price based on variant
  let effectivePrice = currentPrice;
  if (orderVariant === 'limit' || orderVariant === 'sl') {
    const customPrice = parseFloat(document.getElementById('orderPrice').value);
    if (customPrice > 0) {
      effectivePrice = customPrice;
    }
  }

  const total = effectivePrice * quantity;

  // Calculate margin for intraday orders (typically 5x leverage = 20% margin)
  const marginRequired = orderType === 'intraday' ? total * 0.2 : total;

  // Update summary
  document.getElementById('summaryPrice').textContent = formatCurrency(effectivePrice);
  document.getElementById('summaryQty').textContent = quantity;
  document.getElementById('summaryTotal').textContent = formatCurrency(total);
  document.getElementById('marginAmount').textContent = formatCurrency(marginRequired);
}

// Order Placement Functions
async function placeOrder(event) {
  event.preventDefault();

  const quantity = parseInt(document.getElementById('quantity').value);
  const orderType = document.getElementById('orderType').value;
  const orderVariant = document.getElementById('orderVariant').value;
  const orderPrice = parseFloat(document.getElementById('orderPrice').value);
  const triggerPrice = parseFloat(document.getElementById('triggerPrice').value);

  if (!quantity || quantity < 1) {
    alert('Please enter a valid quantity');
    return;
  }

  if (!currentStock) {
    alert('Stock data not loaded');
    return;
  }

  // Validate prices for limit and SL orders
  if ((orderVariant === 'limit' || orderVariant === 'sl') && (!orderPrice || orderPrice <= 0)) {
    alert('Please enter a valid price');
    return;
  }

  if (orderVariant === 'sl' && (!triggerPrice || triggerPrice <= 0)) {
    alert('Please enter a valid trigger price');
    return;
  }

  // Calculate effective price and total
  let effectivePrice = currentPrice;
  if (orderVariant === 'limit' || orderVariant === 'sl') {
    effectivePrice = orderPrice;
  }

  const total = effectivePrice * quantity;
  const marginRequired = orderType === 'intraday' ? total * 0.2 : total;

  // Confirm order
  let confirmMsg =
    `Place ${currentTradeAction.toUpperCase()} Order?\n\n` +
    `Stock: ${currentStock.symbol}\n` +
    `Quantity: ${quantity}\n` +
    `Type: ${orderType}\n` +
    `Variant: ${orderVariant}\n`;

  if (orderVariant === 'market') {
    confirmMsg += `Price: Market Price (${formatCurrency(currentPrice)})\n`;
  } else if (orderVariant === 'limit') {
    confirmMsg += `Price: ${formatCurrency(orderPrice)}\n`;
  } else if (orderVariant === 'sl') {
    confirmMsg += `Trigger Price: ${formatCurrency(triggerPrice)}\n` + `Limit Price: ${formatCurrency(orderPrice)}\n`;
  }

  confirmMsg += `Est. Total: ${formatCurrency(total)}\n`;

  if (orderType === 'intraday') {
    confirmMsg += `Margin Required: ${formatCurrency(marginRequired)}`;
  }

  const confirmed = confirm(confirmMsg);
  if (!confirmed) return;

  try {
    // Build order payload
    const orderPayload = {
      symbol: currentStock.symbol,
      exchange: currentStock.exchange || 'NSE',
      orderType: orderType,
      orderVariant: orderVariant,
      transactionType: currentTradeAction,
      quantity: quantity,
    };

    // Add price fields based on variant
    if (orderVariant === 'limit') {
      orderPayload.price = orderPrice;
    } else if (orderVariant === 'sl') {
      orderPayload.price = orderPrice;
      orderPayload.triggerPrice = triggerPrice;
    }

    console.log('Placing order:', orderPayload);

    const response = await makeRequest('/orders/place', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });

    if (response && response.order) {
      alert(
        `Order Placed Successfully!\n\n` +
          `Order ID: ${response.order.orderId}\n` +
          `Status: ${response.order.status}\n` +
          `Type: ${currentTradeAction.toUpperCase()}`,
      );

      // Reset form
      document.getElementById('tradingForm').reset();
      document.getElementById('quantity').value = 1;
      document.getElementById('orderType').value = 'intraday';
      document.getElementById('orderVariant').value = 'market';
      handleOrderTypeChange();
      handleOrderVariantChange();
      updateOrderSummary();

      // Refresh wallet balance
      await fetchWalletBalance();
    } else {
      throw new Error('Failed to place order');
    }
  } catch (error) {
    console.error('Error placing order:', error);
    alert(`Error: ${error.message || 'Failed to place order'}`);
  }
}

// UI Helper Functions
function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
  document.getElementById('stockDetail').style.display = show ? 'none' : 'block';
  document.getElementById('errorState').style.display = 'none';
}

function showError(message) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('stockDetail').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  document.getElementById('errorMessage').textContent = message;
}

// Event Listeners
function initializeEventListeners() {
  // User display
  document.getElementById('userEmail').textContent = getUserEmail();

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login/index.html';
  });

  // Buy/Sell Toggle
  document.getElementById('buyToggleBtn').addEventListener('click', () => toggleTradeAction('buy'));
  document.getElementById('sellToggleBtn').addEventListener('click', () => toggleTradeAction('sell'));

  // Order Type Change
  document.getElementById('orderType').addEventListener('change', handleOrderTypeChange);

  // Order Variant Change
  document.getElementById('orderVariant').addEventListener('change', handleOrderVariantChange);

  // Input changes
  document.getElementById('quantity').addEventListener('input', updateOrderSummary);
  document.getElementById('orderPrice').addEventListener('input', updateOrderSummary);
  document.getElementById('triggerPrice').addEventListener('input', updateOrderSummary);

  // Trading form
  document.getElementById('tradingForm').addEventListener('submit', placeOrder);

  // Watchlist button (placeholder)
  document.getElementById('addWatchlistBtn').addEventListener('click', () => {
    alert('Watchlist functionality coming soon!');
  });
}

// Initialization
async function initialize() {
  console.log('🚀 Initializing stock detail page...');

  // Check authentication
  if (!getAuthToken()) return;

  // Setup event listeners
  initializeEventListeners();

  // Initialize WebSocket first
  console.log('1️⃣ Initializing WebSocket...');
  initializeWebSocket();

  // Give WebSocket a moment to connect, then load stock details
  console.log('2️⃣ Loading stock details...');
  await loadStockDetails();
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
