# Flujos n8n — Sara Medical

## Flujo 1: `flujo1-landing-whatsapp.json`
Recibe el lead desde la landing page y envía notificación WhatsApp via Evolution API.

**Nodos:** Webhook → Set (armar mensaje) → HTTP Request (Evolution API)

**Antes de importar, reemplaza:**
- `TU_EVO_API` → URL de tu Evolution API (ej: `http://192.168.1.10:8080`)
- `TU_INSTANCIA` → nombre de tu instancia en Evolution API
- `TU_APIKEY` → API key de Evolution API
- `TU_DOMINIO` → dominio de Sara Medical (ej: `https://sara.vercel.app`)

**Después de activar el flujo:**
- Copia la URL del webhook de n8n
- Agrégala en Vercel como variable de entorno: `N8N_LEAD_NOTIFY_URL`

---

## Flujo 2: `flujo2-meta-leads.json`
Captura leads de Facebook/Instagram Lead Ads, los guarda en Sara Medical y envía WhatsApp.

**Nodos:** Facebook Lead Ads Trigger → Set (normalizar) → HTTP Request (Sara API) + HTTP Request (Evolution API)

**Antes de importar, reemplaza:**
- `TU_EVO_API`, `TU_INSTANCIA`, `TU_APIKEY` → igual que Flujo 1
- `TU_DOMINIO` → igual que Flujo 1
- `TU_LEADS_WEBHOOK_SECRET` → el secret generado con `openssl rand -hex 32`
- `TU_PAGE_ID` → ID de tu página de Facebook
- `TU_FORM_ID` → ID del formulario de Lead Ads
- `TU_CREDENTIAL_ID` → lo asigna n8n al conectar tu cuenta Meta

**Variables de entorno necesarias en Vercel:**
```
N8N_LEAD_NOTIFY_URL=https://tu-n8n.com/webhook/landing-lead-notify
LEADS_WEBHOOK_SECRET=tu_secret_aqui
```
