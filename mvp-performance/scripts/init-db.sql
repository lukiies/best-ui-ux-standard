-- =============================================================================
-- PostgreSQL Initialization Script
-- Runs automatically on first container start
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure pg_stat_statements for monitoring
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Create read-only user for monitoring
CREATE ROLE monitoring WITH LOGIN PASSWORD 'monitoring_password';
GRANT CONNECT ON DATABASE mvp_performance TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring;

-- Performance tuning for monitoring queries
ALTER SYSTEM SET log_min_duration_statement = 200;  -- Log queries > 200ms
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;
ALTER SYSTEM SET log_autovacuum_min_duration = 0;

SELECT pg_reload_conf();
