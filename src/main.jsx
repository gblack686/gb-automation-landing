import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import amplifyConfig from './amplifyconfiguration.json'
import '@aws-amplify/ui-react/styles.css'
import './index.css'
import App from './App.jsx'

// Configure Amplify once at boot. The tracked scaffold config only carries
// non-secret region metadata so public routes can build and render before
// a real sandbox writes local Cognito outputs.
Amplify.configure(amplifyConfig)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
