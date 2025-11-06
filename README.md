# GB Automation Landing Page

A modern, responsive landing page for GB Automation's Agentic Systems Program built with React, Tailwind CSS, and AWS Amplify.

## Features

- 📱 Fully responsive design
- 🎨 Modern UI with Tailwind CSS
- ⚡ Fast performance with Vite
- 📝 Contact form with AWS Amplify backend
- 🔒 Secure API with DynamoDB storage
- ☁️ Deploy to AWS with one command

## Tech Stack

- **Frontend:** React 19, Tailwind CSS
- **Build Tool:** Vite
- **Backend:** AWS Amplify Gen 2
- **Database:** DynamoDB (via Amplify Data)
- **Hosting:** AWS Amplify Hosting
- **Form Management:** React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+ (preferably 20+)
- npm or pnpm
- AWS Account
- AWS CLI configured

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd gb-automation-landing
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## AWS Amplify Setup

### Deploy to AWS Sandbox (Development)

1. Make sure AWS CLI is configured with your credentials:
```bash
aws configure
```

2. Deploy to AWS Amplify sandbox:
```bash
npm run amplify:sandbox
```

This will:
- Create a DynamoDB table for contact submissions
- Set up a GraphQL API
- Generate API credentials
- Create `amplify_outputs.json` with configuration

### Deploy to Production

For production deployment, you have two options:

#### Option 1: Git-based CI/CD (Recommended)

1. Push your code to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
3. Connect your repository
4. Amplify will automatically build and deploy on every push

#### Option 2: Manual Deployment

```bash
npm run build
npm run amplify:deploy
```

## Project Structure

```
gb-automation-landing/
├── amplify/
│   ├── backend.ts           # Amplify backend definition
│   ├── data/
│   │   └── resource.ts      # Data model (DynamoDB schema)
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── Hero.jsx         # Hero section
│   │   ├── Features.jsx     # Features/deliverables
│   │   ├── Process.jsx      # 90-day process
│   │   ├── Pricing.jsx      # Pricing section
│   │   ├── ContactForm.jsx  # Contact form with validation
│   │   └── Footer.jsx       # Footer
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind imports
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Environment Variables

No environment variables needed! Amplify automatically generates `amplify_outputs.json` with all necessary configuration.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run amplify:sandbox` - Deploy to AWS sandbox environment
- `npm run amplify:deploy` - One-time deployment to AWS

## Data Model

The contact form stores submissions in DynamoDB with the following schema:

```typescript
{
  id: string (auto-generated)
  name: string (required)
  email: string (required)
  company: string (optional)
  phone: string (optional)
  projectDescription: string (required)
  message: string (optional)
  status: enum ["new", "contacted", "qualified", "closed"]
  createdAt: datetime (auto)
  updatedAt: datetime (auto)
}
```

## Customization

### Colors

Edit `tailwind.config.js` to change the color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
    },
  },
}
```

### Content

Update content in the component files:
- `src/components/Hero.jsx` - Hero section text
- `src/components/Features.jsx` - Features and deliverables
- `src/components/Process.jsx` - Process phases
- `src/components/Pricing.jsx` - Pricing details

## Deployment Checklist

- [ ] Update email in `ContactForm.jsx` and `Footer.jsx`
- [ ] Add custom domain in Amplify Console
- [ ] Configure SSL certificate
- [ ] Set up email notifications (optional)
- [ ] Add Google Analytics (optional)
- [ ] Test contact form submissions
- [ ] Check mobile responsiveness
- [ ] Run accessibility audit

## License

Copyright © 2025 GB Automation. All rights reserved.

## Support

For questions or issues, contact greg@gbautomation.xyz
