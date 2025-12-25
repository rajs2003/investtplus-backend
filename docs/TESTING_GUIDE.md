# Quick Order System Test (Manual)

# You need to:
# 1. Login first to get fresh token
# 2. Copy the token
# 3. Run these tests

Write-Host "`n╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ORDER SYSTEM MANUAL TESTING GUIDE   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "STEP 1: Login to get fresh token`n" -ForegroundColor Yellow
Write-Host 'PowerShell Command:' -ForegroundColor Green
Write-Host '$loginData = @{phone="PHONE_NUMBER";password="PASSWORD"} | ConvertTo-Json'
Write-Host '$response = Invoke-RestMethod -Uri "http://localhost:3002/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginData'
Write-Host '$token = $response.tokens.access.token'
Write-Host 'Write-Host "Token: $token"'
Write-Host "`n"

Write-Host "STEP 2: Check Wallet Balance`n" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/wallet" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "STEP 3: Place Market BUY Order (RELIANCE - 10 shares)`n" -ForegroundColor Yellow
Write-Host '$orderData = @{symbol="RELIANCE";exchange="NSE";orderType="intraday";orderVariant="market";transactionType="buy";quantity=10} | ConvertTo-Json'
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/place" -Method POST -Headers @{Authorization="Bearer $token";"Content-Type"="application/json"} -Body $orderData'
Write-Host "`n"

Write-Host "STEP 4: View All Orders`n" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "STEP 5: Place Limit Order (TCS - 5 shares @ 3800)`n" -ForegroundColor Yellow
Write-Host '$limitOrder = @{symbol="TCS";exchange="NSE";orderType="delivery";orderVariant="limit";transactionType="buy";quantity=5;price=3800} | ConvertTo-Json'
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/place" -Method POST -Headers @{Authorization="Bearer $token";"Content-Type"="application/json"} -Body $limitOrder'
Write-Host "`n"

Write-Host "STEP 6: View Pending Orders`n" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/pending" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "STEP 7: Cancel Order (use orderId from Step 5)`n" -ForegroundColor Yellow
Write-Host '$orderId = "ORDER_ID_HERE"'
Write-Host '$cancelData = @{reason="Testing"} | ConvertTo-Json'
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/$orderId/cancel" -Method POST -Headers @{Authorization="Bearer $token";"Content-Type"="application/json"} -Body $cancelData'
Write-Host "`n"

Write-Host "STEP 8: View Transaction History`n" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/wallet/transactions" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "STEP 9: Get Order Details (use specific orderId)`n" -ForegroundColor Yellow
Write-Host '$orderId = "ORDER_ID_HERE"'
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/$orderId" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "STEP 10: View Order History`n" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3002/v1/orders/history" -Method GET -Headers @{Authorization="Bearer $token"}'
Write-Host "`n"

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Market Order (RELIANCE x10):" -ForegroundColor Yellow
Write-Host "  - Order Value: ~₹24,505"
Write-Host "  - Charges: ~₹20 (includes brokerage, STT, GST, etc.)"
Write-Host "  - Net Debit: ~₹24,525"
Write-Host "  - Status: executed (immediate)"
Write-Host "  - Wallet: Balance reduced by net amount`n"

Write-Host "Limit Order (TCS x5 @ 3800):" -ForegroundColor Yellow
Write-Host "  - Order Value: ₹19,000"
Write-Host "  - Charges: ~₹15"
Write-Host "  - Net Amount: ~₹19,015"
Write-Host "  - Status: pending"
Write-Host "  - Wallet: Funds locked (lockedAmount increases)`n"

Write-Host "Cancel Limit Order:" -ForegroundColor Yellow
Write-Host "  - Status changes to: cancelled"
Write-Host "  - Locked funds released back to availableBalance"
Write-Host "  - Refund transaction created`n"

Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "NOTE: Market timing validation is DISABLED for testing." -ForegroundColor Magenta
Write-Host "      Orders can be placed anytime (24/7).`n" -ForegroundColor Magenta

Write-Host "To get valid phone numbers from database, run:" -ForegroundColor Cyan
Write-Host 'mongo node-boilerplate --eval "db.users.find({}, {name:1, phoneNumber:1}).limit(5)"'
Write-Host "`n"
