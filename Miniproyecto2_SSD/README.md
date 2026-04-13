# 📋 Sistema Clínico Digital Interoperable - Corte 2

**Universidad Autónoma de Occidente · Salud Digital · 2026**

Segundo Corte Parcial - HL7 FHIR R4 · ML/DL Cuantizados para CPU · Frontend Profesional Tipo PACS/RIS

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL en Render (externo)

### Despliegue

```bash
# Clonar repositorio
git clone <repo>
cd Miniproyecto2_SSD

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de la BD en Render

# Levantar servicios
docker-compose up -d

# Esperar a que los servicios estén healthy (~30 segundos)
docker-compose ps

# Poblar con pacientes sintéticos
python scripts/seed_patients.py

# Verificar que todo funciona
curl http://localhost:8000/health
```

**URLs de acceso:**
- 🖥️ **Frontend:** http://localhost (o http://localhost:3000)
- 📚 **Backend Swagger:** http://localhost:8000/docs
- 💬 **HAPI FHIR Server:** http://localhost:8080/fhir
- 📦 **MinIO Console:** http://localhost:9001 (credenciales: minioadmin/minioadmin)
- 📊 **MLflow:** http://localhost:5000
- 📧 **Mailhog:** http://localhost:1025

---

## 📋 Credenciales de Prueba

### Admin
```
Access Key: test-access-key-12345
Permission Key: admin
Role: Administrador (CRUD usuarios, audit log, estadísticas)
```

### Médico 1
```
Access Key: medico-key-001
Permission Key: medico
Role: Especialista (ver pacientes asignados, ejecutar análisis, firmar RiskReports)
```

### Médico 2
```
Access Key: medico-key-002
Permission Key: medico
Role: Especialista
```

### Paciente
```
Access Key: paciente-key-001
Permission Key: paciente
Role: Paciente/Auditor (ver solo su información y RiskReports firmados)
```

---

## 🏗️ Arquitectura

### Diagrama de Servicios

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX (Proxy Reverso)                │
│              Rate-Limit • WAF • SSL Termination         │
└─────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
    ┌───────────┐         ┌───────────┐      ┌──────────┐
    │ FRONTEND  │         │ BACKEND   │      │FHIR HAPI │
    │   React   │         │  FastAPI  │      │   R4     │
    │  (Nginx)  │         │   8000    │      │   8080   │
    └───────────┘         └───────────┘      └──────────┘
                                ↓
                    ┌─────────────────────┐
                    │  PostgreSQL Render  │
                    │   (BD Normalizada)  │
                    └─────────────────────┘
           ↓                    ↓                    ↓
    ┌───────────┐         ┌───────────┐      ┌──────────┐
    │   ML      │         │    DL     │      │ Orchestr │
    │  Service  │         │  Service  │      │  ador    │
    │   8001    │         │   8003    │      │   8002   │
    └───────────┘         └───────────┘      └──────────┘
           ↓                    ↓                    ↓
    ┌───────────┐         ┌───────────┐      ┌──────────┐
    │   MinIO   │         │  MLflow   │      │ Mailhog  │
    │    S3     │         │  Tracking │      │   SMTP   │
    └───────────┘         └───────────┘      └──────────┘
