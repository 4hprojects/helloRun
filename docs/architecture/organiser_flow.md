# Organiser Flow

1. User signs up and chooses role (`Runner` or `Organizer`).
2. Email verification is sent.
3. User clicks the verification link.
4. Email is verified.
5. If `Runner`: redirect to Home.
6. If `Organizer`: redirect to `/organizer/complete-profile`.
7. Organizer fills business info and uploads documents.
8. Application is submitted (`status: pending`).
9. Admin reviews application.
10. If approved: user can create events.
11. If rejected: user sees reason and can reapply.
