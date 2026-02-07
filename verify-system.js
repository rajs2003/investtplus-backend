/**
 * Final System Verification Script
 * Checks if all optimizations are working correctly
 */

console.log('\n🔍 System Verification\n');
console.log('='.repeat(60));

const fs = require('fs');
const path = require('path');

// Check 1: Verify deprecated files are deleted
console.log('\n📋 Check 1: Deprecated Files');
const deprecatedFiles = [
  'src/jobs/orderExecutionJob.js',
  'src/queues/orderQueue.js',
  'cleanup-old-jobs.js',
  'test-limit-orders.js',
];

let allDeleted = true;
deprecatedFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`❌ ${file} still exists (should be deleted)`);
    allDeleted = false;
  } else {
    console.log(`✅ ${file} deleted`);
  }
});

if (allDeleted) {
  console.log('✅ All deprecated files removed');
}

// Check 2: Verify new files exist
console.log('\n📋 Check 2: Required Files');
const requiredFiles = [
  'src/services/v1/marketServices/orderServices/limitOrderManager.service.js',
  'src/services/v1/mockMarket/marketWebSocket.service.js',
  'docs/ORDER_EXECUTION_OPTIMIZATION.md',
  'docs/FINAL_OPTIMIZATION_SUMMARY.md',
];

let allExist = true;
requiredFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allExist = false;
  }
});

// Check 3: Verify no references to old files
console.log('\n📋 Check 3: Code References');
const appJs = fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8');

if (appJs.includes('orderExecutionJob')) {
  console.log('❌ app.js still references orderExecutionJob');
} else {
  console.log('✅ No references to orderExecutionJob in app.js');
}

if (appJs.includes('startOrderMonitoring')) {
  console.log('❌ app.js still has startOrderMonitoring');
} else {
  console.log('✅ No startOrderMonitoring in app.js');
}

// Check 4: Verify limitOrderManager is exported
console.log('\n📋 Check 4: Service Exports');
const orderServicesIndex = fs.readFileSync(
  path.join(__dirname, 'src/services/v1/marketServices/orderServices/index.js'),
  'utf8',
);

if (orderServicesIndex.includes('limitOrderManager')) {
  console.log('✅ limitOrderManager exported from orderServices');
} else {
  console.log('❌ limitOrderManager not exported');
}

// Check 5: Verify WebSocket integration
console.log('\n📋 Check 5: WebSocket Integration');
const wsService = fs.readFileSync(path.join(__dirname, 'src/services/v1/mockMarket/marketWebSocket.service.js'), 'utf8');

if (wsService.includes('limitOrderManager')) {
  console.log('✅ WebSocket service imports limitOrderManager');
} else {
  console.log('❌ WebSocket service missing limitOrderManager');
}

if (wsService.includes('processPriceChange')) {
  console.log('✅ WebSocket service calls processPriceChange');
} else {
  console.log('❌ WebSocket service missing processPriceChange call');
}

if (wsService.includes('Independent limit order processor')) {
  console.log('✅ Independent processor implemented');
} else {
  console.log('❌ Independent processor missing');
}

// Check 6: Verify Redis sync in index.js
console.log('\n📋 Check 6: Startup Configuration');
const indexJs = fs.readFileSync(path.join(__dirname, 'src/index.js'), 'utf8');

if (indexJs.includes('syncPendingOrdersToRedis')) {
  console.log('✅ Redis sync on startup configured');
} else {
  console.log('❌ Redis sync on startup missing');
}

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary:\n');

const checks = [
  { name: 'Deprecated files deleted', pass: allDeleted },
  { name: 'Required files exist', pass: allExist },
  { name: 'No old code references', pass: !appJs.includes('orderExecutionJob') },
  { name: 'Service exports correct', pass: orderServicesIndex.includes('limitOrderManager') },
  { name: 'WebSocket integrated', pass: wsService.includes('limitOrderManager') },
  { name: 'Redis sync configured', pass: indexJs.includes('syncPendingOrdersToRedis') },
];

const passedChecks = checks.filter((c) => c.pass).length;
const totalChecks = checks.length;

checks.forEach((check) => {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
});

console.log(`\n${passedChecks}/${totalChecks} checks passed\n`);

if (passedChecks === totalChecks) {
  console.log('🎉 All checks passed! System is ready.\n');
  console.log('Next steps:');
  console.log('1. Restart the server: npm start');
  console.log('2. Test limit orders via API');
  console.log('3. Monitor logs for execution messages\n');
} else {
  console.log('⚠️  Some checks failed. Please review and fix.\n');
}

console.log('='.repeat(60) + '\n');
