import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const container = document.getElementById('admin-root')
if (!container) throw new Error('Elemento #admin-root não encontrado')

createRoot(container).render(<App />)
