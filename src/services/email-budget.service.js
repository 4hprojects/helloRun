const DailyEmailUsage = require('../models/DailyEmailUsage');

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function getDailyEmailUsage({ provider = 'resend', date = new Date(), totalLimit = 100 } = {}) {
  const dateKey = getDateKey(date);
  return DailyEmailUsage.findOneAndUpdate(
    { dateKey, provider },
    {
      $setOnInsert: {
        dateKey,
        provider,
        totalLimit
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getEmailBudgetSnapshot(settings = {}) {
  const provider = settings.provider || 'resend';
  const usage = await getDailyEmailUsage({
    provider,
    totalLimit: Number(settings.dailyEmailLimit || 100)
  });
  const dailyLimit = Number(settings.dailyEmailLimit || usage.totalLimit || 100);
  const sentCount = Number(usage.sentCount || 0);
  return {
    usage,
    provider,
    dailyLimit,
    sentCount,
    remaining: Math.max(0, dailyLimit - sentCount),
    softStopThreshold: Number(settings.softStopThreshold || dailyLimit),
    hardStopThreshold: Number(settings.hardStopThreshold || dailyLimit),
    reservedCriticalEmailCount: Number(settings.reservedCriticalEmailCount || 0)
  };
}

async function decideEmailSend({ settings, eventSetting } = {}) {
  const priority = eventSetting?.priority || 'low';
  const isCritical = priority === 'critical' || eventSetting?.required || eventSetting?.locked;

  if (!eventSetting?.emailEnabled && !isCritical) {
    return { allowed: false, status: 'skipped', reason: 'Email is disabled for this event.' };
  }

  if (settings?.emailMaintenanceMode && !isCritical) {
    return { allowed: false, status: 'suppressed', reason: 'Email maintenance mode is enabled.' };
  }

  if (settings?.emailSystemEnabled === false && !isCritical) {
    return { allowed: false, status: 'suppressed', reason: 'Email system is disabled.' };
  }

  const snapshot = await getEmailBudgetSnapshot(settings || {});
  if (isCritical) {
    return { allowed: true, reason: 'Critical email bypasses budget stop rules.', snapshot };
  }

  if (snapshot.sentCount >= snapshot.hardStopThreshold || snapshot.sentCount >= snapshot.dailyLimit) {
    return { allowed: false, status: 'skipped', reason: 'Daily hard stop has been reached.', snapshot };
  }

  if (snapshot.remaining <= snapshot.reservedCriticalEmailCount) {
    return { allowed: false, status: 'skipped', reason: 'Remaining quota is reserved for critical email.', snapshot };
  }

  if (snapshot.sentCount >= snapshot.softStopThreshold && ['medium', 'low', 'info'].includes(priority)) {
    return { allowed: false, status: 'skipped', reason: 'Soft stop reached for non-high-priority email.', snapshot };
  }

  return { allowed: true, reason: 'Email budget allows send.', snapshot };
}

async function incrementSentEmail({ settings, priority = 'low' } = {}) {
  const provider = settings?.provider || 'resend';
  const dateKey = getDateKey();
  const fieldByPriority = {
    critical: 'criticalSentCount',
    high: 'highSentCount',
    medium: 'mediumSentCount',
    low: 'lowSentCount',
    info: 'infoSentCount'
  };
  const inc = {
    sentCount: 1
  };
  inc[fieldByPriority[priority] || 'lowSentCount'] = 1;

  return DailyEmailUsage.findOneAndUpdate(
    { dateKey, provider },
    {
      $setOnInsert: {
        dateKey,
        provider,
        totalLimit: Number(settings?.dailyEmailLimit || 100)
      },
      $inc: inc
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function incrementFailedEmail({ settings } = {}) {
  const provider = settings?.provider || 'resend';
  const dateKey = getDateKey();
  return DailyEmailUsage.findOneAndUpdate(
    { dateKey, provider },
    {
      $setOnInsert: {
        dateKey,
        provider,
        totalLimit: Number(settings?.dailyEmailLimit || 100)
      },
      $inc: { failedCount: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function incrementSkippedEmail({ settings } = {}) {
  const provider = settings?.provider || 'resend';
  const dateKey = getDateKey();
  return DailyEmailUsage.findOneAndUpdate(
    { dateKey, provider },
    {
      $setOnInsert: {
        dateKey,
        provider,
        totalLimit: Number(settings?.dailyEmailLimit || 100)
      },
      $inc: { skippedCount: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  getDateKey,
  getDailyEmailUsage,
  getEmailBudgetSnapshot,
  decideEmailSend,
  incrementSentEmail,
  incrementFailedEmail,
  incrementSkippedEmail
};
