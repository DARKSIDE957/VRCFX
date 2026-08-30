import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { setupNativeBridge } from './utils/native-bridge'
import './index.css'

setupNativeBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
