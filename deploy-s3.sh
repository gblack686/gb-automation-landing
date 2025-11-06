#!/bin/bash

# GB Automation Landing Page - S3 Deployment Script
# This script deploys the built site to AWS S3

set -e  # Exit on error

# Configuration
BUCKET_NAME="gb-automation-landing-$(date +%s)"
REGION="us-east-1"
BUILD_DIR="dist"

echo "🚀 GB Automation Landing Page Deployment"
echo "=========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if build exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "📦 Building project..."
    npm run build
else
    echo "✅ Build directory exists"
fi

echo ""
echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION

echo ""
echo "⚙️  Configuring bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document index.html

echo ""
echo "🔓 Setting public read policy..."
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json

echo ""
echo "📤 Uploading files to S3..."
aws s3 sync $BUILD_DIR/ s3://$BUCKET_NAME \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "*.html" \
    --exclude "*.txt"

# Upload HTML files with no-cache
aws s3 sync $BUILD_DIR/ s3://$BUCKET_NAME \
    --delete \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "*.txt" \
    --content-type "text/html"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your site is now live at:"
echo "http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""
echo "📝 To use a custom domain:"
echo "1. Create a CloudFront distribution pointing to this S3 bucket"
echo "2. Add your domain in Route 53"
echo "3. Point CNAME to the CloudFront distribution"
echo ""
echo "💾 Bucket name saved to: .deployment-info"
echo "$BUCKET_NAME" > .deployment-info
