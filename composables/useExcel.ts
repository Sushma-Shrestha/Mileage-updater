// Uses SheetJS to read/write .xlsx directly via OneDrive file content API.
// Works with personal Microsoft accounts — no SharePoint licence required.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const SHEET_NAME = 'Table 1'

export interface MileageEntry {
  name: string
  date: string
  miles: number
}

let XLSX: any = null

const loadXLSX = async () => {
  if (XLSX) return XLSX
  // @ts-ignore — loaded from CDN, no npm package needed
  XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
  return XLSX
}

export const useExcel = () => {
  const config = useRuntimeConfig()
  const fileId = config.public.oneDriveFileId

  // Resolve useAuth lazily inside each async fn — avoids calling composables at module scope
  const getToken = async (): Promise<string> => {
    const { getAccessToken } = useAuth()
    return getAccessToken()
  }

  const downloadWorkbook = async (): Promise<ArrayBuffer> => {
    const token = await getToken()
    const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Download failed: ${res.status}`)
    }
    return res.arrayBuffer()
  }

  const uploadWorkbook = async (data: Uint8Array) => {
    const token = await getToken()
    const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}/content`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: data,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Upload failed: ${res.status}`)
    }
  }

  const appendEntry = async (entry: MileageEntry) => {
    const xlsx = await loadXLSX()
    const buffer = await downloadWorkbook()

    const wb = xlsx.read(buffer, { type: 'array', cellDates: true })

    // Get or create "Table 1" sheet
    let ws = wb.Sheets[SHEET_NAME]
    if (!ws) {
      ws = xlsx.utils.aoa_to_sheet([['Name', 'Date', 'Miles']])
      xlsx.utils.book_append_sheet(wb, ws, SHEET_NAME)
    }

    // Ensure header row
    const existing: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 })
    if (existing.length === 0 || String(existing[0]?.[0]).toLowerCase() !== 'name') {
      xlsx.utils.sheet_add_aoa(ws, [['Name', 'Date', 'Miles']], { origin: 'A1' })
    }

    // Append new row
    const currentData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 })
    xlsx.utils.sheet_add_aoa(ws, [[entry.name, entry.date, entry.miles]], {
      origin: { r: currentData.length, c: 0 },
    })

    const out: Uint8Array = xlsx.write(wb, { type: 'array', bookType: 'xlsx' })
    await uploadWorkbook(out)
  }

  const fetchEntries = async (): Promise<MileageEntry[]> => {
    try {
      const xlsx = await loadXLSX()
      const buffer = await downloadWorkbook()
      const wb = xlsx.read(buffer, { type: 'array', cellDates: true })

      const ws = wb.Sheets[SHEET_NAME]
      if (!ws) return []

      const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 })
      if (rows.length <= 1) return []

      return rows.slice(1)
        .filter((row: any[]) => row.length > 0 && row[0])
        .map((row: any[]) => ({
          name: String(row[0] ?? ''),
          date: row[1] instanceof Date
            ? row[1].toISOString().split('T')[0]
            : String(row[1] ?? ''),
          miles: Number(row[2] ?? 0),
        }))
    } catch {
      return []
    }
  }

  return { appendEntry, fetchEntries }
}
