# User Role System

## Primary Role
- `runner`: Can participate in events.
- `organiser`: Can create events and participate in events (includes runner privileges).
- `admin`: Can do everything.

## Organizer Status (Separate from Role)
- `not_applied`: Runner who has not applied.
- `pending`: Applied and waiting for approval.
- `approved`: Can create events and participate.
- `rejected`: Application rejected.
