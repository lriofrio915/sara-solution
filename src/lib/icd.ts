import { searchCie10 } from './cie10-data'

export interface Icd11Result {
  code: string
  title: string
}

export async function searchIcd11(query: string): Promise<Icd11Result[]> {
  return searchCie10(query, 20).map(e => ({ code: e.code, title: e.desc }))
}
