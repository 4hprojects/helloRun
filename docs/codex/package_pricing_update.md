# Package Pricing Update Plan

## Goal

Add post-MVP package-based registration pricing without breaking the current stable pricing paths:

- `free`
- `distance_based`
- `distance_based_period`
- `customized_options`

Package pricing should let runners select a configured registration package, snapshot the selected package price at registration time, and include that fee in the existing registration checkout order bridge.

## Current State

Already exists:

- `Event.registrationPackages[]` with `name`, `includedItems`, `pricingPeriods[]`, and `notes`.
- Organizer create/edit normalization and persistence for `registrationPackages`.
- Public event pages show packages as optional package cards.
- Checkout orders already include `Registration.paymentAmountDue` plus optional add-ons.

Missing:

- Runner-facing package selection during registration.
- Registration price resolver support for package pricing.
- Registration snapshot fields for selected package identity.
- Validation that a paid package-pricing event has usable package prices.
- Public pricing summary semantics for package pricing as the primary registration fee.
- Export/reporting fields for selected package.

## Recommended Model Direction

Use existing `Event.registrationPackages` instead of adding a parallel package model for the next slice.

Add stable package IDs before runner selection:

```js
registrationPackages: [{
  packageId: String,
  name: String,
  includedItems: Object,
  pricingPeriods: [{
    label: String,
    code: 'early_bird' | 'regular' | 'late' | 'custom',
    startAt: Date,
    endAt: Date,
    amount: Number
  }],
  notes: String
}]
```

Add package snapshot fields under `Registration.pricingSnapshot`:

```js
packageId: String
packageName: String
packagePeriodCode: String
packagePeriodLabel: String
packageIncludedItems: [String]
```

Keep `paymentAmountDue`, `paymentCurrency`, and checkout order behavior unchanged.

## Pricing Mode Recommendation

Use `package_period` as the first package pricing mode because the schema already has package-level `pricingPeriods`.

Do not introduce a separate `package_based` mode yet unless there is a product requirement for single-price packages. A package with one regular pricing period can cover that use case.

## Runner Registration Changes

When `event.pricingMode === 'package_period'` and `event.feeMode === 'paid'`:

- Show a required "Registration Package" selection.
- Keep race distance/category selection if the event still has race distances.
- Submit `registrationPackageId`.
- Resolve price from selected package and the active package pricing period.
- If no active package period exists, block registration with a pricing unavailable message.
- Snapshot package identity and active period in `Registration.pricingSnapshot`.

## Price Resolver Changes

Extend `src/services/registration-price.service.js` with:

```js
getRegistrationPackageOptions(event)
resolvePackageRegistrationPrice(event, formData, options)
```

Resolution rules:

- Match `formData.registrationPackageId` against `packageId`, `_id`, or fallback index id.
- Require a valid package.
- For `package_period`, choose the active package pricing period by `now`.
- Use the active period amount as `amount`.
- Return a `buildResolvedPrice()` result with:
  - `source: 'registration_package'`
  - `label: package.name`
  - `packageId`
  - `packageName`
  - `pricingPeriodCode`
  - `pricingPeriodLabel`

## Form Service Changes

Update `src/services/event-form.service.js`:

- Ensure package IDs are normalized and persisted.
- Validate `package_period` paid events:
  - at least one package
  - each entered package has a name
  - each package has at least one valid pricing period with amount
  - package pricing period dates are valid and within registration window
  - periods in one package do not overlap
- Add package-pricing readiness item.
- Add package pricing details to review summary.

## Public Event Display Changes

Update `src/utils/event-public-view.js`:

- Treat `package_period` as primary registration pricing when paid.
- `pricingOptions` should include package cards with `From ...` amount labels.
- Pricing summary should show package price range.
- Keep existing package cards visible, but avoid duplicate visual meaning if package pricing cards are already shown as primary pricing options.

## Checkout Order Behavior

No new checkout bridge is needed.

The existing `createRegistrationCheckoutOrderIfNeeded()` should continue to use:

```js
Registration.paymentAmountDue + addOnsSubtotal
```

Update order item metadata so registration-fee line items include package snapshot fields when available:

```js
packageId
packageName
pricingPeriodCode
pricingPeriodLabel
```

## Backward Compatibility

Preserve:

- Existing `customized_options` package-like signup options.
- Existing distance-based and period-based pricing behavior.
- Existing optional add-ons behavior.
- Existing public package cards for old events.

Do not migrate existing `customizedOptions` into `registrationPackages`. They are runner signup options and already stable.

## Implementation Order

1. Add package IDs and package snapshot fields.
2. Extend package normalization/validation/readiness.
3. Extend registration price resolver with package-period support.
4. Add runner registration package selection.
5. Snapshot selected package data on registration.
6. Update checkout order metadata labels for package registration fees.
7. Update public pricing summary/options for package pricing.
8. Add exports/organizer registrant display for selected package.

## Test Plan

Add or update:

- `tests/create-event-form.service.test.js`
  - package IDs normalize and persist
  - invalid package periods fail publish readiness
  - valid package-period event passes package pricing validation
- `tests/registration-price.service.test.js`
  - package period resolves active price
  - missing package selection fails
  - inactive package period fails
  - existing pricing modes still pass
- `tests/registration-addons-read.test.js`
  - runner selects package
  - registration snapshot stores package identity
  - `paymentAmountDue` uses selected package amount
  - checkout order total still includes package fee plus add-ons
- `tests/event-public-view.test.js`
  - public package pricing summary uses package price range
  - legacy package display remains intact
- `tests/organizer-waiver-routes.test.js`
  - create/edit package-period publish validation and Step 12 readiness render

## Definition of Done

- Paid `package_period` events can be submitted for review only with valid package pricing.
- Runners can select a package during registration.
- Registration snapshots preserve selected package identity and amount.
- Checkout order totals include selected package registration fee plus optional add-ons.
- Public event pages show package pricing clearly.
- Legacy `free`, `distance_based`, `distance_based_period`, and `customized_options` tests still pass.
