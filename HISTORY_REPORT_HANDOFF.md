# History & Report Backend Handoff

This document details the completed backend work for the rolling 7-day History/Report functionality, its verification results, and guidance for the subsequent frontend implementation.

## 1. Backend Files Changed
- `server/utils/dateUtils.js`: Centralized date math, timezone fixes, and rolling window definitions.
- `server/routes/history.js`: `GET /api/history` now accepts `?endDate=YYYY-MM-DD`.
- `server/routes/reports.js`: `POST /api/reports/weekly` now accepts `{ endDate: "YYYY-MM-DD" }`.
- `server/scripts/seedHistoryReportTestData.js`: 10-day deterministic test data seeder.
- `server/tests/rollingWindow.test.js`: Jest unit tests for the rolling window logic.

## 2. MongoDB Source of Truth
- **Models Used:** `PostureHistory` (daily stats) and `PostureSession` (active sessions).
- `PostureReport` snapshots are generated on demand.

## 3. Rolling 7-Day Rule
- **Definition:** A report or history window is exactly 7 consecutive calendar days.
- **Rule:** `startDate = endDate - 6 days`.
- **Timezone:** All math relies on server-local timezone (YYYY-MM-DD strings), averting UTC +/-1 day drift.

## 4. API Endpoints
### History Endpoint
- **URL:** `GET /api/history?endDate=YYYY-MM-DD` (Legacy `?from=&to=` still supported).
- **Response Structure:** `{ history: [ { localDate, monitoringDurationSeconds, ... }, ... ] }`

### Report Endpoint
- **URL:** `POST /api/reports/weekly`
- **Body:** `{ endDate: "YYYY-MM-DD" }` (Legacy `{ from, to }` still supported).
- **Response Structure:** `{ report: { fromDate, toDate, totalMonitoringDurationSeconds, ... } }`

### Aggregations
- **Formulas:** Weekly % is based on aggregated durations (`sum(bad) / sum(monitoring)`), not averaged daily percentages.
- **Most Frequent Bad Posture:** Derived from the aggregated type durations over the 7 days.

## 5. Seed & Test Configuration
- **Seed Script:** `node server/scripts/seedHistoryReportTestData.js`
- **Test Account:** `hubabmasood47@gmail.com` | Password: `hubab47`
- **Seeded Dates (10):** `2026-08-09` through `2026-08-18`

## 6. Verification Results
- **Seed Idempotency:** Passed (subsequent runs update exactly 10 existing documents; no duplicates).
- **MongoDB Verification:** Passed (10 consecutive records, mathematical sums validated).
- **Jest Tests:** Passed (`npx jest tests/rollingWindow.test.js --runInBand --forceExit` → 31/31 passed).
- **Four Rolling-Window Verifications (A-D):** Passed (All correctly fetch exactly 7 consecutive dates).
- **History/Report Reconciliation:** Passed (History aggregated sums identically match Report endpoint).
- **Future-Date Handling:** Passed (History clamped `endDate` to today; Report rejected future dates with HTTP 400).

## 7. Frontend Guidance (For Next Model)
The frontend currently uses legacy `from`/`to` parameters and computes date boundaries manually.

### Files needing updates:
- `client/src/services/api.ts` (convert to `endDate`)
- `client/src/pages/HistoryPage.tsx` (adopt rolling 7-day model driven by `endDate`)
- `client/src/pages/ReportPage.tsx`

### Instructions for next model:
1. **Remove** local 7-day computations from the frontend.
2. **Drive** the UI solely by selecting an `endDate`.
3. **DO NOT modify** any backend files (`dateUtils.js`, `history.js`, `reports.js`).
4. **DO NOT modify** camera tracking, MediaPipe logic, or `vision-service`.
5. Apply modern, premium aesthetic UI styling to the History and Report views, ensuring a seamless experience.

## 8. Remaining Genuine Issues
- None. The backend is 100% complete and robustly verified. Frontend integration is the sole remaining step for this feature.
