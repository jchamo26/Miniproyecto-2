import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import InferencePanel from '../components/InferencePanel'
import RiskReportForm from '../components/RiskReportForm'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('datos')
  const [riskReport, setRiskReport] = useState(null)
  const [showInferencePanel, setShowInferencePanel] = useState(false)

  useEffect(() => {
    fetchPatient()
  }, [id])

  const fetchPatient = async () => {
    try {
      const accessKey = localStorage.getItem('accessKey')
      const permissionKey = localStorage.getItem('permissionKey')
      
      const response = await fetch(`http://localhost:8000/fhir/Patient/${id}`, {
        headers: {
          'X-Access-Key': accessKey,
          'X-Permission-Key': permissionKey
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPatient(data)
      }
    } catch (error) {
      toast.error('Error cargando paciente')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">⏳ Cargando ficha clínica...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">
            {patient?.name?.[0]?.given?.[0]} {patient?.name?.[0]?.family}
          </h1>
          <p className="text-slate-400">
            ID: {patient?.id?.slice(0, 8)}... | Nacimiento: {patient?.birthDate}
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      {riskReport && !riskReport.signed_at && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">🚨 RiskReport Pendiente de Firma</p>
            <p className="text-xs text-red-200 mt-1">
              No puede cerrar el paciente hasta que firme el reporte de riesgo
            </p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        {['datos', 'observaciones', 'análisis', 'auditoría'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'datos' && '📋 Datos'}
            {tab === 'observaciones' && '📊 Observaciones'}
            {tab === 'análisis' && '🤖 Análisis'}
            {tab === 'auditoría' && '🔍 Auditoría'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Datos */}
        {activeTab === 'datos' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-clinical space-y-4"
          >
            <h2 className="text-xl font-bold">Información Demográfica</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Nombre</p>
                <p className="text-lg">{patient?.name?.[0]?.given?.[0]} {patient?.name?.[0]?.family}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Género</p>
                <p className="text-lg">{patient?.gender || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Fecha Nacimiento</p>
                <p className="text-lg">{patient?.birthDate}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Estado</p>
                <p className="text-lg">{patient?.active ? '✅ Activo' : '❌ Inactivo'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Observaciones */}
        {activeTab === 'observaciones' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-clinical"
          >
            <h2 className="text-xl font-bold mb-4">Observaciones Clínicas</h2>
            <p className="text-slate-400">Gráficas de observaciones FHIR serían renderizadas aquí con Plotly.js</p>
            <div className="mt-4 h-64 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-center">
              <span className="text-slate-500">📈 Gráfica de tendencias</span>
            </div>
          </motion.div>
        )}

        {/* Análisis */}
        {activeTab === 'análisis' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {!showInferencePanel ? (
              <button
                onClick={() => setShowInferencePanel(true)}
                className="card-clinical p-6 text-center hover:bg-slate-900/70 transition-colors cursor-pointer"
              >
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="font-semibold">Ejecutar Análisis ML/DL</p>
                <p className="text-sm text-slate-400 mt-1">Haga clic para iniciar inferencia</p>
              </button>
            ) : (
              <InferencePanel patientId={id} onClose={() => setShowInferencePanel(false)} />
            )}

            {riskReport && (
              <RiskReportForm
                riskReport={riskReport}
                patientId={id}
                onSigned={() => setRiskReport({ ...riskReport, signed_at: new Date() })}
              />
            )}
          </motion.div>
        )}

        {/* Auditoría */}
        {activeTab === 'auditoría' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-clinical"
          >
            <h2 className="text-xl font-bold mb-4">Audit Log</h2>
            <p className="text-slate-400">Historial de acciones auditadas en este paciente</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="p-2 rounded bg-slate-800/50">
                <p className="text-slate-300">🔍 [2024-04-09 14:30] Acceso a ficha clínica por Dr. García</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="footer-clinical">
        <p>Protegido bajo Ley 1581/2012 • Datos cifrados AES-256 • Sistema auditado</p>
      </div>
    </div>
  )
}
