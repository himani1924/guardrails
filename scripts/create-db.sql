-- One-time role + database setup for local dev.
-- Safe to re-run: uses IF NOT EXISTS / conditional blocks.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'guardrail') THEN
    CREATE ROLE guardrail LOGIN PASSWORD 'guardrail';
  END IF;
END $$;

SELECT 'CREATE DATABASE guardrail OWNER guardrail'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'guardrail')\gexec

GRANT ALL PRIVILEGES ON DATABASE guardrail TO guardrail;
