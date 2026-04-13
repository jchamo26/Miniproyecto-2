import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Loader, AlertTriangle, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InferencePanel({ patientId, onClose }) {
  const [modelType, setModelType] = useState('ML')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [taskId, setTaskId] = useState(null)

  const handleInference = async () => {
    setLoading(true)
    
    try {
      const accessKey = localStorage.getItem('accessKey')
      const permissionKey = localStorage.getItem('permissionKey')
      
      // Mock inference call - in production, call orchestrator
      const response = await fetch('http://localhost:8000/orchestrator/infer', {
        method: 'POST',
        headers: {
          'X-Access-Key': accessKey,
          'X-Permission-Key': permissionKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: patientId,
          model_type: modelType
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTaskId(data.task_id)
        toast.success('✅ Análisis iniciado')
        
        // Poll for results
        pollResults(data.task_id, accessKey, permissionKey)
      }
    } catch (error) {
      toast.error('Error ejecutando análisis')
    } finally {
      setLoading(false)
    }
  }

  const pollResults = async (taskId, accessKey, permissionKey) => {
    let attempts = 0
    const maxAttempts = 30 // 90 seconds with 3s polling

    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/orchestrator/infer/${taskId}`, {
          headers: {
            'X-Access-Key': accessKey,
            'X-Permission-Key': permissionKey
          }
        })

        const data = await response.json()

        if (data.status === 'DONE') {
          setResult(data.result)
          toast.success('✅ Análisis completado')
          return
        } else if (data.status === 'ERROR') {
          toast.error('❌ Error en análisis')
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000) // Poll every 3 seconds
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    poll()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-clinical space-y-4"
    >
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        Panel de Inferencia
      </h2>

      {!result && !taskId && (
        <>
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Tipo de Modelo
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
            >
              <option value="ML">📊 Tabular (ML)</option>
              <option value="DL">🖼️ Imagen (DL)</option>
              <option value="MULTIMODAL">🔗 Multimodal</option>
            </select>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-700 text-sm text-yellow-300">
            ⚠️ Resultado de apoyo diagnóstico. No reemplaza criterio médico.
          </div>

          {/* Execute Button */}
          <button
            onClick={handleInference}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Ejecutar Análisis
              </>
            )}
          </button>
        </>
      )}

      {/* Loading State */}
      {taskId && !result && (
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Loader className="w-8 h-8 text-teal-400" />
          </motion.div>
          <p className="text-slate-300">⏳ Procesando análisis...</p>
          <p className="text-xs text-slate-500 mt-1">ID: {taskId?.slice(0, 8)}...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-900/30 border border-green-700 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-300">✅ Análisis Completado</p>
              <p className="text-sm text-green-200 mt-1">{result.message}</p>
            </div>
          </div>

          {/* Risk Score */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Risk Score</p>
              <p className="text-2xl font-bold">{(result.risk_score * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Categoría</p>
              <p className={`text-2xl font-bold ${
                result.risk_category === 'CRITICAL' ? 'text-red-400' :
                result.risk_category === 'HIGH' ? 'text-orange-400' :
                result.risk_category === 'MEDIUM' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {result.risk_category}
              </p>
            </div>
          </div>

          {/* Alert if Critical */}
          {result.is_critical && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-4 rounded-lg bg-red-900/30 border border-red-700 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">🚨 ALERTA CRÍTICA</p>
                <p className="text-sm text-red-200 mt-1">
                  Este paciente requiere revisión clínica inmediata
                </p>
              </div>
            </motion.div>
          )}

          {/* SHAP/Grad-CAM */}
          {result.shap_values && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="font-semibold mb-2">📊 Explicabilidad (SHAP)</p>
              <div className="space-y-2 text-sm">
                {Object.entries(result.shap_values).slice(0, 5).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}</span>
                    <div className="w-32 h-2 rounded bg-slate-700">
                      <div
                        style={{ width: `${Math.abs(val) * 100}%` }}
                        className="h-full rounded bg-teal-500"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Cerrar Panel
          </button>
        </div>
      )}
    </motion.div>
  )
}
