import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, LogOut, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('lastVisit')
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 10

  const role = localStorage.getItem('role')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
    
    fetchPatients()
  }, [navigate])

  const fetchPatients = async () => {
    try {
      const accessKey = localStorage.getItem('accessKey')
      const permissionKey = localStorage.getItem('permissionKey')
      
      const response = await fetch(`http://localhost:8000/fhir/Patient?limit=50&offset=0`, {
        headers: {
          'X-Access-Key': accessKey,
          'X-Permission-Key': permissionKey
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPatients(data.entry || [])
      }
    } catch (error) {
      toast.error('Error cargando pacientes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  const handleAdminPanel = () => {
    if (role === 'admin') {
      navigate('/admin')
    } else {
      toast.error('Solo administradores pueden acceder')
    }
  }

  // Filter and search logic
  let filtered = patients
  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.resource?.name?.[0]?.given?.[0]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.resource?.id?.includes(searchTerm)
    )
  }

  const paginatedPatients = filtered.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Clínico</h1>
          <p className="text-slate-400 mt-1">👥 {filtered.length} pacientes | 👤 Rol: {role}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdminPanel}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Panel Administrativo"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-900/30 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="card-clinical mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(0)
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">Todos</option>
          <option value="signed">✅ Firmados</option>
          <option value="pending">🔴 Pendientes</option>
        </select>
      </div>

      {/* Patients Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-clinical overflow-hidden"
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-slate-400">Cargando pacientes...</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Edad</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Estado RiskReport</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Riesgo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => (
                  <motion.tr
                    key={patient.resource?.id}
                    whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
                    className="border-b border-slate-800 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {patient.resource?.id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {patient.resource?.name?.[0]?.given?.[0]} {patient.resource?.name?.[0]?.family}
                    </td>
                    <td className="px-4 py-3">
                      {new Date().getFullYear() - new Date(patient.resource?.birthDate).getFullYear()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-critical">🔴 Pendiente</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-yellow-400">⚠️ Medio</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/patients/${patient.resource?.id}`)}
                        className="px-3 py-1 rounded bg-teal-600 text-white text-xs hover:bg-teal-700 transition-colors"
                      >
                        Abrir
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 rounded bg-slate-800 disabled:bg-slate-900 disabled:text-slate-600 hover:bg-slate-700 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                Página {currentPage + 1} de {Math.ceil(filtered.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filtered.length / itemsPerPage) - 1, currentPage + 1))}
                disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage) - 1}
                className="px-3 py-1 rounded bg-slate-800 disabled:bg-slate-900 disabled:text-slate-600 hover:bg-slate-700 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* Footer */}
      <div className="footer-clinical">
        <p>Protegido bajo Ley 1581/2012 • Datos cifrados AES-256 • Sistema auditado</p>
      </div>
    </div>
  )
}