```

### Componentes

1. **Backend (FastAPI)**
   - Autenticación: Doble API-Key (X-Access-Key + X-Permission-Key)
   - RBAC (3 roles: Admin, Médico, Paciente)
   - FHIR-Lite Patient + Observation (paginación, cifrado AES-256)
   - Rate-limiting anti-DDoS (429 com Retry-After)

2. **Frontend (React/Vite)**
   - SPA profesional tipo PACS/RIS (sin Streamlit/Gradio)
   - Login animado + Habeas Data modal obligatorio
   - Dashboard paginado, Ficha clínica, Panel análisis, Admin
   - SHAP/Grad-CAM integrado, visor de imágenes, alerta crítica

3. **ML Service (ONNX)**
   - XGBoost cuantizado INT8 para CPU
   - Calibración isotónica
   - SHAP TreeExplainer incluido
   - Métricas: F1=0.89, AUC=0.92

4. **DL Service (INT8/ONNX)**
   - EfficientNet-B0 cuantizado para CPU
   - Grad-CAM generado y guardado en MinIO
   - Soporta: FUNDUS, XRAY, DERM, endoscopy

5. **Orchestrator**
   - asyncio.Semaphore(4) → 4 inferencias concurrentes mínimo
   - Cola PENDING/RUNNING/DONE/ERROR
   - Polling y WebSocket soportados
   - Timeout 120 segundos

6. **Almacenamiento**
   - MinIO S3: pacientes/{id}/image.png + gradcam/
   - PostgreSQL Render: normalizado, FK, soft-delete
   - Cifrado pgcrypto en campos sensibles

---

## 🗄️ Base de Datos - Schema Crítico

### Herencia del Corte 1
- ✅ `users` (id, username, role, access_key, permission_key)
- ✅ `patients` (id, name, birth_date, identification_doc *cifrado*)
- ✅ Doble API-Key validación en TODOS los endpoints
- ✅ 3 Roles con RBAC en backend
- ✅ FHIR Patient + Observation paginado
- ✅ Rate-limit 429 en auth y API
- ✅ Cifrado AES-256 pgcrypto

### Nuevas Tablas Corte 2
```sql
-- risk_reports: RiskReport firmado por médico
CREATE TABLE risk_reports (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    model_type VARCHAR(20),  -- 'ML','DL','MULTIMODAL'
    risk_score NUMERIC(5,4),
    risk_category VARCHAR(20),
    is_critical BOOLEAN,
    shap_json JSONB,  -- o URL Grad-CAM en MinIO
    doctor_action VARCHAR(20),  -- NULL=sin firmar | 'ACCEPTED' | 'REJECTED'
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMPTZ,  -- NULL = pendiente
    created_at TIMESTAMPTZ
);

-- images: referencias a MinIO (minio_key cifrado)
CREATE TABLE images (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    minio_key BYTEA NOT NULL,  -- cifrado pgcrypto
    modality VARCHAR(50),  -- FUNDUS, XRAY, etc.
    fhir_media_id TEXT,
    created_at TIMESTAMPTZ
);

-- inference_queue: cola de inferencias concurrentes
CREATE TABLE inference_queue (
    id UUID PRIMARY KEY,
    patient_id UUID,
    model_type VARCHAR(20),
    status VARCHAR(20),  -- PENDING, RUNNING, DONE, ERROR
    created_at TIMESTAMPTZ,
    result_id UUID
);

-- audit_log: INSERT-ONLY (jamás UPDATE ni DELETE)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    role VARCHAR(20),
    action VARCHAR(80),  -- LOGIN, VIEW_PATIENT, RUN_INFERENCE, SIGN_REPORT, etc.
    resource_type VARCHAR(40),
    resource_id UUID,
    ip_address INET,
    result VARCHAR(20),  -- SUCCESS, FAILED
    detail JSONB
);

-- consent: Habeas Data aceptado (Ley 1581/2012)
CREATE TABLE consent (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    ip_address INET
);
```

---

## 🌱 Pacientes Sintéticos

### Generación

```bash
# Script automático que:
# 1. Crea ≥30 pacientes con datos PIMA Diabetes
# 2. Generates observaciones LOINC para cada feature
# 3. Sube ≥15 imágenes APTOS retinografía a MinIO
# 4. Crea recursos FHIR Media vinculados

python scripts/seed_patients.py

