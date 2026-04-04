export interface ExamCategory {
  key: string
  label: string
  exams: string[]
}

export const EXAM_CATEGORIES: ExamCategory[] = [
  {
    key: 'hematologia',
    label: 'HEMATOLOGÍA',
    exams: [
      'Biometría Hemática', 'Plaquetas', 'VSG', 'Reticulocitos', 'Hematozoario',
      'Grupo y Factor Rh', 'Anti CCP', 'Anti DNA', 'ANA', 'Procalcitonina',
      'Vitamina B12', 'Vitamina D', 'G.G.T', 'Amilasa', 'Lipasa',
      'TP (Tiempo de Protrombina)', 'TTP (Tiempo de Tromboplastina Parcial)',
    ],
  },
  {
    key: 'bioquimica',
    label: 'BIOQUÍMICA',
    exams: [
      'Glucosa', 'Glucosa Post-prandial', 'Curva de la Glucosa', 'HB Glicosilada',
      'Úrea', 'Creatina', 'Ácido Úrico', 'Proteínas Totales', 'Albumina',
      'Globulina Índice A/G', 'Bilirrubinas', 'Colesterol Total', 'Triglicéridos',
      'HDL Colesterol', 'LDL Colesterol', 'VLDL Colesterol', 'Lípidos Totales',
      'Ferritina', 'Hierro Sérico',
    ],
  },
  {
    key: 'hormonas',
    label: 'HORMONAS',
    exams: [
      'BETA HCG Cualitativa', 'BETA HCG Cuantitativa', 'TSH', 'T3 (Libre/Total)',
      'T4 (Libre/Total)', 'LDH', 'Testosterona Total (Libre/Total)', 'FSH',
      'Prolactina', 'Insulina', 'Progesterona', 'Testosterona', 'Estradiol',
      'Cortisol (Libre/Total)',
    ],
  },
  {
    key: 'electrolitos',
    label: 'ELECTROLITOS',
    exams: ['Sodio', 'Potasio', 'Cloro', 'Calcio', 'Fósforo', 'Magnesio'],
  },
  {
    key: 'drogas',
    label: 'DROGAS TERAPÉUTICAS',
    exams: ['Ac. Valproico', 'Carbamazepina', 'Fenitoína'],
  },
  {
    key: 'microbiologia',
    label: 'MICROBIOLOGÍA',
    exams: ['Muestra', 'Fresco', 'Gram', 'KOH', 'BAAR', 'Cultivo y Antibiograma', 'Hemocultivo'],
  },
  {
    key: 'inmunologia',
    label: 'INMUNOLOGÍA',
    exams: [
      'Toxoplasma (IgG/IgM)', 'Rubéola (IgG/IgM)', 'Citomegalovirus (IgG/IgM)',
      'Herpes I (IgG/IgM)', 'Herpes II (IgG/IgM)', 'H.I.V', 'IgE Total',
      'Helicobacter Pylori (Cuantitativo/Cualitativo)', 'Hepatitis A (IgG/IgM)',
      'Hepatitis B HBsAg', 'Hepatitis C', 'Dengue (IgG/IgM)',
    ],
  },
  {
    key: 'marcadoresTumorales',
    label: 'MARCADORES TUMORALES',
    exams: [
      'CA 125 (Ovario)', 'CA 153 (Mama)', 'AFP', 'CEA', 'Anti Tiroglobulina',
      'Tiroglobulina', 'CA 199 (Páncreas-Estómago)', 'PSA Libre', 'PSA Total',
    ],
  },
  {
    key: 'serologia',
    label: 'SEROLOGÍA',
    exams: [
      'PCR (Cuantitativo/Cualitativo)', 'FR (Cuantitativo/Cualitativo)',
      'ASTO (Cuantitativo/Cualitativo)', 'VDRL', 'R. de Widal y Weill Felix',
      'COVID-19 (Cuantitativo/Cualitativo)',
    ],
  },
  {
    key: 'enzimas',
    label: 'ENZIMAS',
    exams: [
      'TGO', 'TGP', 'F. Alcalina', 'F. Ácida Total', 'F. Ácida Prost',
      'L.D.H.', 'CPK (CK.NAK)', 'Tropología',
    ],
  },
  {
    key: 'orina',
    label: 'ORINA',
    exams: [
      'EMO', 'P. de Embarazo', 'Cultivo y Antibiograma', 'Microalbuminuria',
      'Exámenes de Drogas',
    ],
  },
  {
    key: 'heces',
    label: 'HECES',
    exams: [
      'Coproparasitario', 'Coprodigestivo', 'Seriado', 'Sangre Oculta', 'pH',
      'PMN', 'Rotavirus', 'Adenovirus', 'Azúcares Reductores', 'Azúcares no Reductores',
      'Actividad Tríptica', 'Coprocultivo', 'H. Pylori en heces',
    ],
  },
]

