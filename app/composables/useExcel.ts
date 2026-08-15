// app/composables/useExcel.ts
//
// Downloads the .xlsx file from OneDrive as raw binary,
// edits it in-browser with SheetJS, then uploads it back.
//
// Why not the Graph workbook API?
//   That API requires a SharePoint (Microsoft 365) licence.
//   Personal Microsoft accounts do NOT have SharePoint,
//   so we use the plain file content endpoint instead.

import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MileageEntry {
  name: string;
  date: string;
  miles: number;
}

// Minimal shape of the SheetJS module we use
interface XLSXModule {
  read: (data: ArrayBuffer, opts: object) => WorkBook;
  write: (wb: WorkBook, opts: object) => Uint8Array;
  utils: {
    aoa_to_sheet: (data: unknown[][]) => WorkSheet;
    book_append_sheet: (wb: WorkBook, ws: WorkSheet, name: string) => void;
    sheet_to_json: (ws: WorkSheet, opts: object) => unknown[][];
    sheet_add_aoa: (ws: WorkSheet, data: unknown[][], opts: object) => void;
  };
}

interface WorkBook {
  Sheets: Record<string, WorkSheet>;
  SheetNames: string[];
}

interface WorkSheet {
  [key: string]: unknown;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const SHEET_NAME = "Table 1";
const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ── Module-level SheetJS cache (loaded once) ──────────────────────────────────

let _xlsx: XLSXModule | null = null;

async function getXLSX(): Promise<XLSXModule> {
  if (_xlsx) return _xlsx;
  // Dynamic CDN import — keeps SheetJS out of the bundle
  _xlsx = (await import(/* @vite-ignore */ XLSX_CDN)) as XLSXModule;
  return _xlsx;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useExcel() {
  const config = useRuntimeConfig();
  const fileId = config.public.oneDriveFileId as string;
  const driveId = config.public.oneDriveDriveId as string;
  const itemId = config.public.oneDriveItemId as string;

  // ── Private helpers ──

  // getToken() calls useAuth() inside an async function (not at module scope)
  // so it always runs inside an active Nuxt component context.
  async function getToken(): Promise<string> {
    const { getAccessToken } = useAuth();
    return getAccessToken();
  }

  async function apiFetch(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const token = await getToken();

    const res = await fetch(`${GRAPH_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });

    if (!res.ok) {
      // Try to parse a Graph error message; fall back to HTTP status
      const body: { error?: { message?: string } } = await res
        .json()
        .catch(() => ({}));
      throw new Error(
        body.error?.message ?? `Graph API error ${res.status} — ${path}`,
      );
    }

    return res;
  }

  /** Download the raw .xlsx binary from OneDrive */
  async function downloadWorkbook(): Promise<ArrayBuffer> {
    // const res = await apiFetch(`/me/drive/items/${fileId}/content`)
    const res = await apiFetch(`/drives/${driveId}/items/${itemId}/content`);
    return res.arrayBuffer();
  }

  /** Upload the modified .xlsx binary back to OneDrive (replaces the file) */
  async function uploadWorkbook(data: Uint8Array): Promise<void> {
    await apiFetch(`/drives/${driveId}/items/${itemId}/content`, {
      method: "PUT",
      headers: { "Content-Type": XLSX_MIME },
      body: data,
    });
  }

  // ── Public API ──

  /**
   * Append one row to the "Table 1" sheet in the OneDrive Excel file.
   * All other sheets (e.g. "Dashboard") are preserved unchanged.
   */
  async function appendEntry(entry: MileageEntry): Promise<void> {
    const xlsx = await getXLSX();
    const buffer = await downloadWorkbook();

    // Parse the workbook (cellDates:true converts serial dates to JS Date objects)
    const wb: WorkBook = xlsx.read(buffer, { type: "array", cellDates: true });

    // Create "Table 1" if it doesn't exist yet
    if (!wb.Sheets[SHEET_NAME]) {
      const newSheet: WorkSheet = xlsx.utils.aoa_to_sheet([
        ["Name", "Date", "Miles"],
      ]);
      xlsx.utils.book_append_sheet(wb, newSheet, SHEET_NAME);
    }

    const ws: WorkSheet = wb.Sheets[SHEET_NAME]!;

    // Read all rows so we can check the header and find the next empty row
    const allRows: unknown[][] = xlsx.utils.sheet_to_json(ws, {
      header: 1,
    }) as unknown[][];

    // Write header row if missing or malformed
    const hasHeader: boolean =
      allRows.length > 0 &&
      String((allRows[0] as unknown[])[0]).toLowerCase() === "name";

    if (!hasHeader) {
      xlsx.utils.sheet_add_aoa(ws, [["Name", "Date", "Miles"]], {
        origin: "A1",
      });
    }

    // Re-read to get the accurate row count after a potential header write
    const currentRows: unknown[][] = xlsx.utils.sheet_to_json(ws, {
      header: 1,
    }) as unknown[][];

    // Append the new data row at the next empty row (0-indexed)
    xlsx.utils.sheet_add_aoa(ws, [[entry.name, entry.date, entry.miles]], {
      origin: { r: currentRows.length, c: 0 },
    });

    // Serialise and upload
    const out: Uint8Array = xlsx.write(wb, { type: "array", bookType: "xlsx" });
    await uploadWorkbook(out);
  }

  /**
   * Read all data rows from "Table 1" (header row is skipped).
   * Returns an empty array if the sheet doesn't exist or has no data.
   */
  async function fetchEntries(): Promise<MileageEntry[]> {
    const xlsx = await getXLSX();
    const buffer = await downloadWorkbook();

    const wb: WorkBook = xlsx.read(buffer, { type: "array", cellDates: true });
    const ws: WorkSheet | undefined = wb.Sheets[SHEET_NAME];

    if (!ws) return [];

    const rows: unknown[][] = xlsx.utils.sheet_to_json(ws, {
      header: 1,
    }) as unknown[][];

    // Skip header row; filter out any blank rows
    return rows
      .slice(1)
      .filter(
        (row: unknown[]): row is unknown[] =>
          Array.isArray(row) && row.length > 0 && Boolean(row[0]),
      )
      .map(
        (row: unknown[]): MileageEntry => ({
          name: String(row[0] ?? ""),
          date:
            row[1] instanceof Date
              ? row[1].toISOString().split("T")[0]!
              : String(row[1] ?? ""),
          miles: Number(row[2] ?? 0),
        }),
      );
  }

  return { appendEntry, fetchEntries };
}