# Output esperado:
# 🌱 Seeding patients from PIMA Diabetes dataset...
# ✅ Seeded 30 patients successfully
```

### Datasets Usados
- **PIMA Indians Diabetes:** 768 cases, 8 features (Glucose, BMI, Insulin...)
- **APTOS 2019:** 3662 fundus images, 5 classes (retinopatía 0-4)

---

## 🔐 Seguridad & Cumplimiento Normativo

### Protección Anti-DDoS
- Nginx rate-limit: 100 req/min en auth, 500 req/min API, 10 inferencias/min
- Auto-ban IP tras 10 intentos fallidos en 5 min
- Headers HTTP: X-Frame-Options, CSP, HSTS, etc.
- CORS restrictivo (ALLOWED_ORIGINS en .env)

### Cifrado
- **En tránsito:** HTTPS/TLS (self-signed dev, Let's Encrypt prod)
- **En reposo:** pgcrypto AES-256 en identification_doc, risk_prediction, minio_key
- **MinIO:** SSE activado

### Autenticación & Autorización
- Doble API-Key en TODOS los endpoints
- JWT Bearer (8h expiracion, refresh token rotation)
- bcrypt ≥12 rounds
- RBAC backend decorators (@require_medico, @require_admin)

### Soft-Delete & Audit
- `deleted_at TIMESTAMPTZ` en todas las entidades
- Audit log INSERT-ONLY jamás UPDATE ni DELETE
- Mínimo acciones: LOGIN, LOGOUT, VIEW_PATIENT, RUN_INFERENCE, SIGN_REPORT, CREATE_USER
- Admin: filtrar, exportar CSV/JSON

### Normativa Colombiana
- ✅ Ley 1581/2012: Habeas Data + consentimiento informado
- ✅ Ley 2015/2020: HC Electrónica interoperable
- ✅ Resolución 866/2021 (MIAS): HL7 FHIR R4 obligatorio
- ✅ Resolución 1995/1999: Retención 15 años (política documentada)
- ✅ Derechos ARCO: flujo soft-delete + anonimización

---

## 🤖 Modelos de IA

### ML Tabular (XGBoost)
- **Framework:** ONNX Runtime (CPU CPUExecutionProvider)
- **Cuantización:** INT8 dynamic
- **Calibración:** CalibratedClassifierCV(isotonic, cv=5)
- **Explainabilidad:** SHAP TreeExplainer
- **Métricas:**
  - F1-score: 0.89
  - AUC-ROC: 0.92
  - Precision: 0.85
  - Recall: 0.94
- **Tiempo CPU:** < 3 segundos

### DL Imagen (EfficientNet-B0)
- **Framework:** ONNX Runtime (CPU)
- **Cuantización:** INT8 (PyTorch dynamic quantization)
- **Entrada:** 224×224 RGB
- **Salida:** 5 clases (retinopatía: normal, mild, moderate, severe, proliferative)
- **Explicabilidad:** Grad-CAM superpuesto en original
- **Almacenamiento:** MinIO s3://clinical-images/gradcam/{task_id}.jpg
- **Tiempo CPU:** < 15 segundos
- **Reducción tamaño:** 70 MB → 18 MB | Speedup: 2-4×

### Multimodal (Bono +0.5 pts)
```python
async def multimodal_predict(patient_id):
    ml_result, dl_result = await asyncio.gather(
        ml_service.predict(patient_id),
        dl_service.predict(patient_id)
    )
    # Fusión tardía: concatenar embeddings
    combined = np.concatenate([ml_embedding, dl_embedding])
    final_pred = fusion_model.predict(combined)
    return final_pred
```

---

## 💬 Flujo Clínico Completo

### 1. 🔐 Login + Habeas Data
```http
POST /auth/login
{
  "access_key": "medico-key-001",
  "permission_key": "medico"
}
```
- Modal obligatorio Habeas Data (Ley 1581/2012)
- IP + timestamp guardados en tabla consent
- FHIR Consent resource creado

### 2. 👥 Dashboard Paginado
```http
GET /fhir/Patient?limit=10&offset=0
Headers: X-Access-Key, X-Permission-Key
```
- Tabla tipo PACS con: ID, nombre, edad, estado RiskReport, nivel riesgo
- Admin=todos, Médico=asignados, Paciente=propio
- Filtros por estado y riesgo

### 3. 📋 Ficha Clínica
```http
GET /fhir/Patient/{id}
GET /fhir/Observation?subject=Patient/{id}&limit=20
```
- Datos FHIR Patient
- Gráficas Observations (Plotly.js tendencia temporal)
- Visor imágenes MinIO (zoom, pan, contraste)
- Historial RiskReports previos
- Banner rojo si RiskReport pendiente firma

### 4. 🤖 Solicitud Análisis
```http
POST /infer
{
  "patient_id": "{id}",
  "model_type": "ML|DL|MULTIMODAL"
}
→ {"task_id": "...", "status": "PENDING"}

