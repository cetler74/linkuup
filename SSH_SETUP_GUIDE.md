# SSH Setup Guide for DigitalOcean Droplet

## Problem: Permission denied (publickey)

If you're getting `Permission denied (publickey)`, it means your SSH key isn't configured on the droplet yet.

## Solution Options

### Option 1: Add SSH Key via DigitalOcean Console (Recommended)

1. **Log into DigitalOcean Dashboard**
   - Go to https://cloud.digitalocean.com
   - Navigate to your droplet (64.226.117.67)

2. **Access the Console**
   - Click on your droplet
   - Click "Console" or "Access" button in the top right
   - This opens a web-based terminal (no SSH needed)

3. **Add Your SSH Key via Console**
   ```bash
   # From the web console, run:
   mkdir -p ~/.ssh
   nano ~/.ssh/authorized_keys
   # Paste your public key here, then save (Ctrl+X, Y, Enter)
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### Option 2: Add SSH Key via DigitalOcean Dashboard (Before Droplet Creation)

If you haven't created the droplet yet or can recreate it:

1. **Go to DigitalOcean Dashboard → Account → Security**
2. **Add SSH Key** - paste your public key
3. **When creating droplet**, select your SSH key

### Option 3: Use Root Password (If Enabled)

If you have root password authentication enabled:

```bash
# Try connecting with password
ssh root@64.226.117.67
# You'll be prompted for password
```

### Option 4: Generate and Add New SSH Key

If you don't have an SSH key yet:

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location (~/.ssh/id_ed25519)
# Optionally set a passphrase

# View your public key
cat ~/.ssh/id_ed25519.pub

# Copy the output - you'll need to add it to the droplet
```

Then use DigitalOcean console to add it (see Option 1).

### Option 5: Add Key via DigitalOcean API/CLI

If you have `doctl` installed:

```bash
# Install doctl if needed: brew install doctl
# Authenticate: doctl auth init

# Get your SSH key ID
doctl compute ssh-key list

# Add key to droplet
doctl compute droplet ssh-key add 64.226.117.67 --ssh-key-ids YOUR_KEY_ID
```

## Step-by-Step: Using DigitalOcean Console (Easiest)

1. **Get your public SSH key:**
   ```bash
   cat ~/.ssh/id_rsa.pub
   # OR if using ed25519:
   cat ~/.ssh/id_ed25519.pub
   ```
   
   If you get "No such file", generate a key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   cat ~/.ssh/id_ed25519.pub
   ```

2. **Log into DigitalOcean Dashboard:**
   - Go to https://cloud.digitalocean.com
   - Click on your droplet (64.226.117.67)
   - Click "Console" button (top right)

3. **Add SSH key from console:**
   ```bash
   # In the web console terminal:
   mkdir -p ~/.ssh
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

4. **Test connection:**
   ```bash
   # From your local machine:
   ssh root@64.226.117.67
   # Should work now!
   ```

## After SSH is Working

Once you can SSH in, create the `linkuup` user:

```bash
ssh root@64.226.117.67

# Create linkuup user
adduser linkuup
usermod -aG sudo linkuup

# Copy SSH key for linkuup user
mkdir -p /home/linkuup/.ssh
cp ~/.ssh/authorized_keys /home/linkuup/.ssh/
chown -R linkuup:linkuup /home/linkuup/.ssh
chmod 700 /home/linkuup/.ssh
chmod 600 /home/linkuup/.ssh/authorized_keys

# Test connection as linkuup
exit
ssh linkuup@64.226.117.67
```

Then you can run the deployment script!

## Troubleshooting

### "Permission denied" persists after adding key

1. Check SSH key format:
   ```bash
   # Your public key should look like:
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... your_email@example.com
   # or
   ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... your_email@example.com
   ```

2. Verify file permissions on server:
   ```bash
   # Via DigitalOcean console
   ls -la ~/.ssh/
   # Should show:
   # drwx------ .ssh
   # -rw------- authorized_keys
   ```

3. Check SSH service:
   ```bash
   systemctl status ssh
   ```

### Can't access DigitalOcean Console

- Make sure you're logged into the correct DigitalOcean account
- Check if droplet is running
- Try accessing via different browser or incognito mode

### Need to Reset Droplet SSH

If you're completely locked out:

1. Use DigitalOcean Console (web-based terminal)
2. Reset root password: DigitalOcean Dashboard → Droplet → Access → Reset Root Password
3. Then add SSH key as described above

