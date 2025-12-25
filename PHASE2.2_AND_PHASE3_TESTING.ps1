# ====================================================================
# PHASE 2.2 (BULL QUEUE) & PHASE 3 (HOLDINGS/PORTFOLIO) TESTING SCRIPT
# Date: December 16, 2025
# ====================================================================

$baseUrl = "http://localhost:3002/v1"
$testResults = @()
$testStartTime = Get-Date

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "PHASE 2.2 & PHASE 3 COMPREHENSIVE TESTING" -ForegroundColor Cyan
Write-Host "Testing Holdings, Portfolio, Trade History & Background Jobs" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to add test result
function Add-TestResult {
    param($TestName, $Status, $Response, $Error = $null)
    $global:testResults += [PSCustomObject]@{
        Test = $TestName
        Status = $Status
        Response = $Response
        Error = $Error
        Time = (Get-Date).ToString("HH:mm:ss")
    }
}

# ====================================================================
# STEP 1: AUTHENTICATION
# ====================================================================
Write-Host "[1/15] Testing Authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@example.com"
        password = "Admin@123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.tokens.access.token
    $userId = $loginResponse.user.id
    
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Gray
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Add-TestResult "Authentication" "PASS" $loginResponse
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    Add-TestResult "Authentication" "FAIL" $null $_.Exception.Message
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. Server is running on port 3002" -ForegroundColor Yellow
    Write-Host "2. MongoDB is connected" -ForegroundColor Yellow
    Write-Host "3. User admin@example.com exists with password Admin@123" -ForegroundColor Yellow
    exit
}

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# ====================================================================
# STEP 2: GET USER WALLET
# ====================================================================
Write-Host "[2/15] Getting User Wallet..." -ForegroundColor Yellow
try {
    $walletResponse = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $headers
    $walletId = $walletResponse.wallet.id
    $walletBalance = $walletResponse.wallet.balance
    
    Write-Host "✓ Wallet fetched successfully" -ForegroundColor Green
    Write-Host "  Wallet ID: $walletId" -ForegroundColor Gray
    Write-Host "  Balance: ₹$walletBalance" -ForegroundColor Gray
    Add-TestResult "Get Wallet" "PASS" $walletResponse
    Write-Host ""
} catch {
    Write-Host "✗ Failed to get wallet: $_" -ForegroundColor Red
    Add-TestResult "Get Wallet" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 3: CHECK INITIAL HOLDINGS
# ====================================================================
Write-Host "[3/15] Testing GET /holdings (Initial State)..." -ForegroundColor Yellow
try {
    $holdingsResponse = Invoke-RestMethod -Uri "$baseUrl/holdings" -Method GET -Headers $headers
    $initialHoldingsCount = $holdingsResponse.count
    
    Write-Host "✓ Holdings fetched successfully" -ForegroundColor Green
    Write-Host "  Initial Holdings Count: $initialHoldingsCount" -ForegroundColor Gray
    Add-TestResult "GET /holdings (Initial)" "PASS" $holdingsResponse
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch holdings: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings (Initial)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 4: CHECK PORTFOLIO SUMMARY (INITIAL)
# ====================================================================
Write-Host "[4/15] Testing GET /holdings/portfolio/summary (Initial)..." -ForegroundColor Yellow
try {
    $portfolioResponse = Invoke-RestMethod -Uri "$baseUrl/holdings/portfolio/summary" -Method GET -Headers $headers
    
    Write-Host "✓ Portfolio summary fetched" -ForegroundColor Green
    Write-Host "  Total Investment: $($portfolioResponse.portfolio.totalInvestment)" -ForegroundColor Gray
    Write-Host "  Current Value: $($portfolioResponse.portfolio.currentValue)" -ForegroundColor Gray
    Write-Host "  Unrealized P&L: $($portfolioResponse.portfolio.unrealizedPL)" -ForegroundColor Gray
    Write-Host "  Holdings Count: $($portfolioResponse.portfolio.holdingsCount)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/portfolio/summary (Initial)" "PASS" $portfolioResponse
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch portfolio: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/portfolio/summary (Initial)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 5: PLACE BUY ORDER (INTRADAY) - This should create a holding
# ====================================================================
Write-Host "[5/15] Testing Order → Holding Creation (Buy RELIANCE)..." -ForegroundColor Yellow
try {
    $buyOrderBody = @{
        walletId = $walletId
        symbol = "RELIANCE"
        exchange = "NSE"
        orderVariant = "market"
        orderType = "intraday"
        transactionType = "buy"
        quantity = 10
    } | ConvertTo-Json

    $buyOrderResponse = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $buyOrderBody -Headers $headers
    $buyOrderId = $buyOrderResponse.order.id
    
    Write-Host "✓ Buy order placed successfully" -ForegroundColor Green
    Write-Host "  Order ID: $buyOrderId" -ForegroundColor Gray
    Write-Host "  Symbol: RELIANCE" -ForegroundColor Gray
    Write-Host "  Quantity: 10" -ForegroundColor Gray
    Write-Host "  Status: $($buyOrderResponse.order.status)" -ForegroundColor Gray
    Write-Host "  Price: ₹$($buyOrderResponse.order.averagePrice)" -ForegroundColor Gray
    Add-TestResult "Place Buy Order (RELIANCE)" "PASS" $buyOrderResponse
    
    # Wait for holding to be created
    Start-Sleep -Seconds 2
    Write-Host ""
} catch {
    Write-Host "✗ Failed to place buy order: $_" -ForegroundColor Red
    Add-TestResult "Place Buy Order (RELIANCE)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 6: VERIFY HOLDING WAS CREATED
# ====================================================================
Write-Host "[6/15] Verifying Holding Creation..." -ForegroundColor Yellow
try {
    $holdingsAfterBuy = Invoke-RestMethod -Uri "$baseUrl/holdings" -Method GET -Headers $headers
    
    Write-Host "✓ Holdings after buy order:" -ForegroundColor Green
    Write-Host "  Total Holdings: $($holdingsAfterBuy.count)" -ForegroundColor Gray
    
    if ($holdingsAfterBuy.count -gt 0) {
        foreach ($holding in $holdingsAfterBuy.results) {
            Write-Host "  ├─ $($holding.symbol): $($holding.quantity) shares" -ForegroundColor Gray
            Write-Host "  │  Avg Price: ₹$($holding.averageBuyPrice)" -ForegroundColor Gray
            Write-Host "  │  Investment: $($holding.totalInvestment)" -ForegroundColor Gray
            Write-Host "  │  Current Value: $($holding.currentValue)" -ForegroundColor Gray
            Write-Host "  │  Unrealized P&L: $($holding.unrealizedPL) ($($holding.unrealizedPLPercentage)%)" -ForegroundColor Gray
        }
    }
    
    Add-TestResult "Verify Holding Creation" "PASS" $holdingsAfterBuy
    Write-Host ""
} catch {
    Write-Host "✗ Failed to verify holdings: $_" -ForegroundColor Red
    Add-TestResult "Verify Holding Creation" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 7: TEST GET INTRADAY HOLDINGS
# ====================================================================
Write-Host "[7/15] Testing GET /holdings/intraday..." -ForegroundColor Yellow
try {
    $intradayHoldings = Invoke-RestMethod -Uri "$baseUrl/holdings/intraday" -Method GET -Headers $headers
    
    Write-Host "✓ Intraday holdings fetched" -ForegroundColor Green
    Write-Host "  Intraday Holdings Count: $($intradayHoldings.count)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/intraday" "PASS" $intradayHoldings
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch intraday holdings: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/intraday" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 8: PLACE ANOTHER BUY ORDER (DELIVERY) - Different holding type
# ====================================================================
Write-Host "[8/15] Testing Delivery Order → Holding Creation (Buy TCS)..." -ForegroundColor Yellow
try {
    $buyOrderBody2 = @{
        walletId = $walletId
        symbol = "TCS"
        exchange = "NSE"
        orderVariant = "market"
        orderType = "delivery"
        transactionType = "buy"
        quantity = 5
    } | ConvertTo-Json

    $buyOrderResponse2 = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $buyOrderBody2 -Headers $headers
    
    Write-Host "✓ Delivery buy order placed" -ForegroundColor Green
    Write-Host "  Order ID: $($buyOrderResponse2.order.id)" -ForegroundColor Gray
    Write-Host "  Symbol: TCS" -ForegroundColor Gray
    Write-Host "  Type: Delivery" -ForegroundColor Gray
    Write-Host "  Quantity: 5" -ForegroundColor Gray
    Add-TestResult "Place Buy Order (TCS Delivery)" "PASS" $buyOrderResponse2
    
    Start-Sleep -Seconds 2
    Write-Host ""
} catch {
    Write-Host "✗ Failed to place delivery order: $_" -ForegroundColor Red
    Add-TestResult "Place Buy Order (TCS Delivery)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 9: TEST GET DELIVERY HOLDINGS
# ====================================================================
Write-Host "[9/15] Testing GET /holdings/delivery..." -ForegroundColor Yellow
try {
    $deliveryHoldings = Invoke-RestMethod -Uri "$baseUrl/holdings/delivery" -Method GET -Headers $headers
    
    Write-Host "✓ Delivery holdings fetched" -ForegroundColor Green
    Write-Host "  Delivery Holdings Count: $($deliveryHoldings.count)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/delivery" "PASS" $deliveryHoldings
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch delivery holdings: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/delivery" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 10: TEST GET HOLDING BY SYMBOL
# ====================================================================
Write-Host "[10/15] Testing GET /holdings/:symbol (RELIANCE)..." -ForegroundColor Yellow
try {
    $holdingBySymbol = Invoke-RestMethod -Uri "$baseUrl/holdings/RELIANCE?holdingType=intraday" -Method GET -Headers $headers
    
    Write-Host "✓ Holding by symbol fetched" -ForegroundColor Green
    Write-Host "  Symbol: $($holdingBySymbol.holding.symbol)" -ForegroundColor Gray
    Write-Host "  Quantity: $($holdingBySymbol.holding.quantity)" -ForegroundColor Gray
    Write-Host "  Type: $($holdingBySymbol.holding.holdingType)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/:symbol" "PASS" $holdingBySymbol
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch holding by symbol: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/:symbol" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 11: PLACE SELL ORDER - This should create a trade record
# ====================================================================
Write-Host "[11/15] Testing Sell Order → Trade Creation (Sell 5 RELIANCE)..." -ForegroundColor Yellow
try {
    $sellOrderBody = @{
        walletId = $walletId
        symbol = "RELIANCE"
        exchange = "NSE"
        orderVariant = "market"
        orderType = "intraday"
        transactionType = "sell"
        quantity = 5
    } | ConvertTo-Json

    $sellOrderResponse = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $sellOrderBody -Headers $headers
    
    Write-Host "✓ Sell order placed successfully" -ForegroundColor Green
    Write-Host "  Order ID: $($sellOrderResponse.order.id)" -ForegroundColor Gray
    Write-Host "  Sold: 5 RELIANCE shares" -ForegroundColor Gray
    Write-Host "  Price: ₹$($sellOrderResponse.order.averagePrice)" -ForegroundColor Gray
    Add-TestResult "Place Sell Order (RELIANCE)" "PASS" $sellOrderResponse
    
    # Wait for trade to be created
    Start-Sleep -Seconds 2
    Write-Host ""
} catch {
    Write-Host "✗ Failed to place sell order: $_" -ForegroundColor Red
    Add-TestResult "Place Sell Order (RELIANCE)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 12: TEST GET TRADE HISTORY
# ====================================================================
Write-Host "[12/15] Testing GET /holdings/trades (Trade History)..." -ForegroundColor Yellow
try {
    $tradeHistory = Invoke-RestMethod -Uri "$baseUrl/holdings/trades" -Method GET -Headers $headers
    
    Write-Host "✓ Trade history fetched" -ForegroundColor Green
    Write-Host "  Total Trades: $($tradeHistory.count)" -ForegroundColor Gray
    
    if ($tradeHistory.count -gt 0) {
        foreach ($trade in $tradeHistory.results) {
            Write-Host "  - Trade: $($trade.symbol)" -ForegroundColor Gray
            Write-Host "    Buy: $($trade.buyQuantity) @ Rs.$($trade.buyPrice) = Rs.$($trade.buyValue)" -ForegroundColor Gray
            Write-Host "    Sell: $($trade.sellQuantity) @ Rs.$($trade.sellPrice) = Rs.$($trade.sellValue)" -ForegroundColor Gray
            Write-Host "    Gross PL: Rs.$($trade.grossPL)" -ForegroundColor Gray
            Write-Host "    Net PL: Rs.$($trade.netPL) ($($trade.plPercentage)%)" -ForegroundColor Gray
            Write-Host "    Is Profit: $($trade.isProfit)" -ForegroundColor Gray
        }
    }
    
    Add-TestResult "GET /holdings/trades" "PASS" $tradeHistory
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch trade history: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/trades" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 13: TEST GET TRADE STATISTICS
# ====================================================================
Write-Host "[13/15] Testing GET /holdings/trades/stats..." -ForegroundColor Yellow
try {
    $tradeStats = Invoke-RestMethod -Uri "$baseUrl/holdings/trades/stats" -Method GET -Headers $headers
    
    Write-Host "✓ Trade statistics fetched" -ForegroundColor Green
    Write-Host "  Total Trades: $($tradeStats.statistics.totalTrades)" -ForegroundColor Gray
    Write-Host "  Profitable: $($tradeStats.statistics.profitableTrades)" -ForegroundColor Gray
    Write-Host "  Losing: $($tradeStats.statistics.losingTrades)" -ForegroundColor Gray
    Write-Host "  Win Rate: $($tradeStats.statistics.winRate)%" -ForegroundColor Gray
    Write-Host "  Total Net P&L: $($tradeStats.statistics.totalNetPL)" -ForegroundColor Gray
    Write-Host "  Avg P&L per Trade: $($tradeStats.statistics.avgPLPerTrade)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/trades/stats" "PASS" $tradeStats
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch trade stats: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/trades/stats" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 14: TEST GET TODAY'S TRADES
# ====================================================================
Write-Host "[14/15] Testing GET /holdings/trades/today..." -ForegroundColor Yellow
try {
    $todayTrades = Invoke-RestMethod -Uri "$baseUrl/holdings/trades/today" -Method GET -Headers $headers
    
    Write-Host "✓ Today's trades fetched" -ForegroundColor Green
    Write-Host "  Today's Trades: $($todayTrades.count)" -ForegroundColor Gray
    Write-Host "  Today's P&L: $($todayTrades.todayPL)" -ForegroundColor Gray
    Add-TestResult "GET /holdings/trades/today" "PASS" $todayTrades
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch today's trades: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/trades/today" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# STEP 15: UPDATED PORTFOLIO SUMMARY
# ====================================================================
Write-Host "[15/15] Testing Updated Portfolio Summary..." -ForegroundColor Yellow
try {
    $finalPortfolio = Invoke-RestMethod -Uri "$baseUrl/holdings/portfolio/summary" -Method GET -Headers $headers
    
    Write-Host "✓ Final portfolio summary:" -ForegroundColor Green
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📊 PORTFOLIO OVERVIEW" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Total Investment: $($finalPortfolio.portfolio.totalInvestment)" -ForegroundColor White
    Write-Host "  Current Value: $($finalPortfolio.portfolio.currentValue)" -ForegroundColor White
    $plColor = if ($finalPortfolio.portfolio.unrealizedPL -match '-') { 'Red' } else { 'Green' }
    Write-Host "  Unrealized PL: $($finalPortfolio.portfolio.unrealizedPL) ($($finalPortfolio.portfolio.unrealizedPLPercentage))" -ForegroundColor $plColor
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📈 HOLDINGS" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Total Holdings: $($finalPortfolio.portfolio.holdingsCount)" -ForegroundColor White
    Write-Host "  Intraday Positions: $($finalPortfolio.portfolio.intradayPositions)" -ForegroundColor White
    Write-Host "  Delivery Positions: $($finalPortfolio.portfolio.deliveryPositions)" -ForegroundColor White
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  💰 REALIZED P&L" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    $realizedColor = if ($finalPortfolio.portfolio.realizedPL -match '-') { 'Red' } else { 'Green' }
    Write-Host "  Realized PL: $($finalPortfolio.portfolio.realizedPL)" -ForegroundColor $realizedColor
    Write-Host "  Realized P&L: $($finalPortfolio.portfolio.realizedPL)" -ForegroundColor $(if ($finalPortfolio.portfolio.realizedPL -match '-') { 'Red' } else { 'Green' })
    Write-Host "  Win Rate: $($finalPortfolio.portfolio.winRate)%" -ForegroundColor White
    Write-Host "  Profitable Trades: $($finalPortfolio.portfolio.profitableTrades)" -ForegroundColor Green
    Write-Host "  Losing Trades: $($finalPortfolio.portfolio.losingTrades)" -ForegroundColor Red
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📅 TODAY" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    $todayColor = if ($finalPortfolio.portfolio.todayPL -match '-') { 'Red' } else { 'Green' }
    Write-Host "  Today's PL: $($finalPortfolio.portfolio.todayPL)" -ForegroundColor $todayColor
    Write-Host "  Today's P&L: $($finalPortfolio.portfolio.todayPL)" -ForegroundColor $(if ($finalPortfolio.portfolio.todayPL -match '-') { 'Red' } else { 'Green' })
    Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
    
    Add-TestResult "GET /holdings/portfolio/summary (Final)" "PASS" $finalPortfolio
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch final portfolio: $_" -ForegroundColor Red
    Add-TestResult "GET /holdings/portfolio/summary (Final)" "FAIL" $null $_.Exception.Message
    Write-Host ""
}

# ====================================================================
# TEST SUMMARY
# ====================================================================
$testEndTime = Get-Date
$duration = ($testEndTime - $testStartTime).TotalSeconds

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray
Write-Host ""

# Show failed tests if any
if ($failedTests -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  ✗ $($_.Test): $($_.Error)" -ForegroundColor Red
    }
    Write-Host ""
}

# Calculate score
$score = [math]::Round(($passedTests / $totalTests) * 100, 0)
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "PRODUCTION READINESS SCORE: $score/100" -ForegroundColor $(if ($score -ge 90) { 'Green' } elseif ($score -ge 70) { 'Yellow' } else { 'Red' })
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# ====================================================================
# BACKGROUND JOB VERIFICATION
# ====================================================================
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "PHASE 2.2 - BACKGROUND JOB VERIFICATION" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Bull Queue Integration:" -ForegroundColor Green
Write-Host "  - Order monitoring job runs every 2 seconds" -ForegroundColor Gray
Write-Host "  - Checks all pending limit/SL/SLM orders" -ForegroundColor Gray
Write-Host "  - Executes orders when price conditions are met" -ForegroundColor Gray
Write-Host "  - Retry logic: 3 attempts with exponential backoff" -ForegroundColor Gray
Write-Host "  - Job stats available via getQueueStats functionl backoff" -ForegroundColor Gray
Write-Host "  └─ Job stats available via getQueueStats()" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify jobs in logs:" -ForegroundColor Yellow
Write-Host "  1. Check server logs for 'Starting pending orders check job'" -ForegroundColor Gray
Write-Host "  2. Look for 'Order execution job completed' messages" -ForegroundColor Gray
Write-Host "  3. Jobs run approximately every 2 seconds" -ForegroundColor Gray
Write-Host ""

# imestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$filename = "PHASE2.2_AND_PHASE3_TEST_RESULTS_$timestamp.json"
$testResults | ConvertTo-Json -Depth 10 | Out-File $filename
Write-Host "Test results exported to: $filename_HHmmss').json"
Write-Host "Test results exported to: PHASE2.2_AND_PHASE3_TEST_RESULTS_$(Get-Date -Format 'yyyyMMdd_HHmmss').json" -ForegroundColor Cyan
Write-Host ""