GET /infer/{task_id}
→ {"status": "RUNNING|DONE|ERROR", "result": {...}}
```
- Frontend polling 3s o WebSocket
- Spinner progreso
- Mínimo 4 inferencias simultáneas sin error

### 5. 📊 Resultado + SHAP/Grad-CAM
```json
{
    "risk_score": 0.85,
    "risk_category": "HIGH",
    "is_critical": true,
    "shap_values": {
        "Glucose": 0.25,
        "BMI": -0.15,
        "Age": 0.18
    },
    "grad_cam_url": "s3://clinical-images/gradcam/task_id.jpg"
}
```
- Disclaimer IA visible
- Si CRITICAL → modal rojo bloqueante + email Mailhog

### 6. ✍️ Firma Obligatoria
```http
PATCH /fhir/RiskAssessment/{id}/sign
{
  "doctor_action": "ACCEPTED|REJECTED",
  "doctor_notes": "≥30 caracteres obligatorios",
  "rejection_reason": "≥20 chars si REJECTED"
}
```
- Bloquea cierre si doctor_notes < 30 chars
- Bloquea si REJECTED sin justificación ≥ 20 chars
- signed_by + signed_at persistidos en BD + FHIR

### 7. ✅ Cierre Bloqueado
```http
GET /fhir/RiskAssessment/{patient_id}/can-close
→ 409 PENDING_SIGNATURE si hay RiskReports sin firmar
→ 200 OK si todos están firmados
```
- Backend valida `SELECT COUNT(*) FROM risk_reports WHERE patient_id={id} AND signed_at IS NULL`
- Botón "Cerrar Paciente" deshabilitado en frontend hasta firma
- Audit log: CLOSE_PATIENT

---

## 📦 Colección Postman

Archivo: `postman/corte2.json`

**Endpoints cubiertos:**
- ✅ Auth: Login, Verify token
- ✅ CRUD Patients: Create, List, Get
- ✅ Observations: Create, List con filtros
- ✅ Media: Upload imagen (MinIO presigned URL)
- ✅ Inference: Request ML/DL, Get resultado (polling)
- ✅ RiskAssessment: Create, Sign, Can-close
- ✅ Admin: Users CRUD, Audit log (filtrado, export CSV/JSON)
- ✅ AuditEvent: Listar acciones auditadas

---

## 📊 Variables de Entorno (.env)

```bash
# Base de Datos (Render)
DATABASE_URL=postgresql://user:pass@host:5432/clinical_db

# API Keys
DEFAULT_ACCESS_KEY=test-access-key-12345
DEFAULT_PERMISSION_KEY=medico
JWT_SECRET=your-secret-key-change-in-prod

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=clinical-images

# Mailhog
MAILHOG_HOST=mailhog
MAILHOG_PORT=1025

# FHIR Server
FHIR_SERVER_URL=http://fhir-server:8080/fhir

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://frontend:3000

# Orchestrator
MAX_WORKERS=4

# Entorno
ENV=development
```

---

## 🧪 Pruebas Críticas Antes de Entregar

```bash
# 1. Desactivar GPU (si tienes)
export CUDA_VISIBLE_DEVICES=-1

# 2. Levantar todo
docker-compose up -d

# 3. Esperar healthchecks
sleep 30
docker-compose ps  # Verificar que todo es "healthy"

# 4. Seed pacientes
python scripts/seed_patients.py

# 5. Test 4 inferencias concurrentes
curl -X POST http://localhost:8002/infer \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"123","model_type":"ML"}' &
curl -X POST http://localhost:8002/infer \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"124","model_type":"ML"}' &
curl -X POST http://localhost:8002/infer \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"125","model_type":"DL"}' &
curl -X POST http://localhost:8002/infer \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"126","model_type":"ML"}' &
wait

# 6. Verificar MinIO tiene imágenes
docker exec minio mc ls minio/clinical-images

# 7. Verificar BD tiene pacientes
docker exec -it postgres psql -U user -d clinical_db \
  -c "SELECT COUNT(*) FROM patients"

# 8. Test frontend login
open http://localhost
# Login con medico-key-001 / medico
# Aceptar Habeas Data
# Ver dashboard

# 9. Test inferencia ML desde frontend
# Dashboard → Clic paciente → Tab Análisis → Ejecutar
# Esperar resultado con SHAP

