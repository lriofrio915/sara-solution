# MedSara - Plataforma Médica Inteligente

**MedSara** es un SaaS médico multi-tenant construido para la Dra. Stéfanny Medrano, especialista en Medicina Interna. Combina gestión clínica moderna con Sara, una asistente médica IA disponible 24/7.

> **Dominio**: [consultorio.site](https://consultorio.site)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL via Supabase |
| ORM | Prisma |
| Autenticación | Supabase Auth |
| IA | OpenRouter + DeepSeek Chat v3 |
| Pagos | Stripe |
| Deploy | Vercel (recomendado) |

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── (public)/          # Landing pages públicas
│   │   └── page.tsx       # Landing page de la Dra. Medrano
│   ├── (auth)/            # Autenticación
│   │   ├── layout.tsx     # Layout con branding
│   │   ├── login/         # Inicio de sesión
│   │   └── register/      # Registro de doctor
│   ├── (doctor)/          # Panel médico (protegido)
│   │   ├── layout.tsx     # Sidebar de navegación
│   │   ├── dashboard/     # Resumen y estadísticas
│   │   ├── patients/      # Gestión de pacientes
│   │   ├── appointments/  # Gestión de citas
│   │   └── sara/          # Chat con Sara IA
│   ├── (patient)/         # Portal del paciente
│   │   └── dashboard/     # Panel del paciente
│   └── api/
│       └── sara/          # API routes del agente Sara
│           ├── route.ts   # Endpoint principal
│           └── tools/     # Handlers de tools de Sara
├── components/
│   ├── ui/                # Componentes base reutilizables
│   └── sara/              # Componentes del agente Sara
├── lib/
│   ├── sara.ts            # Lógica del agente Sara (OpenRouter)
│   ├── prisma.ts          # Cliente Prisma singleton
│   ├── utils.ts           # Utilidades compartidas
│   └── supabase/          # Clientes Supabase (client/server)
├── types/
│   └── index.ts           # Tipos TypeScript del proyecto
└── prisma/
    └── schema.prisma      # Schema de base de datos completo
```

---

## Modelos de Base de Datos

### Doctor
Representa a un médico en el sistema (multi-tenant: cada doctor tiene su espacio aislado).
- `slug`: Identificador único para URL (ej: `dra-medrano`)
- `plan`: Plan de suscripción (FREE, BASIC, PRO, ENTERPRISE)
- `authId`: Vincula con usuario de Supabase Auth

### Patient
Pacientes de un doctor específico.
- Soporte para alergias (array), tipo de sangre, fecha de nacimiento
- Identificación por cédula/pasaporte

### Appointment
Citas médicas con soporte para múltiples tipos:
- `IN_PERSON`: Presencial
- `TELECONSULT`: Videollamada
- `HOME_VISIT`: Domicilio
- `EMERGENCY`: Emergencia
- `FOLLOW_UP`: Seguimiento

### MedicalRecord
Historia clínica con signos vitales (JSON), síntomas y adjuntos.

### Prescription
Recetas digitales con lista de medicamentos (JSON con dosis/frecuencia/duración).

### SaraConversation
Historial de conversaciones con la IA, vinculadas opcionalmente a un paciente.

### Reminder
Recordatorios con prioridades y categorías.

### SocialPost
Gestión de publicaciones en redes sociales para marketing médico.

---

## Agente Sara

Sara es la asistente IA de MedSara, powered por DeepSeek Chat v3 via OpenRouter.

### Tools disponibles

| Tool | Descripción |
|------|-------------|
| `register_patient` | Registra un nuevo paciente |
| `schedule_appointment` | Agenda una cita médica |
| `get_patient_record` | Obtiene el historial de un paciente |
| `update_medical_record` | Crea/actualiza un registro médico |
| `create_prescription` | Crea una receta digital |
| `create_reminder` | Crea un recordatorio |
| `search_patients` | Busca pacientes en el sistema |

### Flujo del agente

```
Usuario → API /api/sara → askSara() → OpenRouter (DeepSeek)
                                           ↓
                              Sara decide qué tools usar
                                           ↓
                          Tool calls → /api/sara/tools/{tool}
                                           ↓
                              Resultado → respuesta final
```

---

## Configuración Inicial

### 1. Clonar y preparar

```bash
git clone [repo]
cd stefanny-medrano
npm install
cp .env.example .env
```

### 2. Configurar variables de entorno

Edita `.env` con tus credenciales:

- **Supabase**: Crea un proyecto en [supabase.com](https://supabase.com)
- **OpenRouter**: Crea cuenta en [openrouter.ai](https://openrouter.ai)
- **Stripe**: Crea cuenta en [stripe.com](https://stripe.com)

### 3. Inicializar la base de datos

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push

# Opcional: abrir Prisma Studio
npm run db:studio
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Rutas de la Aplicación

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page de la Dra. Medrano | Público |
| `/login` | Inicio de sesión | Público |
| `/register` | Registro de nuevo doctor | Público |
| `/dashboard` | Panel principal del doctor | Protegido |
| `/patients` | Lista de pacientes | Protegido |
| `/patients/new` | Registrar nuevo paciente | Protegido |
| `/patients/[id]` | Perfil de paciente | Protegido |
| `/appointments` | Calendario de citas | Protegido |
| `/appointments/new` | Nueva cita | Protegido |
| `/sara` | Chat con Sara IA | Protegido |
| `/patient/dashboard` | Portal del paciente | Paciente |

---

## Planes de Suscripción

| Plan | Precio | Pacientes | Citas/mes | Sara IA |
|------|--------|-----------|-----------|---------|
| FREE | $0 | 20 | 50 | Básica |
| BASIC | $29/mes | 200 | 500 | Completa |
| PRO | $79/mes | Ilimitado | Ilimitado | + Recetas PDF |
| ENTERPRISE | Custom | Ilimitado | Ilimitado | + API acceso |

---

## Desarrollo

### Comandos útiles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # Linting
npm run db:studio  # Prisma Studio (UI para BD)
npm run db:migrate # Crear migración nueva
```

### Implementar herramientas de Sara

Para conectar Sara con la base de datos real, implementa los handlers en:
```
src/app/api/sara/tools/[tool-name]/route.ts
```

Cada handler debe:
1. Validar el `doctorId` con Supabase Auth
2. Ejecutar la operación con Prisma
3. Retornar `{ success: true, data: {...} }` o `{ success: false, error: "..." }`

---

## Arquitectura Multi-tenant

Cada médico en MedSara tiene datos completamente aislados por `doctorId`:
- Todos los modelos incluyen `doctorId` como campo obligatorio
- Las queries siempre filtran por `doctorId` del usuario autenticado
- No hay riesgo de filtración de datos entre doctors

---

## Seguridad

- Autenticación via Supabase Auth (JWT)
- Row Level Security (RLS) en Supabase para aislamiento de datos
- Variables de entorno para todas las credenciales
- Validación de inputs con Zod en API routes
- HTTPS enforced en producción

---

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configura las variables de entorno en el dashboard de Vercel.

---

## Créditos

- **Doctora**: Dra. Stéfanny Medrano - Especialista en Medicina Interna
- **Asistente IA**: Sara (powered by DeepSeek via OpenRouter)
- **Desarrollo**: [Nexus Solutions](https://nexus-ia.com.es/) - Web & Automatizaciones

---

*MedSara - Transformando la práctica médica con inteligencia artificial*
