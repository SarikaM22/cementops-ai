import axios from 'axios'

const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : ''

export const fetchKPI      = () => axios.get(`${API}/api/kpi`)
export const fetchReadings = (machine='kiln') => axios.get(`${API}/api/readings?machine=${machine}`)
export const fetchAlerts   = () => axios.get(`${API}/api/alerts`)
export const fetchStatus   = () => axios.get(`${API}/api/status`)
export const fetchForecast = () => axios.get(`${API}/api/forecast`)
export const fetchShap     = () => axios.get(`${API}/api/shap`)
export const fetchSummary  = () => axios.get(`${API}/api/summary`)
export const fetchPHM      = () => axios.get(`${API}/api/phm`)
export const downloadReport = () => window.open(`${API}/api/report`, '_blank')
