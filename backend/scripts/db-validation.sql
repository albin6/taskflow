# Postgres Performance Validation Queries

Use these queries in your DB console to verify that the optimizations are effective.

## 1. Verify Index Scan (Instead of Full Table Scan)
Run this for the team task dashboard query.
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tasks 
WHERE "teamId" = 'YOUR_TEAM_ID' 
AND "status" != 'APPROVED' 
ORDER BY "createdAt" DESC 
LIMIT 20;
```
**Expected Result**: Look for `Index Scan using IDX_TASKS_TEAM_STATUS` or `Index Scan using IDX_TASKS_CREATED_AT`. If you see `Seq Scan`, the index is being ignored.

## 2. Monitor Active Connections
Measure DB pool saturation.
```sql
SELECT count(*), state 
FROM pg_stat_activity 
WHERE datname = 'taskflow' 
GROUP BY state;
```
**Action**: If `active` count stays at 20 (your pool limit) during load tests, you are experiencing pool queuing.

## 3. Check for Largest Tables (Potential Vacuum Need)
```sql
SELECT relname, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
```
