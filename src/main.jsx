import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import '@aws-amplify/ui-react/styles.css'
import './index.css'
import App from './App.jsx'

// Configure Amplify once at boot. After running `npx ampx sandbox`,
// amplify_outputs.json is overwritten with real Cognito values.
// Until then, the placeholder file lets the build succeed but
// Authenticator will surface a config error at sign-in time.
Amplify.configure(outputs)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
