# Smart Campus Room Availability Checker
Small demo app. One room, fictional bookings, no login, no database.

## Commands
npm run test | npm run typecheck | npm run lint | npm run build

## Practice 11 feature
Optional "Explain availability" button. A mock adapter writes a short explanation
from the checkBooking result. The booking rules decide availability, never the
explanation. If the adapter fails or the text is invalid, a fixed fallback text is shown.