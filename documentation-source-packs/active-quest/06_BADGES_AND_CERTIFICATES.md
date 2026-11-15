# Phase 5: Standard Rewards and Certificate Configuration

## Category reward mapping
25 Starter Quest; 50 Active Quest; 75 Momentum Quest; 100 Endurance Quest; 150 Distance Quest; 200 Ultra Quest. Six separate badge reward slots per monthly edition. Each slot references inherited master design + month/year/category rendered variation.

## Assets and branding
Retain HelloRun icon, consistent typography/logo/primary color; optional monthly accent. Standard badge view 200×200; store higher-resolution source asset where possible. Certificate template contains participant display name, monthly edition, target category, total approved km, award date, certificate ID, organizer and verification URL.

## Eligibility engine
Only approved eligible activities contribute; one reward per participant/category/edition; idempotent issuing; avoid issuing until completion and final review conditions. Late reversals and admin corrections must update eligibility and trigger review/revocation workflow with audit trail. Never erase issued certificate history.

## Asset generation strategy
Start with uploaded, reusable category templates and programmatic month/year overlays if supported by current renderer. Do not require AI image generation to operate monthly events. Run font licensing and brand checks; do not copy third-party race graphics.

## Public checks
Do not claim badge or certificate availability until six badge assets and certificate template validate. Include download test on mobile. Verification page must not reveal sensitive participant data beyond intended public fields.

## Tests
Threshold boundary at 24.99/25.00, pending-only, overtarget stays in category, duplicate issuance, approval reversal, missing asset publish failure, privacy.
