import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import './owner.css'
import { OwnerApp } from './OwnerApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OwnerApp />
  </StrictMode>,
)
