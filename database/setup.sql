-- =====================================================================
-- Runs every database file in order.
-- From this folder:  psql -U postgres -d trekking_db -f setup.sql
-- WARNING: drops and recreates everything in the public schema.
-- =====================================================================
\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

\i 01_schema.sql
\i 02_functions.sql
\i 03_triggers.sql
\i 04_procedures.sql
\i 05_views.sql
\i 06_sample_data.sql

\echo 'Database ready.'
