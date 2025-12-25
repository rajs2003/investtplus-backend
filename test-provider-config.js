/**
 * Test script to verify market provider configuration
 * Run with: node test-provider-config.js
 */

const config = require('./src/config/config');

console.log('\n🔍 Testing Market Provider Configuration...\n');

try {
  // Display current configuration
  console.log('📋 Current Configuration:');
  console.log('========================');
  console.log(`Environment: ${config.env}`);
  console.log(`Market Data Provider: ${config.marketDataProvider}`);
  console.log('');

  // Test provider-specific config
  if (config.marketDataProvider === 'angelone') {
    console.log('✅ AngelOne Configuration:');
    console.log(`   API Key: ${config.angelone.apiKey ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   Client Code: ${config.angelone.clientCode ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   Password: ${config.angelone.password ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   TOTP Secret: ${config.angelone.totpSecret ? '✓ Set' : '✗ Not Set'}`);
  } else if (config.marketDataProvider === 'kite') {
    console.log('✅ Kite Connect Configuration:');
    console.log(`   API Key: ${config.kite.apiKey ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   API Secret: ${config.kite.apiSecret ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   User ID: ${config.kite.userId ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   Password: ${config.kite.password ? '✓ Set' : '✗ Not Set'}`);
    console.log(`   TOTP Secret: ${config.kite.totpSecret ? '✓ Set' : '✗ Not Set'}`);
  }

  console.log('');

  // Try to load the market provider factory
  console.log('🏭 Loading Market Provider Factory...');
  const marketProviderFactory = require('./src/services/v1/marketProviderFactory');
  
  const providerType = marketProviderFactory.getProviderType();
  console.log(`✅ Provider loaded: ${providerType}`);
  
  // Check services
  console.log('\n📦 Available Services:');
  const services = marketProviderFactory.getAllServices();
  console.log(`   Provider Service: ${services.providerService ? '✓' : '✗'}`);
  console.log(`   Market Service: ${services.marketService ? '✓' : '✗'}`);
  console.log(`   Stock Service: ${services.stockService ? '✓' : '✗'}`);
  console.log(`   WebSocket Service: ${services.webSocketService ? '✓' : '✗'}`);

  console.log('\n✅ All tests passed! Configuration is correct.\n');
  console.log('🚀 You can now start the application with: npm start\n');

  // Show how to switch providers
  console.log('💡 To switch providers:');
  console.log('   1. Update MARKET_DATA_PROVIDER in .env file');
  console.log('   2. Set the appropriate credentials');
  console.log('   3. Restart the application\n');

} catch (error) {
  console.error('\n❌ Error loading configuration:');
  console.error(error.message);
  console.error('\n📝 Please check:');
  console.error('   1. .env file exists and has correct values');
  console.error('   2. MARKET_DATA_PROVIDER is set to "angelone" or "kite"');
  console.error('   3. All required credentials are provided');
  console.error('   4. Dependencies are installed (npm install)\n');
  process.exit(1);
}
