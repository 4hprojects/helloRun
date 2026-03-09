function isSubmissionWindowOpen({ registration, event, now = new Date() }) {
  if (!registration || !event) return false;
  if (String(event.status || '').trim().toLowerCase() !== 'published') return false;

  const mode = String(registration.participationMode || '').trim().toLowerCase();

  if (mode === 'virtual') {
    const virtualStart = parseDateSafe(event.virtualWindow?.startAt);
    const virtualEnd = parseDateSafe(event.virtualWindow?.endAt);
    if (virtualStart || virtualEnd) {
      return isWithinRange(now, virtualStart, virtualEnd);
    }
    return isWithinRange(now, parseDateSafe(event.eventStartAt), parseDateSafe(event.eventEndAt));
  }

  if (mode === 'onsite') {
    const windows = Array.isArray(event.onsiteCheckinWindows) ? event.onsiteCheckinWindows : [];
    const hasSpecificWindow = windows.some((windowItem) => {
      const startAt = parseDateSafe(windowItem?.startAt);
      const endAt = parseDateSafe(windowItem?.endAt);
      if (!startAt && !endAt) return false;
      return isWithinRange(now, startAt, endAt);
    });
    if (windows.length > 0) {
      return hasSpecificWindow;
    }
    return isWithinRange(now, parseDateSafe(event.eventStartAt), parseDateSafe(event.eventEndAt));
  }

  return isWithinRange(now, parseDateSafe(event.eventStartAt), parseDateSafe(event.eventEndAt));
}

function isWithinRange(now, startAt, endAt) {
  if (!(startAt instanceof Date) && !(endAt instanceof Date)) return false;
  const nowMs = Number(now?.getTime?.() || Date.now());
  if (startAt instanceof Date && Number.isFinite(startAt.getTime()) && nowMs < startAt.getTime()) {
    return false;
  }
  if (endAt instanceof Date && Number.isFinite(endAt.getTime()) && nowMs > endAt.getTime()) {
    return false;
  }
  return true;
}

function parseDateSafe(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

module.exports = {
  isSubmissionWindowOpen
};
