# GB Automation Landing Page - Deployment Guide

## 🚀 Option 1: AWS Amplify Hosting (Recommended)

### Via AWS Console (Easiest)

1. **Go to AWS Amplify Console**
   - Open https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Deploy without Git**
   - Choose "Deploy without Git provider"
   - Click "Manual deploy"

3. **Upload Build**
   - Drag and drop the `dist` folder OR
   - Click "Choose files" and select the `dist` folder contents
   - App name: `gb-automation-landing`
   - Branch name: `main`

4. **Deploy**
   - Click "Save and deploy"
   - Wait 2-3 minutes for deployment
   - You'll get a URL like: `https://main.xxxxx.amplifyapp.com`

### Via Amplify CLI

```bash
# Initialize Amplify (first time only)
cd gb-automation-landing
amplify init

# Add hosting
amplify add hosting

# Select options:
# - Hosting with Amplify Console
# - Manual deployment

# Publish
amplify publish
```

## 🌐 Option 2: Vercel (Fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd gb-automation-landing
vercel

# Follow prompts, then get instant URL
```

## ☁️ Option 3: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd gb-automation-landing
netlify deploy --prod --dir=dist

# Get instant URL
```

## 🪣 Option 4: AWS S3 + CloudFront (Manual)

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://gb-automation-landing --region us-east-1
```

### Step 2: Enable Static Website Hosting

```bash
aws s3 website s3://gb-automation-landing --index-document index.html --error-document index.html
```

### Step 3: Set Bucket Policy

Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::gb-automation-landing/*"
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy --bucket gb-automation-landing --policy file://bucket-policy.json
```

### Step 4: Upload Files

```bash
cd gb-automation-landing
aws s3 sync dist/ s3://gb-automation-landing --delete
```

### Step 5: Get URL

Your site will be at:
```
http://gb-automation-landing.s3-website-us-east-1.amazonaws.com
```

### Step 6: (Optional) Add CloudFront CDN

```bash
aws cloudfront create-distribution \
  --origin-domain-name gb-automation-landing.s3.amazonaws.com \
  --default-root-object index.html
```

## 🔧 Quick Deploy Script

I've created a script for you: `deploy-aws.sh`

```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

## 📝 Custom Domain (Optional)

### For Amplify:
1. Go to Amplify Console → Your app → Domain management
2. Add your custom domain
3. Follow DNS verification steps

### For S3 + CloudFront:
1. Create CloudFront distribution (see Step 6 above)
2. Add custom domain in Route 53
3. Point CNAME to CloudFront distribution

## 🔐 Environment Variables

If you need to add environment variables:

### Amplify Console:
1. Go to App settings → Environment variables
2. Add variables
3. Redeploy

### Build Time:
Create `.env.production`:
```
VITE_API_URL=https://api.example.com
```

Then rebuild:
```bash
npm run build
```

## ✅ Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] All images render
- [ ] Forms work (if applicable)
- [ ] Mobile responsive
- [ ] SSL certificate active (HTTPS)
- [ ] Custom domain configured (optional)
- [ ] Analytics added (Google Analytics, etc.)

## 🆘 Troubleshooting

### Site shows 403 Error
- Check S3 bucket policy is public
- Verify bucket website hosting is enabled

### CSS Not Loading
- Check build output in `dist/`
- Verify all files uploaded to S3
- Check CloudFront cache (wait or invalidate)

### "Cannot GET /" on routes
- S3: Set error document to `index.html`
- CloudFront: Add custom error response for 404 → 200 → `/index.html`

## 📊 Monitoring

### Amplify
- Go to Amplify Console → Monitoring
- View metrics, logs, and performance

### S3 + CloudFront
- Enable CloudFront logging
- Use CloudWatch for metrics

---

**Need help?** Contact greg@gbautomation.xyz
