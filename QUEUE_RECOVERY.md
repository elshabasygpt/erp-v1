# ERP Disaster Protocol: Queue & Redis Volatility

## The "Black Hole" Vulnerability
By default, memory-based queues (like Redis or Memcached) prioritize raw speed over data durability. If your background workers are responsible for mission-critical tasks—such as sending compliance invoices, recalculating financial ledgers, or triggering database backups—a single server reboot or Out-of-Memory (OOM) crash will **permanently erase** all pending jobs from RAM. 

You will not receive an error. The jobs will simply cease to exist.

## Required Production Adjustments

To achieve Enterprise-Grade Disaster Recovery, you must implement **one** of the following architectural changes:

### Option A: The "Zero-Loss" Database Queue (Recommended)
Because the ERP processes highly sensitive financial data, we strongly recommend sacrificing a small amount of raw throughput for absolute durability.
By switching the queue to the Central Postgres database, jobs are physically written to the NVMe drive. If the server crashes, the jobs simply resume processing when the server boots back up.

**Action:**
In your production `.env` file, change:
```env
QUEUE_CONNECTION=redis
```
to:
```env
QUEUE_CONNECTION=database
```

### Option B: Redis Append-Only File (AOF) Persistency
If your queue volume is so immense that Postgres becomes a bottleneck (e.g., >5,000 jobs per minute), you may continue using Redis. However, you must configure your external Redis instance to write its RAM state to the physical disk.

**Action:**
Modify your `redis.conf` file on your caching server:
```text
appendonly yes
appendfsync everysec
```
*Note: Even with `everysec` syncing, an unexpected power failure may still result in up to 1 second of lost jobs.*

## The Failed Jobs Safety Net
Regardless of which option you choose, the application has now been patched to include a persistent `failed_jobs` database table. 
If a job is successfully picked up by a worker but throws a fatal exception (e.g., the SMTP server is down), it will be safely moved out of the queue and stored permanently in the database.

**Recovery Commands:**
- View failed jobs: `php artisan queue:failed`
- Retry all failed jobs: `php artisan queue:retry all`
- Flush old failures: `php artisan queue:flush`
