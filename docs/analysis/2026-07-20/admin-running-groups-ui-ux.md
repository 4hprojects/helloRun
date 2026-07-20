# Admin running groups moderation UI/UX audit

Date: July 20, 2026
Surfaces: `/admin/running-groups` and `/admin/running-groups/:id`

## Administrator point of view

“Let me scan group status quickly, find the right record, compare cached and actual membership only where that check is useful, and complete moderation without searching through decorative or repeated content.”

## Implemented direction

- Replaced the four large list summaries with one compact status strip. Active, Archived, and Total are direct filters with an explicit selected state; cached memberships remains a read-only total.
- Kept search visible and moved status, sorting, and page size into a native `Filters & sort` disclosure. The disclosure opens when a non-default advanced filter is active and works as an ordinary GET form without JavaScript.
- Reduced desktop rows to group, creator, status, cached members, updated date, and Manage. A short desktop description preview and native metadata disclosure retain the stable slug and full description without duplicating scan-heavy content on mobile.
- Converted list and member tables to compact cards at tablet and mobile widths. Core facts remain visible, metadata is expandable, and moderation actions span the available card width.
- Reordered detail pages around the member workspace. Identity and integrity status appear first, members and their admin account links come next, and the four management controls remain visible below them.
- Made count mismatches prominent. Reconciliation is offered only when cached and actual totals differ; matching totals show a clear no-action state.
- Kept recent group activity and the filtered Critical Audit destination below operational controls.
- Preserved existing CSRF fields, moderation reasons, confirmation dialogs, focus restoration, Escape cancellation, single-submit protection, routes, notifications, and audit behavior.

## Responsive evidence

List:

- [Desktop, 1440 px](assets/admin-running-groups-list-1440.png)
- [Tablet, 768 px](assets/admin-running-groups-list-768.png)
- [Mobile, 390 px](assets/admin-running-groups-list-390.png)
- [Narrow mobile, 320 px](assets/admin-running-groups-list-320.png)

Detail:

- [Desktop, 1440 px](assets/admin-running-groups-detail-1440.png)
- [Tablet, 768 px](assets/admin-running-groups-detail-768.png)
- [Mobile, 390 px](assets/admin-running-groups-detail-390.png)
- [Narrow mobile, 320 px](assets/admin-running-groups-detail-320.png)

The captures use deterministic privacy-safe group, administrator, and member fixtures. Narrow layouts use concise status labels, keep search and submit controls aligned, wrap long identities safely, and retain full-width management actions without page-level horizontal overflow.

## Compatibility and acceptance

- Existing `q`, `status`, `sort`, `perPage`, `page`, and `memberPage` query parameters remain unchanged.
- List pages continue using cached membership totals and do not perform an actual-member calculation for every row.
- Detail pages remain the source of cached-versus-actual integrity checks.
- Both support-tier and full-tier administrators retain all existing running-group moderation actions.
- Native disclosures, GET search/filter forms, member links, and mutation forms remain usable without JavaScript.
- Controls retain a 44-pixel minimum target, visible focus, reduced-motion behavior, safe wrapping, and usable layouts at 1440, 768, 390, and 320 pixels.
