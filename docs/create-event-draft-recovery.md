# Create Event Draft Saving and Entry Recovery

**Page:** `/organizer/create-event`  
**Status:** Implemented for organizer create-event draft recovery.

---

## Problem

The create-event wizard is a long, 12-step form. Without recovery support:

- Progress can be lost on tab close, browser crash, accidental navigation, or session timeout.
- Manual Save Draft requires a title, performs a full page POST, and redirects away from the form.
- Files such as logo, banner, poster, payment QR, and gallery images cannot be recovered without re-uploading.

---

## Solution: Two-Layer Strategy

### Layer 1: `localStorage`

| Area | Behavior |
|---|---|
| Trigger | Debounced `input`/`change` on non-file fields, plus immediate save on step changes |
| Storage key | `hellorun_create_event_draft_<userId>` |
| Saved data | Input, select, and textarea values. Files are excluded. |
| Restore | Page load shows a restore/discard banner when saved data exists. |
| Clear | Successful save draft or submit-for-review clears the local draft. |
| Scope | Same browser/device recovery. |

### Layer 2: Server Autosave

| Area | Behavior |
|---|---|
| Endpoint | `POST /organizer/create-event/autosave` |
| Request type | JSON |
| Response | `{ draftEventId }` |
| Trigger | Step change when the title is filled. |
| First call | Creates a new `status: draft` event. |
| Later calls | Updates the existing draft by `draftEventId` after ownership check. |
| Draft ID storage | Saved in the same localStorage object as `_draftEventId`. |
| Resume | Existing server draft can be resumed through the organizer edit page. |
| Files | Not autosaved. Manual Save Draft is still needed to preserve uploaded files. |

---

## UI Additions

### Restore Banner

Shown near the top of the create-event page when local draft data exists.

Actions:

- Restore draft
- Discard

### Confirmation Dialogs

Reusable dialogs confirm potentially disruptive actions:

- restore draft
- discard draft
- preview current setup
- save draft
- submit for review
- leave the page with unsaved changes

### Autosave Status

The action bar can show:

- Saving...
- Saved just now
- Last saved timing
- Save failed, with retry behavior

---

## Implementation Files

| File | Responsibility |
|---|---|
| `src/views/organizer/create-event.ejs` | Restore banner, confirmation dialogs, autosave client logic, action button handling |
| `src/routes/organizer.routes.js` | `POST /organizer/create-event/autosave` endpoint |
| `src/public/css/create-event.css` | Restore banner, confirmation dialog, and autosave status styles |
| `tests/organizer-waiver-routes.test.js` | Static and route coverage around create/edit event wizard behavior |

---

## Scenario Coverage

| Scenario | localStorage | Server autosave |
|---|---:|---:|
| Tab closed mid-form | Yes | Yes, once title exists |
| Browser crash | Yes | Yes, once title exists |
| Multi-device resume | No | Yes |
| Files | No | No |
| No title yet | Yes | No |
| Successful submit | Local draft cleared | Draft promoted or saved |

---

## Notes

- Autosave requires a title before creating a server draft.
- Autosave verifies organizer ownership before updating an existing draft.
- CSRF protection still applies to the autosave endpoint.
- Uploaded files remain intentionally manual because browser file inputs cannot be safely serialized into localStorage.
