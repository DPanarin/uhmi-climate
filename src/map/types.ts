/** Columnar value file from public/data/values (see scripts/build/values.ts). */
export interface ValueFile {
  ids: string[]
  decades: string[]
  /** values[scenario | "observed"][season][decade][i] belongs to ids[i]. */
  values: Record<string, Record<string, Record<string, (number | null)[]>>>
}