export type ExamSelection = Record<string, string[]> & { otros?: string }

export const IMAGING_CATEGORIES: ExamCategory[] = [
  {
    key: 'radiologia',
    label: 'RADIOLOGÍA / RAYOS X',
    exams: [
      'Tórax AP y lateral', 'Columna cervical AP y lateral', 'Columna lumbar AP y lateral',
      'Columna dorsal', 'Pelvis', 'Cadera', 'Rodilla AP y lateral', 'Tobillo', 'Pie',
      'Mano / Muñeca', 'Cráneo AP y lateral', 'Abdomen simple', 'Senos paranasales',
      'Hombro', 'Codo', 'Antebrazo', 'Fémur', 'Tibia y Peroné',
    ],
  },
  {
    key: 'ecografia',
    label: 'ECOGRAFÍA / ULTRASONIDO',
    exams: [
      'Abdominal completa', 'Pélvica', 'Obstétrica', 'Renal y vías urinarias', 'Vesical',
      'Tiroides y paratiroides', 'Partes blandas', 'Doppler venoso miembros inferiores',
      'Doppler arterial', 'Testicular', 'Mamaria bilateral', 'Cuello', 'Inguinal',
      'Doppler renal', 'Transvaginal',
    ],
  },
  {
    key: 'tomografia',
    label: 'TOMOGRAFÍA COMPUTARIZADA (TAC)',
    exams: [
      'Cráneo simple', 'Cráneo con contraste', 'Tórax simple', 'Tórax con contraste',
      'Abdomen y pelvis simple', 'Abdomen y pelvis con contraste', 'Columna cervical',
      'Columna lumbar', 'Columna dorsal', 'Angio-TAC pulmonar (ATCP)', 'Senos paranasales',
      'Macizo facial', 'Cuello', 'Pelvis',
    ],
  },
  {
    key: 'resonancia',
    label: 'RESONANCIA MAGNÉTICA (RM)',
    exams: [
      'Cerebro simple', 'Cerebro con contraste', 'Columna cervical', 'Columna lumbar',
      'Columna dorsal', 'Rodilla', 'Hombro', 'Cadera', 'Abdomen', 'Pelvis',
      'Tobillo', 'Muñeca', 'Angio-RM cerebral', 'Articulación temporomandibular (ATM)',
    ],
  },
  {
    key: 'mamografia',
    label: 'MAMOGRAFÍA',
    exams: [
      'Mamografía bilateral', 'Mamografía unilateral derecha', 'Mamografía unilateral izquierda',
      'Ecografía mamaria bilateral', 'Ecografía mamaria unilateral',
    ],
  },
  {
    key: 'endoscopia',
    label: 'ENDOSCOPIA / PROCEDIMIENTOS',
    exams: [
      'Endoscopia digestiva alta (EDA)', 'Colonoscopia', 'Rectosigmoidoscopia',
      'Broncoscopia', 'Laparoscopia diagnóstica', 'Colposcopia',
      'Cistoscopia', 'CPRE',
    ],
  },
  {
    key: 'otrosImagenes',
    label: 'OTROS ESTUDIOS',
    exams: [
      'Densitometría ósea (DXA)', 'Gammagrafía ósea', 'Ecocardiograma 2D + Doppler',
      'Ecocardiograma transtorácico', 'Holter 24 horas', 'Electrocardiograma (ECG)',
      'Test de esfuerzo (ergometría)', 'Espirometría', 'Pletismografía',
    ],
  },
]
