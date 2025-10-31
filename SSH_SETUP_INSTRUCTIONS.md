# SSH Key Setup for Hostinger (147.93.89.178)

## ✅ Your SSH Public Key (Already Copied to Clipboard!)

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILljUX7rUTmMio1WgTX+6MEGvIQ3OuSwzyIhCwxIEO90 your_email@example.com
```

## 🔑 Choose One Method to Add Your SSH Key:

---

### Method 1: Hostinger Control Panel (Easiest) ⭐

1. **Log in to Hostinger Control Panel** (hpanel.hostinger.com)

2. **Go to SSH Access section**
   - Navigate to: Advanced → SSH Access
   - Or search for "SSH" in the control panel

3. **Add SSH Key**
   - Look for "SSH Keys" or "Manage SSH Keys"
   - Click "Add New Key"
   - **Paste** the key from your clipboard (already copied!)
   - Give it a name like "BioSearch2-Deployment"
   - Click "Add" or "Save"

4. **Enable SSH Access**
   - Make sure SSH access is enabled for your hosting account

5. **Note your SSH username**
   - Hostinger typically provides a username (might be `u123456789` or similar)
   - Write it down, you'll need it for deployment

---

### Method 2: Using ssh-copy-id Command (Quick) 🚀

If you know your Hostinger SSH password:

```bash
# Replace YOUR_USERNAME with your Hostinger SSH username
ssh-copy-id -i ~/.ssh/id_ed25519.pub YOUR_USERNAME@147.93.89.178
```

When prompted, enter your Hostinger SSH password.

---

### Method 3: Manual SSH Method 🔧

If you have SSH password access:

```bash
# Step 1: Connect to your server
ssh YOUR_USERNAME@147.93.89.178

# Step 2: Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Step 3: Add the public key (paste the key when prompted)
cat >> ~/.ssh/authorized_keys
# (Paste the SSH key from clipboard, then press Ctrl+D)

# Step 4: Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# Step 5: Exit
exit
```

---

### Method 4: Through Hostinger File Manager 📁

1. Log in to Hostinger control panel
2. Open File Manager
3. Navigate to your home directory
4. Create folder `.ssh` (if it doesn't exist)
5. Create/edit file `.ssh/authorized_keys`
6. Paste your SSH key (from clipboard)
7. Save the file

---

## ✅ After Adding the Key - Test Connection

Once you've added the SSH key using any method above, test the connection:

```bash
# Test with your Hostinger username
ssh YOUR_USERNAME@147.93.89.178

# If successful, you'll be logged in without a password!
```

---

## 🎯 Next Steps After SSH is Working

Once SSH authentication is working:

### 1. Update Deployment Scripts

Update the username in the deployment scripts:

```bash
# Edit scripts/deploy_to_hostinger.sh
# Change line 9 to your actual Hostinger username:
HOSTINGER_USER="YOUR_USERNAME"  # e.g., u123456789 or root
```

Also update `scripts/update_hostinger.sh` with the same username.

### 2. Run Deployment

```bash
./scripts/deploy_to_hostinger.sh
```

---

## 🆘 Troubleshooting

### "Permission denied" error
- Make sure the SSH key is properly added
- Check that permissions are correct (700 for .ssh, 600 for authorized_keys)
- Verify you're using the correct username

### Don't know your SSH username?
- Check Hostinger control panel under SSH Access
- It's usually shown as "SSH/SFTP Username"
- Common formats: `u123456789`, `root`, or your domain name

### Can't find SSH Access in Hostinger?
- Some Hostinger plans may not include SSH access
- Check with Hostinger support to enable SSH for your account
- You may need to upgrade your hosting plan

### Need to copy the key again?

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

---

## 📞 Hostinger Support

If you need help enabling SSH access:
- Contact Hostinger support through your control panel
- Ask to enable SSH access for IP: 147.93.89.178
- Mention you need it for application deployment

---

## ⚡ Quick Reference

**Your SSH Public Key Location:**
`~/.ssh/id_ed25519.pub`

**Hostinger Server IP:**
`147.93.89.178`

**To re-copy key to clipboard:**
```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

**To view your key:**
```bash
cat ~/.ssh/id_ed25519.pub
```

