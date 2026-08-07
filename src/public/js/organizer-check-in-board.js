// Live check-in board. The first paint is server-rendered; this only refreshes it.
// A failed poll leaves the last known figures on screen and says they are stale,
// which is more useful at a start line than blanking the board.

(function () {
  const root = document.querySelector('[data-checkin-board]');
  if (!root) return;

  const eventId = root.dataset.eventId;
  const POLL_MS = 10000;

  const el = {
    checkedIn: root.querySelector('[data-board-checked-in]'),
    remaining: root.querySelector('[data-board-remaining]'),
    total: root.querySelector('[data-board-total]'),
    percent: root.querySelector('[data-board-percent]'),
    rate: root.querySelector('[data-board-rate]'),
    eta: root.querySelector('[data-board-eta]'),
    updated: root.querySelector('[data-board-updated]'),
    activity: root.querySelector('[data-board-activity]')
  };

  // Nothing to refresh when the server could not render a board at all.
  if (!el.checkedIn) return;

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function formatTime(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleTimeString();
  }

  function renderActivity(entries) {
    if (!el.activity || !Array.isArray(entries)) return;
    el.activity.replaceChildren();

    entries.forEach(function (entry) {
      const name =
        [entry.participant_first_name, entry.participant_last_name].filter(Boolean).join(' ') ||
        'Unnamed participant';

      const item = document.createElement('li');
      item.className = 'checkin-row';

      const identity = document.createElement('div');
      identity.className = 'checkin-row-identity';

      const nameLine = document.createElement('p');
      nameLine.className = 'checkin-row-name';
      if (entry.bib_number) {
        const bib = document.createElement('span');
        bib.className = 'checkin-bib';
        bib.textContent = `#${entry.bib_number}`;
        nameLine.appendChild(bib);
        nameLine.appendChild(document.createTextNode(' '));
      }
      // textContent throughout: participant names are user data and must never be
      // interpolated as markup.
      nameLine.appendChild(document.createTextNode(name));

      const meta = document.createElement('p');
      meta.className = 'checkin-row-meta';
      meta.textContent = entry.verification_method || 'manual';

      identity.append(nameLine, meta);

      const action = document.createElement('div');
      action.className = 'checkin-row-action';
      const time = document.createElement('p');
      time.className = 'checkin-row-status';
      time.textContent = formatTime(entry.checked_in_at);
      action.appendChild(time);

      item.append(identity, action);
      el.activity.appendChild(item);
    });
  }

  async function refresh() {
    try {
      const response = await fetch(
        `/organizer/events/${eventId}/check-in-dashboard/poll`,
        { headers: { Accept: 'application/json' } }
      );
      if (!response.ok) throw new Error(`status ${response.status}`);

      const payload = await response.json();
      const summary = payload.summary || {};

      setText(el.checkedIn, summary.checked_in_count ?? '—');
      if (typeof summary.total_registrations === 'number') {
        setText(el.total, summary.total_registrations);
        setText(el.remaining, Math.max(summary.total_registrations - (summary.checked_in_count || 0), 0));
        const percent =
          summary.total_registrations > 0
            ? (((summary.checked_in_count || 0) / summary.total_registrations) * 100).toFixed(1)
            : '0.0';
        setText(el.percent, percent);
      }
      // The poll endpoint returns pace but not the completion estimate, so recompute
      // it here from the same two numbers the server would have used.
      if (payload.velocity) {
        const rate = Number(payload.velocity.check_ins_per_minute);
        setText(el.rate, payload.velocity.check_ins_per_minute);

        const remaining = Math.max(
          (summary.total_registrations || 0) - (summary.checked_in_count || 0),
          0
        );
        if (rate > 0 && remaining > 0) {
          const minutes = Math.ceil(remaining / rate);
          setText(
            el.eta,
            `About ${minutes} minute${minutes === 1 ? '' : 's'} remaining at the current pace.`
          );
        } else if (remaining === 0 && summary.total_registrations > 0) {
          setText(el.eta, 'Everyone registered onsite has checked in.');
        } else {
          setText(el.eta, 'Not enough recent arrivals to estimate a finish time.');
        }
      }

      renderActivity(payload.recent_activity);
      setText(el.updated, `Updated ${new Date().toLocaleTimeString()}. Refreshes every 10 seconds.`);
    } catch (error) {
      setText(el.updated, 'Connection lost — showing the last known figures. Retrying.');
    }
  }

  setInterval(refresh, POLL_MS);
})();
