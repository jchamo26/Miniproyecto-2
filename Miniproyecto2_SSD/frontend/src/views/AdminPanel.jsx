import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('usuarios')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)

  const role = localStorage.getItem('role')

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/dashboard')
      toast.error('Acceso denegado')
      return
    }
    fetchData()
  }, [navigate, role])

  const fetchData = async () => {
    try {
      const accessKey = localStorage.getItem('accessKey')
      const permissionKey = localStorage.getItem('permissionKey')
      
      const response = await fetch('http://localhost:8000/admin/users/', {
        headers: {
          'X-Access-Key': accessKey,
          'X-Permission-Key': permissionKey
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      toast.error('Error cargando datos administrativos')
    }
  }

  const handleExportLogs = async () => {
    try {
      const accessKey = localStorage.getItem('accessKey')
      const permissionKey = localStorage.getItem('permissionKey')
      
      const response = await fetch('http://localhost:8000/admin/audit-log/export?format=csv', {
        headers: {
          'X-Access-Key': accessKey,
          'X-Permission-Key': permissionKey
        }
      })
      
      if (response.ok) {
        toast.success('✅ Logs exportados')
      }
    } catch (error) {
      toast.error('Error exportando logs')
    }
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
        <h1 className="text-3xl font-bold">Panel Administrativo</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        {['usuarios', 'estadísticas', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'usuarios' && '👥 Usuarios'}
            {tab === 'estadísticas' && '📊 Estadísticas'}
            {tab === 'logs' && '🔍 Audit Log'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Usuarios */}
        {activeTab === 'usuarios' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors">
                <Plus className="w-4 h-4" />
                Crear Usuario
              </button>
            </div>

            <div className="card-clinical overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '1', username: 'admin1', role: 'admin', active: true },
                    { id: '2', username: 'dr_garcia', role: 'medico', active: true },
                    { id: '3', username: 'paciente_001', role: 'paciente', active: false }
                  ].map(user => (
                    <tr key={user.id} className="border-b border-slate-800">
                      <td className="px-4 py-3">{user.username}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-slate-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.active ? '✅ Activo' : '❌ Inactivo'}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button className="text-blue-400 hover:text-blue-300">Editar</button>
                        <button className="text-red-400 hover:text-red-300">Desactivar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Estadísticas */}
        {activeTab === 'estadísticas' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: 'Total Pacientes', value: '42', icon: '👥' },
              { label: 'Total Usuarios', value: '8', icon: '🧑' },
              { label: 'Inferencias Hoy', value: '156', icon: '🤖' },
              { label: 'Tasa Aceptación', value: '85%', icon: '✅' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="card-clinical"
              >
                <p className="text-3xl mb-2">{stat.icon}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Audit Log */}
        {activeTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Registro de Auditoría</h2>
              <button
                onClick={handleExportLogs}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            <div className="card-clinical">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[
                  { ts: '2024-04-09 14:30', user: 'dr_garcia', action: 'VIEW_PATIENT', resource: 'Patient#123', result: 'SUCCESS' },
                  { ts: '2024-04-09 14:25', user: 'admin1', action: 'CREATE_USER', resource: 'User#99', result: 'SUCCESS' },
                  { ts: '2024-04-09 14:20', user: 'paciente_001', action: 'LOGIN', resource: 'Auth', result: 'SUCCESS' }
                ].map((log, i) => (
                  <div key={i} className="p-3 rounded bg-slate-800/50 border border-slate-700 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-teal-400">{log.action}</span>
                      <span className="text-xs text-slate-400">{log.ts}</span>
                    </div>
                    <p className="text-slate-300">Usuario: {log.user} | Recurso: {log.resource}</p>
                    <p className="text-xs text-green-400">✅ {log.result}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="footer-clinical">
        <p>Protegido bajo Ley 1581/2012 • Datos cifrados AES-256</p>
      </div>
    </div>
  )
}
