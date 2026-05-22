# HelloRun Policy Implementation Notes

**Purpose:** Internal implementation checklist for deploying the updated policy set.

## 1. Recommended Footer Policy Links

Use consistent names everywhere:

- Privacy Policy
- Terms and Conditions
- Cookie Policy
- Data Usage Policy
- Refund and Cancellation Policy
- Organiser Terms
- Community Guidelines
- Acceptable Use Policy

Avoid mixing “Terms of Service” and “Terms and Conditions” unless they point to the same official document name.

## 2. Recommended Signup Consent Text

Use this during signup:

> I have read and agree to the HelloRun Terms and Conditions, Privacy Policy, Cookie Policy, and Data Usage Policy. I understand that HelloRun may process my personal data, uploaded activity proof, payment proof, and event participation records for account management, event registration, payment verification, run submission review, fraud prevention, leaderboard publication, certificates, and platform security.

## 3. Recommended Event Registration Consent Text

Use this during event registration:

> I confirm that the information I provided is accurate. I understand that my registration details, payment proof, submitted run proof, results, and event participation data may be shared with the organiser of this event for event management, verification, communication, reporting, and result publication.

## 4. Recommended Run Submission Confirmation Text

Use this during run proof submission:

> I confirm that this activity is my own and that the submitted details are accurate. I understand that HelloRun may analyse the uploaded screenshot, use OCR-assisted reading, flag mismatches or suspicious entries, and share the submission with the event organiser for review.

## 5. Recommended Payment Proof Upload Confirmation Text

Use this during payment proof upload:

> I confirm that this payment proof is valid and related to my registration. I understand that HelloRun and the organiser may review the uploaded image, transaction reference, amount, date, and visible payment details for verification and dispute resolution.

## 6. Recommended Internal Admin Fields

### Signup Consent

- userId
- termsVersion
- privacyVersion
- cookieVersion
- dataUsageVersion
- acceptedAt
- IP address
- user agent
- consent source: signup
- checkbox text version

### Event Registration Consent

- registrationId
- userId
- eventId
- eventPolicyVersion
- refundPolicyVersion
- acceptedAt
- IP address
- user agent

### Run Submission Confirmation

- submissionId
- userId
- eventId
- confirmationTextVersion
- submittedAt
- OCR status
- mismatch flag
- manual review status

### Payment Proof Confirmation

- paymentProofId
- registrationId
- uploadedAt
- reviewedBy
- reviewStatus
- reviewTimestamp
- extractedReferenceNumber, if applicable
- extractedAmount, if applicable

## 7. Recommended Publishing Priority

Publish in this order:

1. Update Privacy Policy
2. Add Data Usage Policy
3. Update Terms and Conditions
4. Add Refund and Cancellation Policy
5. Add Organiser Terms
6. Update Cookie Policy
7. Add Community Guidelines
8. Add Acceptable Use Policy

The strongest update is the Data Usage Policy. It directly addresses HelloRun’s unique workflow: screenshots, OCR, Strava imports, payment proof, organiser review, flagged submissions, and public results.