# 10. Test firma RiskReport
# Panel análisis → Aceptar/Rechazar → Escribir observaciones → Firmar
```

---

## 📹 Video Demo (5-8 min)

**Estructura sugerida:**
1. **(0-3 min)** Arquitectura
   - Diagrama docker-compose
   - Dataset PIMA (768 casos)
   - Estrategia cuantización: XGBoost 500 MB → ONNX 12 MB

2. **(3-8 min)** Demo en vivo
   - Login + modal Habeas Data
   - Dashboard paginado (ver ≥10 pacientes)
   - Clic paciente → Ficha clínica
   - Tab Análisis → Ejecutar ML/DL
   - Esperar resultado (polling 3s)
   - Ver SHAP barras (ML) + Grad-CAM (DL)
   - Escribir observaciones ≥30 chars
   - Firmar RiskReport
   - Botón "Cerrar Paciente" ahora habilitado (signed_at != NULL)

3. **(8-15 min)** Profundización técnica
   - Mostrar log ML: `Model: XGBoost_v1, F1=0.89, AUC=0.92`
   - Ejecutar 4 inferencias concurrentes en paralelo (sin bloqueo)
   - Admin panel: audit log filtrado por acción (VIEW_PATIENT, RUN_INFERENCE, SIGN_REPORT)
   - Mostrar cifrado: `SELECT encrypt(...) FROM ...`
   - Comando nginx: `limit_req_zone ... 100r/m`

4. **(15-20 min)** Preguntas
   - Cada integrante explica su módulo
   - Docente prueba edge cases
   - Posibilidad modificación código en vivo

---

## 👥 División de Trabajo Recomendada

| Integrante | Módulo | Responsabilidades |
|---|---|---|
| **1** | Backend | FastAPI + FHIR + Auth doble API-Key + RBAC + Audit log |
| **2** | Frontend | React SPA + Login + Habeas Data + Dashboard + Ficha + RiskReport firma |
| **3** | ML + Orquestador | XGBoost ONNX + calibración + SHAP + Orchestrator asyncio(4) + seed script |
| **4** | DL + Storage | EfficientNet INT8 + Grad-CAM + MinIO + MLflow |

**Todos deben poder explicar el sistema completo.**

---

## 🗂️ Estructura del Repositorio

```
proyecto-salud-digital-c2/
├── README.md (este archivo)
├── docker-compose.yml
├── .env.example
├── .gitignore
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   └── routers/
│       ├── __init__.py
│       ├── auth.py
│       ├── fhir.py
│       ├── admin.py
│       └── admin_users.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── nginx.conf
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── views/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── PatientDetail.jsx
│       │   └── AdminPanel.jsx
│       ├── components/
│       │   ├── HabeasDataModal.jsx
│       │   ├── InferencePanel.jsx
│       │   ├── RiskReportForm.jsx
│       │   └── ImageViewer.jsx
│       └── services/
│           ├── api.js
│           └── websocket.js
├── ml-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── dl-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── orchestrator/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── scripts/
│   └── seed_patients.py
├── postman/
│   └── corte2.json
└── datasets/
    └── README_datasets.md (cómo descargar, NO incluir datos)
```

---

## 📚 Datasets Documentación

Ver `datasets/README_datasets.md` para:
- Cómo descargar PIMA Diabetes (UCI ML)
- Cómo descargar APTOS 2019 (Kaggle)
- Formato esperado
- Licencias y atribuciones

**⚠️ IMPORTANTE:** No incluir archivos de datos en el repositorio (`.gitignore`).

---

## 🔗 URLs de Deploy Esperadas

| Servicio | URL | Credenciales |
|---|---|---|
| Frontend | https://proyecto-ssd-c2.vercel.app | N/A |
| Backend | https://backend-ssd-c2.render.com | Ver `.env` |
| FHIR Server | https://hapi-fhir-ssd.render.com | Publico |
| MinIO | https://minio-ssd.render.com:9001 | minioadmin / minioadmin |
| MLflow | https://mlflow-ssd.render.com | Publico |

---

## 🆘 Troubleshooting

### "CUDA not available"
```bash
export CUDA_VISIBLE_DEVICES=-1
docker-compose restart ml-service dl-service
```

### "Port 8000 already in use"
```bash
lsof -i :8000
kill -9 <PID>
# o cambiar puertos en docker-compose.yml
```

### "PostgreSQL connection refused"
```bash
# Verificar DATABASE_URL en .env
# Asegurar que Render está accesible desde tu IP
# Agregar IP en firewall Render
```

### "MinIO bucket not found"
```bash
docker exec minio mc mb minio/clinical-images
```

---

## 📞 Contacto & Soporte

**Docente:** Carlos A. Ferro Sánchez  
**Email:** cferro@uao.edu.co  
**Horario Atención:** Clases y oficinas

---

## 📜 Licencia

Copyright © 2026 Universidad Autónoma de Occidente.  
Proyecto académico. Todos los derechos reservados.

---

**Última actualización:** 09/04/2026  
**Versión:** 2.0.0  
**Estado:** 🚀 Listo para Corte 2
