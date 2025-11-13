# Backend Log Viewing Guide

## Quick Commands

### Continuously Follow Logs (Real-time)

**Error logs only:**
```bash
tail -f /var/log/linkuup/error-0.log
```

**Output logs (all application output):**
```bash
tail -f /var/log/linkuup/out-0.log
```

**Both logs together:**
```bash
tail -f /var/log/linkuup/out-0.log /var/log/linkuup/error-0.log
```

### View Last N Lines (Non-continuous)

**Last 100 lines of error log:**
```bash
tail -100 /var/log/linkuup/error-0.log
```

**Last 100 lines of output log:**
```bash
tail -100 /var/log/linkuup/out-0.log
```

### Search Logs

**Search for specific terms:**
```bash
# Search error logs
grep -i "error\|payment\|checkout" /var/log/linkuup/error-0.log | tail -50

# Search output logs
grep -i "pro plan\|registration\|payment" /var/log/linkuup/out-0.log | tail -50
```

**Search with context (show 5 lines before/after):**
```bash
grep -i -A 5 -B 5 "checkout" /var/log/linkuup/out-0.log | tail -100
```

### Using PM2 Commands

**View logs via PM2:**
```bash
# Follow all logs
pm2 logs linkuup-backend

# Follow with specific number of lines
pm2 logs linkuup-backend --lines 200

# Follow only error logs
pm2 logs linkuup-backend --err

# Follow only output logs
pm2 logs linkuup-backend --out
```

## Helper Scripts

**Interactive log viewer:**
```bash
cd /opt/linkuup
./view_logs_continuous.sh
```

**Simple log viewer:**
```bash
cd /opt/linkuup
./view_backend_logs.sh
```

## Tips

1. **Press Ctrl+C** to stop following logs
2. **Use `less` or `more`** to scroll through logs:
   ```bash
   less /var/log/linkuup/out-0.log
   ```
3. **Filter in real-time** using `grep`:
   ```bash
   tail -f /var/log/linkuup/out-0.log | grep -i "payment\|checkout"
   ```
4. **Save filtered logs** to a file:
   ```bash
   tail -f /var/log/linkuup/out-0.log | grep -i "payment" > payment_logs.txt
   ```

