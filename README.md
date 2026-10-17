# Karakoram Trails — Trekking & Expedition Management System

CS 341 Database Systems course project (IBA, Fall 2026).

An OLTP system for a trekking company in Gilgit-Baltistan: customers browse treks and book seats on dated departures, rent gear and pay in instalments; office staff manage treks, departures, guides, porters, equipment, bookings and payments.

- **Database:** PostgreSQL (tables, constraints, functions, triggers, stored procedures, views)
- **Backend:** Node.js + Express + `pg`
- **Frontend:** React (Vite)

## Folder layout

```
database/
  01_schema.sql         tables, keys, CHECK/UNIQUE constraints (DDL)
  02_functions.sql      helper functions (end date, seats, totals, login)
  03_triggers.sql       8 triggers enforcing business rules R1–R26
  04_procedures.sql     8 stored procedures (book, pay, cancel, delay, ...)
  05_views.sql          4 views used by the screens
  06_sample_data.sql    test data (dates relative to today)
  setup.sql             runs all of the above in order
backend/                Express API (all SQL lives in src/routes/*.js)
frontend/               React app
docs/
  ERD.md                ER diagram, relationships, normalization notes
  business-rules.md     rules, use cases, interview questions
  screens-and-queries.md  screen list, navigation, query map (report §6–7)
```

## How to run it

You need **PostgreSQL 14+** and **Node.js 20+**.

**1. Create the database**

```bash
createdb -U postgres trekking_db
cd database
psql -U postgres -d trekking_db -f setup.sql
```

`setup.sql` drops and recreates everything, so you can run it again any time to reset the sample data. (pgAdmin users: open each numbered file in the Query Tool and run them in order 01 → 06.)

**2. Start the API**

```bash
cd backend
cp .env.example .env      # then put your PostgreSQL password in .env
npm install
npm start                 # http://localhost:5000
```

**3. Start the frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev               # open http://localhost:5173
```

For a single-server demo: run `npm run build` in `frontend`, then only `npm start` in `backend` and open http://localhost:5000.

## Demo logins

| Role | Login | Password |
|---|---|---|
| Customer | ayesha@example.com (also hamza, emma, bilal, zainab, james, sara, usman @example.com) | password123 |
| Office staff | admin | admin123 |

## Things to try in the demo video

1. Browse → K2 Base Camp → Book 2 people with sleeping bags → pay a 30% advance → status turns **Confirmed** (trigger T7).
2. Try to book 2 people on Rakaposhi Base Camp (only 1 seat left) → blocked by trigger T1.
3. Try to pay less than 30% as the first payment → blocked by trigger T6.
4. Admin → Departures → Deosai (no guide) → assign Shah Nawaz → blocked: he is on Rush Lake on overlapping dates (trigger T4).
5. Admin → K2 departure → Delay 3 days → dates and notes update (procedure P5).
6. Cancel a booking → refund follows the policy and gear goes back into stock (P3 + T2).

## Still to do (group)

- [ ] Interview a trek operator (video) and update `docs/business-rules.md` and the ERD to match
- [ ] Compare 2 existing systems (e.g. Bokun / Rezdy and a local operator's site)
- [ ] Draw the ERD in DB Designer / draw.io for Milestone 1 (1 Nov) — `docs/ERD.md` is the starting point
- [ ] Wireframes (sketches) of the main screens for the report
- [ ] Report, demo video, team contributions
