# Test Plan — canBook

All tests use a fresh fixture: `now = 540`, `blocked = false`, `bookings = [{ start: 600, end: 660 }]`.
Overrides are noted per test.

| Test ID | Input (start–end) | Overrides | Expected | Requirement | Reason |
|---------|-------------------|-----------|----------|-------------|-------|
| T01 | 660–720 | — | `true`  | AC4 | New interval starts exactly where the existing booking ends (660). Touching endpoints do not overlap. |
| T02 | 540–570 | — | `false` | AC1 | `start` equals `now` (540). AC1 requires start to be *after* the current time, so rejected. |
| T03 | 720–720 | — | `false` | AC1 | `start >= end` (equal). AC1 requires `0 <= start < end`, so rejected. |
| T04 | 750–720 | — | `false` | AC1 | `start > end`. AC1 requires `start < end`, so rejected. |
| T05 | 1380–1441 | — | `false` | AC1 | `end` (1441) exceeds 1440. AC1 requires `end <= 1440`, so rejected. |
| T06 | 720–840 | — | `true`  | AC2 | Duration is exactly 120 minutes (the maximum). AC2 rejects only *longer than* 120, so allowed. No overlap with the 600–660 booking. |
| T07 | 720–841 | — | `false` | AC2 | Duration is 121 minutes, which exceeds the 120-minute maximum. |
| T08 | 570–600 | — | `true`  | AC4 | New interval ends exactly where the existing booking starts (600). Touching endpoints do not overlap. |
| T09 | 630–690 | — | `false` | AC4 | 630 < 660 and 690 > 600, so the interval overlaps the existing booking. |
| T10 | 570–690 | — | `false` | AC4 | The interval spans across the existing 600–660 booking, so it overlaps. |
| T11 | 615–645 | — | `false` | AC4 | The interval is fully inside the existing 600–660 booking, so it overlaps. |
| T12 | 600–660 | — | `false` | AC4 | The interval is identical to the existing booking, so it overlaps. |
| T13 | 660–720 | `blocked = true` | `false` | AC3 | The room is blocked, so all booking requests are rejected regardless of interval. |
| T14 | 630–690 | `bookings = []` | `true`  | AC4 | No existing bookings, so no overlap is possible. Duration and time bounds are valid. |
| T15 | 541–600 | — | `true`  | AC1 | `start` is 541, which is 1 minute after `now` (540). Satisfies "start after current time." Touches the existing booking start at 600, no overlap. |
| T16 | 1380–1440 | — | `false`→`true` | AC1 | `end` equals 1440 exactly. AC1 allows `end <= 1440`. No overlap, duration is 60 min. |
| T17 | 660–720 | — | bookings unchanged | AC5 | `canBook` must not modify the bookings array. Verified by comparing `JSON.stringify` before and after the call. |
| T18 | 541–661 | `bookings = []` | `true`  | AC1+AC2 | `start` = 541 is exactly `now + 1` (540 + 1). Duration is exactly 120 min (661 − 541). Both boundaries are at their limits and should be allowed. No bookings to overlap. |
| T19 | 660–720 | `bookings = [{600,660}, {720,780}]` | `true`  | AC4 | Candidate fits exactly in the gap between two bookings. 660 touches the first booking's end and 720 touches the second booking's start — touching endpoints do not overlap. |
| T20 | 700–740 | `bookings = [{600,660}, {720,780}]` | `false` | AC4 | 700 < 660 is false (no overlap with first), but 700 < 780 and 740 > 720, so the candidate overlaps the second booking. |
| T21 | 660–720 | `blocked = true, bookings = []` | `false` | AC3 | Even with no existing bookings and a valid interval, a blocked room is always rejected. |
