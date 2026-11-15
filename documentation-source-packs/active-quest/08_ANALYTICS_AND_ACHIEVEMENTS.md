# Phases 7–8: Series Analytics and Long-Term Achievements

## Metrics
Per month: registrations, unique participants, new and returning users, approved activity count, total approved event km, completion rate, submissions pending/flagged/rejected, median review duration, OCR correction rate (when available). Define time window, denominators and handling of deleted/invalidated records in code and documentation.

## Returning rate
Users registered in current edition who also registered in immediately previous calendar month's edition / unique current registrations. Exclude duplicate rows and distinguish prior participant from prior finisher.

## Achievement candidates
First Quest (first completed month), Triple Quest (3 consecutive), Half-Year Quest (6 consecutive), Year-Round Quest (12 consecutive), Annual Quest Finisher (all 12 in same calendar year), 500 KM / 1,000 KM unique approved activity thresholds.

## Consistency rules
Award after relevant editions finalize; missed month breaks consecutive streak, not previously awarded badge. Recompute deterministically after final result corrections, with historical award/revocation audit. Do not double-count same real-world activity in all-time unique-distance metrics if used in overlapping events. Separate event-specific totals from unique-global activity totals.

## Privacy and research
Respect existing name-display preferences, minimize analytics personal data. Research export for MIT must be a separately reviewed, approved and de-identified workflow; no assumption that normal service consent allows research use.

## Tests
Year boundary streaks, event not finalized, backdated adjustment, duplicate real-world activity across events, privacy, race between award job and approval reversal, dashboard totals vs source records.
