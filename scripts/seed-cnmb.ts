// Seed script: CNMB (Cuadro Nacional de Medicamentos Básicos) 11va revisión 2022 — Ecuador
// To run: npx ts-node --project tsconfig.json scripts/seed-cnmb.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CnmbEntry {
  codigoAtc: string
  dci: string
  concentracion: string
  formaFarmaceutica: string
  nivel: number
}

const CNMB_DATA: CnmbEntry[] = [
  // ─── A: Digestivo / Metabolismo ───────────────────────────────────────────
  { codigoAtc: 'A10BA02', dci: 'Metformina', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'A10BA02', dci: 'Metformina', concentracion: '850 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'A02BC01', dci: 'Omeprazol', concentracion: '20 mg', formaFarmaceutica: 'Cápsula', nivel: 1 },
  { codigoAtc: 'A02BC01', dci: 'Omeprazol', concentracion: '40 mg', formaFarmaceutica: 'Polvo para inyección', nivel: 2 },
  { codigoAtc: 'A02BA02', dci: 'Ranitidina', concentracion: '150 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'A02BA02', dci: 'Ranitidina', concentracion: '50 mg/2 mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'A06AD11', dci: 'Lactulosa', concentracion: '3.35 g/5 mL', formaFarmaceutica: 'Solución oral', nivel: 1 },
  { codigoAtc: 'A03FA01', dci: 'Metoclopramida', concentracion: '10 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'A03FA01', dci: 'Metoclopramida', concentracion: '5 mg/mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'A07EC01', dci: 'Sulfasalazina', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 2 },

  // ─── B: Sangre / Hematopoyéticos ──────────────────────────────────────────
  { codigoAtc: 'B01AA03', dci: 'Warfarina', concentracion: '5 mg', formaFarmaceutica: 'Tableta', nivel: 2 },
  { codigoAtc: 'B01AB05', dci: 'Enoxaparina', concentracion: '40 mg/0.4 mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'B01AC06', dci: 'Ácido acetilsalicílico', concentracion: '100 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'B03AA07', dci: 'Sulfato ferroso', concentracion: '300 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'B03XA01', dci: 'Eritropoyetina', concentracion: '4000 UI/mL', formaFarmaceutica: 'Solución inyectable', nivel: 3 },

  // ─── C: Cardiovascular ────────────────────────────────────────────────────
  { codigoAtc: 'C07AB03', dci: 'Atenolol', concentracion: '50 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C07AB03', dci: 'Atenolol', concentracion: '100 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C08CA01', dci: 'Amlodipino', concentracion: '5 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C08CA01', dci: 'Amlodipino', concentracion: '10 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C09AA02', dci: 'Enalapril', concentracion: '10 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C09AA02', dci: 'Enalapril', concentracion: '20 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C03CA01', dci: 'Furosemida', concentracion: '40 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C03CA01', dci: 'Furosemida', concentracion: '10 mg/mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'C03AA03', dci: 'Hidroclorotiazida', concentracion: '25 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C09CA01', dci: 'Losartán', concentracion: '50 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'C01AA05', dci: 'Digoxina', concentracion: '0.25 mg', formaFarmaceutica: 'Tableta', nivel: 2 },
  { codigoAtc: 'C07AB02', dci: 'Metoprolol', concentracion: '100 mg', formaFarmaceutica: 'Tableta', nivel: 2 },

  // ─── D: Dermatología ──────────────────────────────────────────────────────
  { codigoAtc: 'D01AC01', dci: 'Clotrimazol', concentracion: '1%', formaFarmaceutica: 'Crema', nivel: 1 },
  { codigoAtc: 'D07AA02', dci: 'Hidrocortisona', concentracion: '1%', formaFarmaceutica: 'Crema', nivel: 1 },
  { codigoAtc: 'D06AX09', dci: 'Mupirocina', concentracion: '2%', formaFarmaceutica: 'Ungüento', nivel: 1 },

  // ─── G: Genitourinario ────────────────────────────────────────────────────
  { codigoAtc: 'G01AF01', dci: 'Metronidazol', concentracion: '500 mg', formaFarmaceutica: 'Óvulo vaginal', nivel: 1 },
  { codigoAtc: 'G01AF02', dci: 'Fluconazol', concentracion: '150 mg', formaFarmaceutica: 'Cápsula', nivel: 1 },
  { codigoAtc: 'G04BA04', dci: 'Ciprofloxacino', concentracion: '250 mg', formaFarmaceutica: 'Tableta', nivel: 1 },

  // ─── H: Hormonas sistémicas ───────────────────────────────────────────────
  { codigoAtc: 'H03AA01', dci: 'Levotiroxina', concentracion: '100 mcg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'H03AA01', dci: 'Levotiroxina', concentracion: '50 mcg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'A10AC01', dci: 'Insulina NPH', concentracion: '100 UI/mL', formaFarmaceutica: 'Solución inyectable', nivel: 1 },
  { codigoAtc: 'A10AB01', dci: 'Insulina regular', concentracion: '100 UI/mL', formaFarmaceutica: 'Solución inyectable', nivel: 1 },
  { codigoAtc: 'H02AB06', dci: 'Prednisona', concentracion: '5 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'H02AB02', dci: 'Dexametasona', concentracion: '4 mg/mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'H02AB09', dci: 'Hidrocortisona', concentracion: '100 mg', formaFarmaceutica: 'Polvo para inyección', nivel: 2 },

  // ─── J: Antiinfecciosos ───────────────────────────────────────────────────
  { codigoAtc: 'J01CA04', dci: 'Amoxicilina', concentracion: '500 mg', formaFarmaceutica: 'Cápsula', nivel: 1 },
  { codigoAtc: 'J01CA04', dci: 'Amoxicilina', concentracion: '250 mg/5 mL', formaFarmaceutica: 'Polvo para suspensión oral', nivel: 1 },
  { codigoAtc: 'J01CA01', dci: 'Ampicilina', concentracion: '1 g', formaFarmaceutica: 'Polvo para inyección', nivel: 2 },
  { codigoAtc: 'J01FA10', dci: 'Azitromicina', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'J01DD04', dci: 'Ceftriaxona', concentracion: '1 g', formaFarmaceutica: 'Polvo para inyección', nivel: 2 },
  { codigoAtc: 'J01MA02', dci: 'Ciprofloxacino', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'J01FA09', dci: 'Claritromicina', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 2 },
  { codigoAtc: 'J01FF01', dci: 'Clindamicina', concentracion: '300 mg', formaFarmaceutica: 'Cápsula', nivel: 2 },
  { codigoAtc: 'J01AA02', dci: 'Doxiciclina', concentracion: '100 mg', formaFarmaceutica: 'Cápsula', nivel: 1 },
  { codigoAtc: 'J01CE01', dci: 'Penicilina G benzatínica', concentracion: '1 200 000 UI', formaFarmaceutica: 'Polvo para inyección', nivel: 1 },
  { codigoAtc: 'J01EE01', dci: 'Trimetoprim + sulfametoxazol', concentracion: '80 mg + 400 mg', formaFarmaceutica: 'Tableta', nivel: 1 },

  // ─── M: Musculoesquelético ────────────────────────────────────────────────
  { codigoAtc: 'M01AB05', dci: 'Diclofenaco', concentracion: '50 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'M01AB05', dci: 'Diclofenaco', concentracion: '75 mg/3 mL', formaFarmaceutica: 'Solución inyectable', nivel: 1 },
  { codigoAtc: 'M01AE01', dci: 'Ibuprofeno', concentracion: '400 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'M01AE02', dci: 'Naproxeno', concentracion: '500 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'M01AC01', dci: 'Piroxicam', concentracion: '20 mg', formaFarmaceutica: 'Cápsula', nivel: 1 },
  { codigoAtc: 'M01AB01', dci: 'Indometacina', concentracion: '25 mg', formaFarmaceutica: 'Cápsula', nivel: 2 },

  // ─── N: Sistema nervioso ──────────────────────────────────────────────────
  { codigoAtc: 'N05BA01', dci: 'Diazepam', concentracion: '5 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'N05BA01', dci: 'Diazepam', concentracion: '10 mg/2 mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },
  { codigoAtc: 'N05AD01', dci: 'Haloperidol', concentracion: '5 mg', formaFarmaceutica: 'Tableta', nivel: 2 },
  { codigoAtc: 'N03AF01', dci: 'Carbamazepina', concentracion: '200 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'N03AB02', dci: 'Fenitoína', concentracion: '100 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'N03AG01', dci: 'Ácido valproico', concentracion: '500 mg', formaFarmaceutica: 'Tableta de liberación prolongada', nivel: 2 },
  { codigoAtc: 'N06AA09', dci: 'Amitriptilina', concentracion: '25 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'N02AA01', dci: 'Morfina', concentracion: '10 mg/mL', formaFarmaceutica: 'Solución inyectable', nivel: 2 },

  // ─── P: Antiparasitarios ──────────────────────────────────────────────────
  { codigoAtc: 'P02CA03', dci: 'Albendazol', concentracion: '200 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'P02CF01', dci: 'Ivermectina', concentracion: '6 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'P01BA01', dci: 'Cloroquina', concentracion: '250 mg', formaFarmaceutica: 'Tableta', nivel: 2 },
  { codigoAtc: 'P02CA01', dci: 'Mebendazol', concentracion: '100 mg', formaFarmaceutica: 'Tableta', nivel: 1 },

  // ─── R: Respiratorio ──────────────────────────────────────────────────────
  { codigoAtc: 'R03AC02', dci: 'Salbutamol', concentracion: '100 mcg/dosis', formaFarmaceutica: 'Aerosol para inhalación', nivel: 1 },
  { codigoAtc: 'R03AC02', dci: 'Salbutamol', concentracion: '5 mg/mL', formaFarmaceutica: 'Solución para nebulización', nivel: 1 },
  { codigoAtc: 'R03BA01', dci: 'Beclometasona', concentracion: '250 mcg/dosis', formaFarmaceutica: 'Aerosol para inhalación', nivel: 2 },
  { codigoAtc: 'R03BB01', dci: 'Ipratropio', concentracion: '20 mcg/dosis', formaFarmaceutica: 'Aerosol para inhalación', nivel: 2 },
  { codigoAtc: 'R03DA04', dci: 'Aminofilina', concentracion: '200 mg', formaFarmaceutica: 'Tableta', nivel: 1 },
  { codigoAtc: 'R03BA02', dci: 'Budesonida', concentracion: '200 mcg/dosis', formaFarmaceutica: 'Aerosol para inhalación', nivel: 2 },
]

async function main() {
  console.log('Seeding CNMB catalog...')

  console.log('Deleting existing records...')
  const deleted = await prisma.catalogoMedicamento.deleteMany({})
  console.log(`Deleted ${deleted.count} existing records.`)

  console.log(`Inserting ${CNMB_DATA.length} medications...`)
  const result = await prisma.catalogoMedicamento.createMany({
    data: CNMB_DATA.map((m) => ({ ...m, activo: true })),
    skipDuplicates: false,
  })

  console.log(`Seeded ${result.count} medications successfully.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
