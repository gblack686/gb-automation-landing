# Lightsail SSL/TLS Setup Guide for WebSocket (WSS)

## Problem
The `/plan` page shows a white screen because:
- The page is served over HTTPS (`https://master.d1qefy5a1kauhs.amplifyapp.com`)
- The WebSocket tries to connect to `ws://44.208.161.19:3000` (insecure)
- Browsers block mixed content (HTTPS → WS)

**Solution**: Set up SSL/TLS on the Lightsail instance to enable `wss://` connections.

---

## Prerequisites
- Access to Lightsail instance: `multi-agent-adw` (44.208.161.19)
- SSH key: `LightsailDefaultKeyPair`
- Domain or subdomain pointing to the instance (e.g., `ws.gbautomation.xyz`)

---

## Option 1: Using a Subdomain (Recommended)

### Step 1: Create DNS Record
1. Go to your DNS provider (where `gbautomation.xyz` is registered)
2. Add an A record:
   ```
   Type: A
   Name: ws
   Value: 44.208.161.19
   TTL: 300 (or automatic)
   ```
3. Wait for DNS propagation (1-5 minutes)
4. Verify: `ping ws.gbautomation.xyz` should resolve to `44.208.161.19`

### Step 2: SSH into Lightsail Instance
```bash
# Download SSH key from Lightsail console if you don't have it
# Then:
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@44.208.161.19
```

### Step 3: Install nginx and Certbot
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install nginx
sudo apt install nginx -y

# Install Certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Step 4: Configure nginx for WebSocket
Create nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/websocket
```

Add this configuration:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name ws.gbautomation.xyz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/websocket /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Step 5: Obtain SSL Certificate
```bash
sudo certbot --nginx -d ws.gbautomation.xyz
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

Certbot will automatically:
- Obtain SSL certificate
- Update nginx config to use HTTPS
- Set up auto-renewal

### Step 6: Verify SSL Setup
```bash
# Check nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  https://ws.gbautomation.xyz/
```

### Step 7: Update Environment Variable
Back in your landing page repository:

```bash
cd gb-automation-landing
```

Create/update `.env.production`:
```bash
VITE_WS_URL=wss://ws.gbautomation.xyz
```

---

## Option 2: Using Lightsail Load Balancer with SSL

If you want to avoid managing SSL yourself:

### Step 1: Create Lightsail Load Balancer
```bash
aws lightsail create-load-balancer \
  --load-balancer-name ws-lb \
  --instance-port 3000 \
  --region us-east-1
```

### Step 2: Attach Instance to Load Balancer
```bash
aws lightsail attach-instances-to-load-balancer \
  --load-balancer-name ws-lb \
  --instance-names multi-agent-adw
```

### Step 3: Create SSL Certificate
```bash
aws lightsail create-load-balancer-tls-certificate \
  --load-balancer-name ws-lb \
  --certificate-name ws-cert \
  --certificate-domain-name ws.gbautomation.xyz
```

### Step 4: Validate Certificate
Follow the DNS validation steps provided by AWS.

### Step 5: Attach Certificate
```bash
aws lightsail attach-load-balancer-tls-certificate \
  --load-balancer-name ws-lb \
  --certificate-name ws-cert
```

### Step 6: Get Load Balancer DNS Name
```bash
aws lightsail get-load-balancer \
  --load-balancer-name ws-lb \
  --query 'loadBalancer.dnsName'
```

### Step 7: Update DNS
Point `ws.gbautomation.xyz` to the load balancer DNS name using a CNAME record.

---

## Option 3: Temporary Local Testing

For development/testing only (not for production):

### Update Component for Local Testing
Create `.env.local`:
```bash
VITE_WS_URL=ws://localhost:3000
```

Run the orchestrator locally:
```bash
# In a separate terminal
cd path/to/orchestrator
npm start
```

Run the landing page locally:
```bash
cd gb-automation-landing
npm run dev
```

Visit `http://localhost:5173/plan` (not HTTPS, so ws:// will work)

---

## Post-Setup: Update PRDGenerator Component

Once SSL is set up, update the default WebSocket URL in the code:

```bash
cd gb-automation-landing
```

Edit `src/components/PRDGenerator.jsx`:

```javascript
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://ws.gbautomation.xyz';
```

Build and deploy:
```bash
npm run build
git add .
git commit -m "feat: update WebSocket URL to use wss://"
git push origin master
```

---

## Testing the Connection

### From Browser Console
```javascript
const ws = new WebSocket('wss://ws.gbautomation.xyz');
ws.onopen = () => console.log('Connected!');
ws.onerror = (error) => console.error('Error:', error);
ws.onclose = () => console.log('Closed');
```

### From Command Line
```bash
# Install wscat
npm install -g wscat

# Test connection
wscat -c wss://ws.gbautomation.xyz
```

---

## Troubleshooting

### Error: "502 Bad Gateway"
- Check if the orchestrator is running on port 3000:
  ```bash
  sudo netstat -tlnp | grep 3000
  ```
- Restart the orchestrator service

### Error: "SSL certificate problem"
- Verify certificate installation:
  ```bash
  sudo certbot certificates
  ```
- Renew if expired:
  ```bash
  sudo certbot renew
  ```

### Error: "Connection refused"
- Check nginx status:
  ```bash
  sudo systemctl status nginx
  ```
- Check nginx error logs:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```

### Error: "WebSocket closed immediately"
- Check nginx configuration:
  ```bash
  sudo nginx -t
  ```
- Verify proxy settings in `/etc/nginx/sites-available/websocket`

---

## Auto-Renewal Setup

Certbot auto-renews certificates. Verify auto-renewal works:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

---

## Security Recommendations

1. **Firewall Rules**: Only allow ports 80, 443, and SSH (22)
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. **Rate Limiting**: Add to nginx config:
   ```nginx
   limit_req_zone $binary_remote_addr zone=websocket:10m rate=10r/s;
   limit_req zone=websocket burst=20;
   ```

3. **Access Logs**: Monitor WebSocket connections
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

---

## Cost Estimate

### Option 1 (nginx + Let's Encrypt):
- **Cost**: $0 (free SSL)
- **Maintenance**: Low (auto-renewal)

### Option 2 (Lightsail Load Balancer):
- **Cost**: ~$18/month
- **Maintenance**: None (AWS managed)

### Current Lightsail Instance:
- **Instance**: nano_3_0 @ $3.50/month
- **Total with LB**: $21.50/month
- **Total with nginx**: $3.50/month

---

## Recommendation

**Use Option 1 (nginx + Let's Encrypt)** because:
- Free SSL certificates
- Lower cost ($3.50/month vs $21.50/month)
- Full control over configuration
- Fast setup (15 minutes)
- Auto-renewal included

---

## Quick Start Commands

```bash
# 1. Add DNS record for ws.gbautomation.xyz → 44.208.161.19

# 2. SSH into instance
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@44.208.161.19

# 3. Install nginx and certbot
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y

# 4. Create nginx config (copy from Step 4 above)
sudo nano /etc/nginx/sites-available/websocket

# 5. Enable site
sudo ln -s /etc/nginx/sites-available/websocket /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 6. Get SSL certificate
sudo certbot --nginx -d ws.gbautomation.xyz

# 7. Update environment variable
echo "VITE_WS_URL=wss://ws.gbautomation.xyz" > .env.production

# 8. Build and deploy
npm run build && git add . && git commit -m "feat: enable WSS" && git push
```

---

**Status**: Ready to implement
**Estimated Time**: 15-20 minutes
**Difficulty**: Beginner-Intermediate
