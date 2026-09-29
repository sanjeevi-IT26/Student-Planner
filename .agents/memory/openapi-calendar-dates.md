---
name: OpenAPI calendar dates
description: How this workspace represents date-only values across generated clients and the PostgreSQL API.
---

Date-only values are declared as OpenAPI `format: date`, generated client types expose them as `string`, and generated server Zod schemas coerce them to `Date`. Keep PostgreSQL date columns in Drizzle `date(..., { mode: "string" })`, then convert validated request dates to `YYYY-MM-DD` before writes.

**Why:** Treating a calendar day as an instant can shift due dates across time zones, while the generated client and server validators otherwise use different runtime types.

**How to apply:** Use midday/UTC-safe parsing only for display and recurrence arithmetic; never serialize a date-only task field with a local `Date.toString()` value.