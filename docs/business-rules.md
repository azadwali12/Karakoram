# Business Rules and Use Cases

Rule numbers (R1, R2, ...) match the comments in `database/03_triggers.sql`.
**Replace or adjust these after the interview** — the strongest report links each rule to something the operator said.

## Users and what they can do

**Customer (trekker)**
- Browse treks, filter by region and difficulty, see open dates and seats left
- Create an account, log in, edit profile, change password
- Book a departure for a group, optionally renting gear
- Pay the advance and the balance
- Change the number of people, cancel a booking (refund by policy), delete an unpaid pending booking
- See all their bookings and payment history

**Office staff (admin)**
- Dashboard: upcoming departures, warnings, money received and still due, revenue per trek
- Add / edit / delete treks, guides, porters, equipment
- Create departures, edit price and group size, open or close them for booking
- Assign a guide and porters; delay, cancel or complete a departure
- See all bookings, record payments taken at the office, cancel bookings
- See the staff schedule and the customer list

## Rules enforced in the database

### Bookings
| # | Rule | Where |
|---|---|---|
| R1 | Bookings only on an Open departure that has not started | Trigger T1 |
| R2 | Price per person is copied from the departure | Trigger T1 |
| R3 | Seats booked never exceed max group size | Trigger T1 |
| R4 | One active booking per customer per departure | Trigger T1 |
| R5 | Cancelled and Completed bookings cannot change | Trigger T1 |
| R6 | `cancelled_at` filled automatically | Trigger T1 + CHECK `chk_booking_cancel` |
| R26 | Only unpaid Pending bookings can be deleted | Trigger T1b |

### Equipment
| # | Rule | Where |
|---|---|---|
| R7 | Gear returns to stock when a booking is cancelled or completed | Trigger T2 |
| R8 | Gear can only be rented if in stock; stock updates automatically | Trigger T3 |
| R9 | Rental price copied from equipment table | Trigger T3 |

### Departures and staff
| # | Rule | Where |
|---|---|---|
| R10 | A guide cannot lead two overlapping departures | Trigger T4 |
| R11 | Only active guides can be assigned | Trigger T4 |
| R12 | When dates move, porters must be free on the new dates | Trigger T4 |
| R13 | Max group size cannot go below seats already booked | Trigger T4 |
| R14 | Cancelled and Completed departures are final | Trigger T4 |
| R15 | A departure with active bookings can only be cancelled via `sp_cancel_departure` (which refunds) | Trigger T4 |
| R16 | New departures must start in the future | Trigger T4 |
| R17 | A porter cannot work two overlapping departures | Trigger T5 |
| R18 | Porter load cannot exceed their max load | Trigger T5 |
| R19 | Only active porters, only on Open/Closed departures | Trigger T5 |
| — | Delay is 1–14 days, only for Open/Closed departures | Procedure P5 |
| — | A departure can be completed only after its end date | Procedure P6 |

### Payments
| # | Rule | Where |
|---|---|---|
| R20 | No payments on a cancelled booking (refunds only) | Trigger T6 |
| R21 | First payment is an Advance of at least 30% | Trigger T6 |
| R22 | Total paid never exceeds the booking total | Trigger T6 |
| R23 | A refund never exceeds the amount paid | Trigger T6 |
| R24 | Booking becomes Confirmed when the advance is paid | Trigger T7 |
| R25 | Payments are never edited or deleted | Trigger T8 |

### Cancellation policy (Procedure P3)
- 30+ days before start: 90% of amount paid refunded
- 7–29 days: 50%
- Under 7 days: no refund
- Company cancels the departure: 100%

### Rules held by constraints (DDL)
- Unique: customer email, CNIC/passport, guide CNIC, trek name, item name, (trek, start date)
- CHECK: difficulty values, altitude 500–8611 m, duration 1–60 days, positive prices, group size 1–20, min ≤ max group size, porter load 10–40 kg, valid status / method / payment type values, `0 ≤ available ≤ total` stock
- Foreign keys with RESTRICT stop deleting a trek, customer or porter that has history; deleting a guide sets their old departures' guide to NULL.

## Questions to confirm in the interview
These rules are assumptions until the operator confirms them:
1. Is 30% the real advance? When is the balance due?
2. Is the refund policy close to theirs?
3. What is a normal min and max group size?
4. How are porters assigned and how much do they carry?
5. What happens to bookings when weather delays a trek?
6. Which permits are needed, and what details do they need from trekkers?
