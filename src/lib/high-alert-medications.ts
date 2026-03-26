/**
 * high-alert-medications.ts
 *
 * Lista de medicamentos de alto riesgo adaptada al contexto ecuatoriano.
 * Basada en: ISMP (Institute for Safe Medication Practices) High-Alert Medications 2024
 * y el Cuadro Nacional de Medicamentos Básicos (CNMB) de Ecuador.
 *
 * Requisito normativo: Buenas prácticas de seguridad del paciente (ACESS)
 */

export interface HighAlertMedication {
  dciPatterns: string[]   // Fragmentos del DCI a buscar (lowercase)
  category: string        // Categoría ISMP
  warning: string         // Mensaje de advertencia
  level: 'critical' | 'high'
}

export const HIGH_ALERT_MEDICATIONS: HighAlertMedication[] = [
  // ── Anticoagulantes y antitrombóticos ──────────────────────────────────────
  {
    dciPatterns: ['warfarina', 'warfarin'],
    category: 'Anticoagulante',
    warning: 'ALTO RIESGO: Rango terapéutico estrecho. Requiere monitoreo de INR. Riesgo de hemorragia grave.',
    level: 'critical',
  },
  {
    dciPatterns: ['heparina', 'heparin'],
    category: 'Anticoagulante',
    warning: 'ALTO RIESGO: Verificar dosis (unidades vs mg). Riesgo de sangrado. Nunca usar "U" como abreviatura.',
    level: 'critical',
  },
  {
    dciPatterns: ['enoxaparina', 'enoxaparin', 'dalteparina', 'fondaparinux'],
    category: 'Anticoagulante HBPM',
    warning: 'ALTO RIESGO: Heparina de bajo peso molecular. Ajuste renal obligatorio. Riesgo de hemorragia.',
    level: 'critical',
  },
  {
    dciPatterns: ['rivaroxaban', 'apixaban', 'dabigatran', 'edoxaban'],
    category: 'Anticoagulante oral directo',
    warning: 'ALTO RIESGO: Anticoagulante oral directo. Sin antídoto estándar disponible en todos los casos.',
    level: 'critical',
  },

  // ── Insulinas ──────────────────────────────────────────────────────────────
  {
    dciPatterns: ['insulina', 'insulin'],
    category: 'Insulina',
    warning: 'ALTO RIESGO: Nunca usar "U" (usar "unidades"). Verificar tipo (NPH vs rápida vs glargina). Riesgo de hipoglicemia grave.',
    level: 'critical',
  },

  // ── Opioides ──────────────────────────────────────────────────────────────
  {
    dciPatterns: ['morfina', 'morphine', 'fentanilo', 'fentanyl', 'oxicodona', 'oxycodone', 'tramadol', 'meperidina', 'codeína', 'codeine', 'metadona', 'methadone', 'hidrocodona', 'buprenorfina'],
    category: 'Opioide',
    warning: 'ALTO RIESGO: Opioide — riesgo de depresión respiratoria, dependencia. Verificar dosis y vía cuidadosamente.',
    level: 'critical',
  },

  // ── Electrolitos concentrados ──────────────────────────────────────────────
  {
    dciPatterns: ['cloruro de potasio', 'kcl', 'potasio concentrado'],
    category: 'Electrolito concentrado',
    warning: 'ALTO RIESGO: KCl IV concentrado puede causar paro cardíaco. NUNCA administrar sin diluir.',
    level: 'critical',
  },
  {
    dciPatterns: ['cloruro de sodio hipertónico', 'nacl 3%', 'nacl hipertónico'],
    category: 'Electrolito concentrado',
    warning: 'ALTO RIESGO: Solución salina hipertónica. Riesgo de mielinólisis osmótica si se corrige rápido.',
    level: 'critical',
  },

  // ── Citostáticos / Quimioterapia ────────────────────────────────────────────
  {
    dciPatterns: ['metotrexato', 'methotrexate', 'ciclofosfamida', 'cisplatino', 'carboplatino', 'paclitaxel', 'docetaxel', 'doxorrubicina', 'vincristina', 'capecitabina', 'fluorouracilo', '5-fu'],
    category: 'Citostático',
    warning: 'ALTO RIESGO: Agente citostático. Requiere protocolo oncológico. Dosis basada en superficie corporal (m²).',
    level: 'critical',
  },

  // ── Hipoglicemiantes orales ────────────────────────────────────────────────
  {
    dciPatterns: ['glibenclamida', 'glipizida', 'glimepirida', 'gliclazida', 'clorpropamida'],
    category: 'Sulfonilurea',
    warning: 'ALTO RIESGO: Sulfonilurea — riesgo de hipoglicemia prolongada especialmente en adultos mayores y IRC.',
    level: 'high',
  },

  // ── Digoxina ──────────────────────────────────────────────────────────────
  {
    dciPatterns: ['digoxina', 'digoxin'],
    category: 'Glucósido cardíaco',
    warning: 'ALTO RIESGO: Margen terapéutico estrecho. Monitorear niveles séricos y función renal. Múltiples interacciones.',
    level: 'critical',
  },

  // ── Litio ────────────────────────────────────────────────────────────────
  {
    dciPatterns: ['litio', 'lithium', 'carbonato de litio'],
    category: 'Estabilizador del ánimo',
    warning: 'ALTO RIESGO: Rango terapéutico estrecho. Monitoreo sérico obligatorio. Toxicidad renal y neurológica.',
    level: 'critical',
  },

  // ── Trombolíticos ────────────────────────────────────────────────────────
  {
    dciPatterns: ['alteplasa', 'tenecteplasa', 'reteplasa', 'estreptoquinasa'],
    category: 'Trombolítico',
    warning: 'ALTO RIESGO: Trombolítico — riesgo de hemorragia intracraneal. Verificar contraindicaciones absolutas.',
    level: 'critical',
  },

  // ── Inmunosupresores ──────────────────────────────────────────────────────
  {
    dciPatterns: ['tacrolimus', 'ciclosporina', 'micofenolato', 'azatioprina', 'sirolimus'],
    category: 'Inmunosupresor',
    warning: 'ALTO RIESGO: Inmunosupresor con rango terapéutico estrecho. Monitoreo de niveles séricos obligatorio.',
    level: 'critical',
  },

  // ── Antiarrítmicos ────────────────────────────────────────────────────────
  {
    dciPatterns: ['amiodarona', 'amiodarone'],
    category: 'Antiarrítmico',
    warning: 'ALTO RIESGO: Amiodarona — múltiples interacciones graves (warfarina, digoxina). Toxicidad tiroidea y pulmonar.',
    level: 'critical',
  },

  // ── Sedantes y benzodiazepinas IV ─────────────────────────────────────────
  {
    dciPatterns: ['midazolam', 'propofol', 'ketamina', 'ketamine', 'tiopental'],
    category: 'Sedante IV',
    warning: 'ALTO RIESGO: Sedante parenteral — riesgo de apnea y depresión cardiovascular. Requiere monitoreo.',
    level: 'critical',
  },

  // ── Neurobloqueantes ──────────────────────────────────────────────────────
  {
    dciPatterns: ['succinilcolina', 'vecuronio', 'rocuronio', 'atracurio', 'pancuronio'],
    category: 'Bloqueante neuromuscular',
    warning: 'ALTO RIESGO: Bloqueante neuromuscular — causa parálisis respiratoria. Solo usar con soporte ventilatorio.',
    level: 'critical',
  },

  // ── Metotrexato oral en no oncología ─────────────────────────────────────
  // (ya incluido arriba)

  // ── Hipertónico glucosa ───────────────────────────────────────────────────
  {
    dciPatterns: ['dextrosa 50%', 'glucosa 50%', 'dextrosa al 50'],
    category: 'Solución hipertónica',
    warning: 'ALTO RIESGO: Solución hipertónica de glucosa — riesgo de hiperosmolaridad y extravasación tisular.',
    level: 'high',
  },
]

// ── checkHighAlert ────────────────────────────────────────────────────────────

/**
 * Verifica si un DCI corresponde a un medicamento de alto riesgo.
 * Retorna la alerta si hay coincidencia, o null si es seguro.
 */
export function checkHighAlert(dci: string): HighAlertMedication | null {
  const dciLower = dci.toLowerCase().trim()
  if (!dciLower) return null

  for (const med of HIGH_ALERT_MEDICATIONS) {
    if (med.dciPatterns.some(pattern => dciLower.includes(pattern))) {
      return med
    }
  }
  return null
}

/**
 * Verifica múltiples DCIs y retorna todas las alertas encontradas.
 */
export function checkHighAlertBatch(dcis: string[]): Array<{ dci: string; alert: HighAlertMedication }> {
  const results: Array<{ dci: string; alert: HighAlertMedication }> = []
  for (const dci of dcis) {
    const alert = checkHighAlert(dci)
    if (alert) results.push({ dci, alert })
  }
  return results
}
