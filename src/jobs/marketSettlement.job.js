const cron = require('node-cron');
const marketConfig = require('../config/market.config');
const { positionSettlement } = require('../services/v1/marketServices/positionServices');

/**
 * Market Settlement Scheduler
 * Handles all scheduled market operations
 */

/**
 * Schedule intraday auto square-off
 * Runs daily at configured time (default: 3:20 PM IST)
 */
const scheduleIntradaySquareOff = () => {
  const squareOffTime = marketConfig.autoSquareOff.intraday.time; // Format: 'HH:mm'
  const [hours, minutes] = squareOffTime.split(':').map(Number);

  // Cron format: minute hour * * *
  const cronExpression = `${minutes} ${hours} * * *`;

  console.log(`Scheduling intraday auto square-off at ${squareOffTime} (${cronExpression})`);

  const job = cron.schedule(
    cronExpression,
    async () => {
      try {
        console.log(`========== INTRADAY AUTO SQUARE-OFF STARTED at ${new Date().toLocaleString()} ==========`);
        const result = await positionSettlement.autoSquareOffIntradayPositions();
        console.log('Intraday auto square-off result:', result);
        console.log('========== INTRADAY AUTO SQUARE-OFF COMPLETED ==========');
      } catch (error) {
        console.error('Intraday auto square-off failed:', error.message);
      }
    },
    {
      scheduled: marketConfig.autoSquareOff.intraday.enabled,
      timezone: marketConfig.marketHours.timezone,
    },
  );

  return job;
};

/**
 * Schedule delivery position to holding conversion
 * Runs every hour to check for expired delivery positions
 */
const schedulePositionConversion = () => {
  // Run every hour at minute 0
  const cronExpression = '0 * * * *';

  console.log(`Scheduling position to holding conversion every hour (${cronExpression})`);

  const job = cron.schedule(
    cronExpression,
    async () => {
      try {
        console.log(`Position to holding conversion check at ${new Date().toLocaleString()}`);
        const result = await positionSettlement.convertExpiredDeliveryPositions();

        if (result.total > 0) {
          console.log('Position conversion result:', result);
        }
      } catch (error) {
        console.error('Position conversion failed:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: marketConfig.marketHours.timezone,
    },
  );

  return job;
};

/**
 * Schedule complete post-market settlement
 * Runs daily at configured square-off time + 5 minutes
 * This is a backup job that runs all settlement operations together
 */
const schedulePostMarketSettlement = () => {
  const squareOffTime = marketConfig.autoSquareOff.intraday.time;
  const [hours, minutes] = squareOffTime.split(':').map(Number);

  // Add 5 minutes to square-off time for post-market settlement
  const settlementMinutes = (minutes + 5) % 60;
  const settlementHours = minutes + 5 >= 60 ? hours + 1 : hours;

  const cronExpression = `${settlementMinutes} ${settlementHours} * * *`;

  console.log(
    `Scheduling post-market settlement at ${settlementHours}:${settlementMinutes.toString().padStart(2, '0')} (${cronExpression})`,
  );

  const job = cron.schedule(
    cronExpression,
    async () => {
      try {
        console.log(`========== POST-MARKET SETTLEMENT STARTED at ${new Date().toLocaleString()} ==========`);
        const result = await positionSettlement.runPostMarketSettlement();
        console.log('Post-market settlement result:', result);
        console.log('========== POST-MARKET SETTLEMENT COMPLETED ==========');
      } catch (error) {
        console.error('Post-market settlement failed:', error.message);
      }
    },
    {
      scheduled: true,
      timezone: marketConfig.marketHours.timezone,
    },
  );

  return job;
};

/**
 * Initialize all scheduled jobs
 */
const initializeScheduledJobs = () => {
  console.log('========== INITIALIZING SCHEDULED JOBS ==========');

  const jobs = {
    intradaySquareOff: null,
    positionConversion: null,
    postMarketSettlement: null,
  };

  // Schedule intraday auto square-off
  if (marketConfig.autoSquareOff.intraday.enabled) {
    jobs.intradaySquareOff = scheduleIntradaySquareOff();
    console.log('Intraday auto square-off scheduled');
  } else {
    console.log('Intraday auto square-off is disabled in config');
  }

  // Schedule position conversion
  jobs.positionConversion = schedulePositionConversion();
  console.log('Position to holding conversion scheduled');

  // Schedule post-market settlement (backup)
  jobs.postMarketSettlement = schedulePostMarketSettlement();
  console.log('Post-market settlement scheduled');

  console.log('========== ALL SCHEDULED JOBS INITIALIZED ==========');

  return jobs;
};

/**
 * Stop all scheduled jobs
 * @param {Object} jobs - Jobs object returned by initializeScheduledJobs
 */
const stopScheduledJobs = (jobs) => {
  console.log('Stopping all scheduled jobs...');

  if (jobs.intradaySquareOff) {
    jobs.intradaySquareOff.stop();
  }
  if (jobs.positionConversion) {
    jobs.positionConversion.stop();
  }
  if (jobs.postMarketSettlement) {
    jobs.postMarketSettlement.stop();
  }

  console.log('All scheduled jobs stopped');
};

module.exports = {
  initializeScheduledJobs,
  stopScheduledJobs,
  scheduleIntradaySquareOff,
  schedulePositionConversion,
  schedulePostMarketSettlement,
};
