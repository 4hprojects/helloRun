# Runner notification center audit

Date: July 17, 2026  
Surface: `/runner/notifications`  
Primary audience: runners reviewing registration, activity, result, recognition, account, and community updates

## Runner point of view

“Show me what changed, let me read the complete update without losing my place, and take me directly to the thing I need to review or fix. Once I am finished, let me move the update out of my current list without deleting its history.”

The redesigned notification center keeps strict newest-first chronology while improving scanability, action labels, read behavior, and durable archiving. Opening a compact update reveals its full content in an accessible modal and marks it read only after the server confirms the change.

## Severity-ranked findings and resolution

| Severity | Finding | Runner impact | Implemented resolution |
| --- | --- | --- | --- |
| High | Approval, rejection, payment, certificate, profile, and group updates shared nearly identical visual treatment. | Runners had to interpret raw titles and type strings to understand what happened and where to go next. | Normalize notification types into runner-facing categories, icons, tones, and contextual actions while retaining chronological order. |
| High | “Open related page” did not describe the outcome of following a notification. | Correction and certificate actions were ambiguous at the moment a runner needed confidence. | Resolve actions such as Fix payment, Fix entry, View result, View registration, and Download certificate from safe presentation data. |
| High | Read notifications could only remain in the primary feed. | A long history obscured current updates and provided no durable way to clear completed items. | Add individual archive/restore and confirmed bulk archiving for active read notifications. |
| Medium | Opening the related page and marking a notification read were separate tasks. | Unread counts stayed stale even after a runner reviewed the update. | Open full details in a modal and perform an ownership-scoped, CSRF-protected read update before changing the local state. |
| Medium | The page had one All/Unread toggle and constructed pagination URLs with empty parameters. | State was difficult to understand and generated URLs were noisy. | Add Current, Unread, and Archived views with global counts, normalized legacy links, and deterministic pagination URLs. |
| Medium | The full list was contained inside one large generic card and each row repeated dense metadata and controls. | Desktop space was underused while mobile actions stacked unevenly. | Use a compact bounded feed, aligned row anatomy, one review affordance, and 44px responsive controls. |
| Medium | JavaScript behavior had no dedicated notification detail experience or failure feedback. | Read-state errors could be silent and keyboard focus behavior was undefined. | Add one reusable native dialog, focus restoration/trapping, live busy/error feedback, and reduced-motion behavior. |
| Low | Unread state relied primarily on a blue border/background combination. | State emphasis competed with the site-wide move away from colored edge accents. | Retain an unread dot, weight, text, and soft background with no colored left border. |

## Responsive evidence

- [Desktop, 1440 px](assets/runner-notifications-desktop.png)
- [Tablet, 768 px](assets/runner-notifications-tablet.png)
- [Mobile, 390 px](assets/runner-notifications-mobile.png)
- [Narrow mobile, 320 px](assets/runner-notifications-mobile-320.png)

The captures use deterministic runner-safe notification fixtures and the production notification stylesheet. They exercise long titles, unread/read states, contextual categories, and responsive wrapping without exposing real runner data.

## Rationale

- Chronology remains authoritative; the interface does not silently reorder “important” types.
- Status views are intentionally limited to Current, Unread, and Archived so notification history does not become another search-management surface.
- Archived updates remain durable and restorable. Archiving marks unread items read but never deletes them.
- The notification model keeps raw types for delivery compatibility while the service owns all runner-facing wording.
- Unsafe, external, or malformed destinations are removed from presentation rather than rendered as links.
- A native disclosure retains the complete message and forms without JavaScript; JavaScript enhances the same server-rendered content into a modal.
- Navigation counts, current-page counts, and archive operations exclude archived notifications consistently.

## Acceptance criteria

- [x] The compact header explains the page and links to notification preferences.
- [x] Current, Unread, and Archived views expose global counts and `aria-current` state.
- [x] Default URLs omit empty parameters; `unread=1` remains compatible.
- [x] Results remain newest-first with stable `_id` tie-breaking and 20-item pagination.
- [x] Rows show an unread indicator, normalized category/icon, preview, time, and contextual label.
- [x] Raw notification types and generic “Open related page” wording are absent.
- [x] Opening the modal marks an unread notification read only after a successful server response.
- [x] The modal restores focus, traps keyboard focus, closes with Escape, and reports read-state failures live.
- [x] Native disclosures retain full content and forms when JavaScript is unavailable.
- [x] Individual archive/restore and confirmed archive-all-read controls are CSRF protected and ownership scoped.
- [x] Active unread/navigation counts exclude archived notifications.
- [x] Unsafe destinations do not render a contextual CTA.
- [x] Empty Current, Unread, and Archived views each offer one recovery action.
- [x] No notification component uses a colored left-edge accent.
- [x] Controls meet 44px targets, focus is visible, reduced motion is respected, and 320px has no horizontal scrolling.
