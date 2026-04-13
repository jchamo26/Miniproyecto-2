import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff } from 'lucide-react'
import HabeasDataModal from '../components/HabeasDataModal'

export default function Login() {
  const navigate = useNavigate()
  const [accessKey, setAccessKey] = useState('')
  const [permissionKey, setPermissionKey] = useState('medico')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [habeasAccepted, setHabeasAccepted] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!habeasAccepted) {
      toast.error('Debe aceptar la política de Habeas Data')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          permission_key: permissionKey
        })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('role', data.role)
        localStorage.setItem('accessKey', accessKey)
        localStorage.setItem('permissionKey', permissionKey)
        toast.success('✅ Autenticación exitosa')
        navigate('/dashboard')
      } else {
        toast.error('❌ Credenciales inválidas')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <HabeasDataModal onAccept={() => setHabeasAccepted(true)} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-effect p-8 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-4"
            >
              <Lock className="w-12 h-12 text-teal-400" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Sistema Clínico Digital
            </h1>
            <p className="text-slate-400">HL7 FHIR R4 • Interoperable</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Access Key */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Access Key
              </label>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Ingrese su API key"
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                required
              />
            </div>

            {/* Permission Key */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Rol
              </label>
              <select
                value={permissionKey}
                onChange={(e) => setPermissionKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-teal-500 transition-colors"
              >
                <option value="admin">👑 Administrador</option>
                <option value="medico">🩺 Médico Especialista</option>
                <option value="paciente">👤 Paciente/Auditor</option>
              </select>
            </div>

            {/* Habeas Data Checkbox */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <input
                type="checkbox"
                checked={habeasAccepted}
                onChange={(e) => setHabeasAccepted(e.target.checked)}
                className="mt-1"
                id="habeas"
              />
              <label htmlFor="habeas" className="text-xs text-slate-300">
                Acepto la política de privacidad y Habeas Data (Ley 1581/2012)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !habeasAccepted}
              className="w-full py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
            >
              {loading ? '⏳ Autenticando...' : '🔓 Iniciar Sesión'}
            </button>
          </form>

          {/* Footer */}
          <div className="footer-clinical">
            <p>Protegido bajo Ley 1581/2012 • Datos cifrados AES-256</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
