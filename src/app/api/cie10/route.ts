import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CIE10_CODES: { code: string; description: string }[] = [
  // Infecciosas y parasitarias
  { code: 'A00', description: 'Cólera' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de presunto origen infeccioso' },
  { code: 'A15', description: 'Tuberculosis respiratoria' },
  { code: 'A36', description: 'Difteria' },
  { code: 'A37', description: 'Tos ferina' },
  { code: 'A90', description: 'Dengue' },
  { code: 'B00', description: 'Infecciones herpéticas (herpes simple)' },
  { code: 'B06', description: 'Rubéola' },
  { code: 'B05', description: 'Sarampión' },
  { code: 'B34.9', description: 'Infección viral, no especificada' },
  { code: 'B50', description: 'Paludismo (malaria) por Plasmodium falciparum' },
  // Neoplasias
  { code: 'C00', description: 'Tumor maligno del labio' },
  { code: 'C18', description: 'Tumor maligno del colon' },
  { code: 'C34', description: 'Tumor maligno de los bronquios y del pulmón' },
  { code: 'C50', description: 'Tumor maligno de la mama' },
  { code: 'C53', description: 'Tumor maligno del cuello del útero' },
  { code: 'C61', description: 'Tumor maligno de la próstata' },
  // Enfermedades de la sangre
  { code: 'D50', description: 'Anemia por deficiencia de hierro' },
  { code: 'D64', description: 'Otras anemias' },
  // Enfermedades endocrinas
  { code: 'E10', description: 'Diabetes mellitus tipo 1' },
  { code: 'E11', description: 'Diabetes mellitus tipo 2' },
  { code: 'E05', description: 'Tirotoxicosis (hipertiroidismo)' },
  { code: 'E03', description: 'Hipotiroidismo' },
  { code: 'E66', description: 'Obesidad' },
  { code: 'E78', description: 'Trastornos del metabolismo de las lipoproteínas (dislipidemia)' },
  // Trastornos mentales
  { code: 'F10', description: 'Trastornos mentales y del comportamiento debidos al uso del alcohol' },
  { code: 'F32', description: 'Episodio depresivo' },
  { code: 'F33', description: 'Trastorno depresivo recurrente' },
  { code: 'F41', description: 'Trastorno de ansiedad' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada' },
  // Enfermedades del sistema nervioso
  { code: 'G40', description: 'Epilepsia' },
  { code: 'G43', description: 'Migraña' },
  { code: 'G45', description: 'Ataque isquémico transitorio' },
  // Enfermedades del ojo
  { code: 'H00', description: 'Orzuelo y chalazión' },
  { code: 'H10', description: 'Conjuntivitis' },
  { code: 'H26', description: 'Otras cataratas' },
  // Enfermedades del oído
  { code: 'H65', description: 'Otitis media no supurativa' },
  { code: 'H66', description: 'Otitis media supurativa' },
  // Enfermedades del sistema circulatorio
  { code: 'I10', description: 'Hipertensión esencial (primaria)' },
  { code: 'I20', description: 'Angina de pecho' },
  { code: 'I21', description: 'Infarto agudo de miocardio' },
  { code: 'I25', description: 'Enfermedad isquémica crónica del corazón' },
  { code: 'I48', description: 'Fibrilación y aleteo auricular' },
  { code: 'I50', description: 'Insuficiencia cardíaca' },
  { code: 'I63', description: 'Infarto cerebral' },
  { code: 'I64', description: 'Accidente vascular encefálico (AVE)' },
  // Enfermedades del sistema respiratorio
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)' },
  { code: 'J02', description: 'Faringitis aguda' },
  { code: 'J03', description: 'Amigdalitis aguda' },
  { code: 'J06', description: 'Infección aguda de las vías respiratorias superiores' },
  { code: 'J18', description: 'Neumonía' },
  { code: 'J20', description: 'Bronquitis aguda' },
  { code: 'J30', description: 'Rinitis alérgica' },
  { code: 'J45', description: 'Asma' },
  { code: 'J44', description: 'Enfermedad pulmonar obstructiva crónica (EPOC)' },
  // Enfermedades del sistema digestivo
  { code: 'K02', description: 'Caries dental' },
  { code: 'K21', description: 'Enfermedad por reflujo gastroesofágico' },
  { code: 'K25', description: 'Úlcera gástrica' },
  { code: 'K26', description: 'Úlcera duodenal' },
  { code: 'K29', description: 'Gastritis y duodenitis' },
  { code: 'K35', description: 'Apendicitis aguda' },
  { code: 'K40', description: 'Hernia inguinal' },
  { code: 'K57', description: 'Enfermedad diverticular del intestino' },
  { code: 'K80', description: 'Colelitiasis (cálculos biliares)' },
  { code: 'K81', description: 'Colecistitis' },
  { code: 'K92', description: 'Otras enfermedades del aparato digestivo' },
  // Enfermedades de la piel
  { code: 'L20', description: 'Dermatitis atópica' },
  { code: 'L30', description: 'Otras dermatitis' },
  { code: 'L40', description: 'Psoriasis' },
  { code: 'L50', description: 'Urticaria' },
  // Enfermedades musculoesqueléticas
  { code: 'M10', description: 'Gota' },
  { code: 'M15', description: 'Poliartrosis' },
  { code: 'M16', description: 'Coxartrosis (artrosis de la cadera)' },
  { code: 'M17', description: 'Gonartrosis (artrosis de la rodilla)' },
  { code: 'M42', description: 'Osteocondrosis de la columna vertebral' },
  { code: 'M48', description: 'Otras espondilopatías' },
  { code: 'M54', description: 'Dorsalgia (dolor de espalda)' },
  { code: 'M79.1', description: 'Mialgia' },
  // Enfermedades del sistema genitourinario
  { code: 'N10', description: 'Nefritis tubulointersticial aguda (pielonefritis aguda)' },
  { code: 'N18', description: 'Enfermedad renal crónica' },
  { code: 'N20', description: 'Cálculo del riñón y del uréter (nefrolitiasis)' },
  { code: 'N30', description: 'Cistitis' },
  { code: 'N39', description: 'Infección de las vías urinarias' },
  { code: 'N40', description: 'Hiperplasia de la próstata' },
  { code: 'N70', description: 'Salpingitis y ooforitis' },
  { code: 'N76', description: 'Otras infecciones vaginales' },
  // Embarazo, parto y puerperio
  { code: 'O10', description: 'Hipertensión preexistente complicada con el embarazo' },
  { code: 'O14', description: 'Hipertensión gestacional con proteinuria importante (preeclampsia)' },
  { code: 'O24', description: 'Diabetes mellitus en el embarazo' },
  { code: 'O80', description: 'Parto único espontáneo' },
  // Síntomas y signos
  { code: 'R00', description: 'Anomalías del latido cardíaco' },
  { code: 'R05', description: 'Tos' },
  { code: 'R07', description: 'Dolor de garganta y en el pecho' },
  { code: 'R10', description: 'Dolor abdominal y pélvico' },
  { code: 'R50', description: 'Fiebre de otro origen y de origen desconocido' },
  { code: 'R51', description: 'Cefalea (dolor de cabeza)' },
  { code: 'R55', description: 'Síncope y colapso' },
  { code: 'R73', description: 'Glucosa en sangre elevada' },
  // Lesiones y traumatismos
  { code: 'S00', description: 'Traumatismo superficial de la cabeza' },
  { code: 'S52', description: 'Fractura del antebrazo' },
  { code: 'S72', description: 'Fractura del fémur' },
  { code: 'T14', description: 'Traumatismo de región no especificada del cuerpo' },
  // Factores
  { code: 'Z00', description: 'Examen médico general (chequeo de salud)' },
  { code: 'Z23', description: 'Necesidad de inmunización' },
  { code: 'Z30', description: 'Anticoncepción' },
  { code: 'Z51', description: 'Otra atención médica' },
]

// GET /api/cie10?q=término
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').toLowerCase().trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = CIE10_CODES.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
  ).slice(0, 10)

  return NextResponse.json({ results })
}
