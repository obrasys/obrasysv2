-- Move pg_trgm extension from public to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;