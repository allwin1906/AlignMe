import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/outfit'
import '../index.css'
import { DemoStage } from './DemoStage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoStage />
  </StrictMode>,
)
