<template>
  <div>
    <!-- ── Page header ── -->
    <div class="page-head">
      <div>
        <h1>All Entries</h1>
        <p>Every record from <strong>Table 1</strong> in your Excel file.</p>
      </div>
      <div class="page-head-actions">
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading"
          @click="loadData"
        >
          {{ loading ? 'Loading…' : '↻ Refresh' }}
        </button>
        <NuxtLink to="/" class="btn btn-primary">+ Log Miles</NuxtLink>
      </div>
    </div>

    <!-- ── Summary strip ── -->
    <div v-if="entries.length > 0" class="summary" aria-label="Summary statistics">
      <div class="stat">
        <span class="stat-val">{{ entries.length }}</span>
        <span class="stat-lbl">Entries</span>
      </div>
      <div class="stat-divider" />
      <div class="stat">
        <span class="stat-val">{{ totalMiles.toFixed(1) }}</span>
        <span class="stat-lbl">Total miles</span>
      </div>
      <div class="stat-divider" />
      <div class="stat">
        <span class="stat-val">{{ avgMiles.toFixed(1) }}</span>
        <span class="stat-lbl">Avg / trip</span>
      </div>
      <div class="stat-divider" />
      <div class="stat">
        <span class="stat-val">{{ uniquePeople }}</span>
        <span class="stat-lbl">{{ uniquePeople === 1 ? 'Person' : 'People' }}</span>
      </div>
    </div>

    <!-- ── Loading skeletons ── -->
    <div v-if="loading" class="table-card">
      <div class="skeletons" aria-busy="true" aria-label="Loading entries">
        <div v-for="n in 7" :key="n" class="skeleton" />
      </div>
    </div>

    <!-- ── Empty state ── -->
    <div v-else-if="entries.length === 0" class="empty-state">
      <span aria-hidden="true">📋</span>
      <h3>No entries yet</h3>
      <p>Log your first journey and it will appear here.</p>
      <NuxtLink to="/" class="btn btn-primary">Log your first entry</NuxtLink>
    </div>

    <!-- ── Data table ── -->
    <div v-else class="table-card">

      <!-- Search + count toolbar -->
      <div class="toolbar">
        <label for="search-input" class="sr-only">Search by name</label>
        <input
          id="search-input"
          v-model="searchQuery"
          type="search"
          placeholder="Search by name…"
          class="search-input"
        />
        <span class="result-count" aria-live="polite">
          {{ sortedEntries.length }} / {{ entries.length }}
        </span>
      </div>

      <div class="table-wrap" role="region" aria-label="Mileage entries table" tabindex="0">
        <table>
          <thead>
            <tr>
              <th scope="col" class="th-num">#</th>
              <th
                scope="col"
                class="th-sortable"
                :aria-sort="ariaSort('name')"
                @click="setSort('name')"
              >
                Name <span class="sort-icon" aria-hidden="true">{{ sortIcon('name') }}</span>
              </th>
              <th
                scope="col"
                class="th-sortable"
                :aria-sort="ariaSort('date')"
                @click="setSort('date')"
              >
                Date <span class="sort-icon" aria-hidden="true">{{ sortIcon('date') }}</span>
              </th>
              <th
                scope="col"
                class="th-sortable th-right"
                :aria-sort="ariaSort('miles')"
                @click="setSort('miles')"
              >
                Miles <span class="sort-icon" aria-hidden="true">{{ sortIcon('miles') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in sortedEntries"
              :key="index"
            >
              <td class="td-num">{{ index + 1 }}</td>
              <td class="td-name">{{ entry.name }}</td>
              <td class="td-date">{{ formatDate(entry.date) }}</td>
              <td class="td-miles">{{ entry.miles }}</td>
            </tr>

            <tr v-if="sortedEntries.length === 0">
              <td colspan="4" class="no-results">
                No entries match "<strong>{{ searchQuery }}</strong>"
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useExcel, type MileageEntry } from '~/composables/useExcel'

// ── Auth ──────────────────────────────────────────────────────────────────────

const { isAuthenticated } = useAuth()

// ── Excel ─────────────────────────────────────────────────────────────────────

const { fetchEntries } = useExcel()

// ── State ─────────────────────────────────────────────────────────────────────

const entries     = ref<MileageEntry[]>([])
const loading     = ref<boolean>(false)
const searchQuery = ref<string>('')

type SortKey = 'name' | 'date' | 'miles'
const sortKey = ref<SortKey>('date')
const sortDir = ref<1 | -1>(-1)     // 1 = ascending, -1 = descending

// ── Computed — summary stats ───────────────────────────────────────────────────

const totalMiles = computed<number>(() =>
  entries.value.reduce((sum: number, e: MileageEntry) => sum + Number(e.miles), 0),
)

const avgMiles = computed<number>(() =>
  entries.value.length ? totalMiles.value / entries.value.length : 0,
)

const uniquePeople = computed<number>(() =>
  new Set(entries.value.map((e: MileageEntry) => e.name)).size,
)

// ── Computed — filtered + sorted rows ─────────────────────────────────────────

const filteredEntries = computed<MileageEntry[]>(() => {
  const query: string = searchQuery.value.toLowerCase().trim()
  if (!query) return entries.value
  return entries.value.filter((e: MileageEntry) =>
    e.name.toLowerCase().includes(query),
  )
})

const sortedEntries = computed<MileageEntry[]>(() => {
  return [...filteredEntries.value].sort((a: MileageEntry, b: MileageEntry) => {
    let av: string | number
    let bv: string | number

    if (sortKey.value === 'miles') {
      av = Number(a.miles)
      bv = Number(b.miles)
    } else {
      av = String(a[sortKey.value])
      bv = String(b[sortKey.value])
    }

    if (av < bv) return -sortDir.value
    if (av > bv) return  sortDir.value
    return 0
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function setSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 1 ? -1 : 1
  } else {
    sortKey.value = key
    sortDir.value = 1
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 1 ? '↑' : '↓'
}

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 1 ? 'ascending' : 'descending'
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData(): Promise<void> {
  loading.value = true
  try {
    entries.value = await fetchEntries()
  } finally {
    loading.value = false
  }
}

watch(
  isAuthenticated,
  (authenticated: boolean) => {
    if (authenticated) loadData()
  },
  { immediate: true },
)
</script>

<style scoped>
/* ── Page header ── */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.page-head h1 { font-size: 1.7rem; margin-bottom: 4px; }
.page-head p  { font-size: 0.88rem; color: var(--text-2); }

.page-head-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* ── Summary strip ── */
.summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-val {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}

.stat-lbl {
  font-size: 0.73rem;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 34px;
  background: var(--border);
  flex-shrink: 0;
}

/* ── Table card ── */
.table-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* ── Toolbar ── */
.toolbar {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  flex: 1;
  max-width: 260px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.88rem;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--accent); }

.result-count {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--text-3);
}

/* ── Table ── */
.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
}

thead { background: var(--surface-2); }

th {
  padding: 11px 20px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-2);
  white-space: nowrap;
}

.th-sortable {
  cursor: pointer;
  user-select: none;
}
.th-sortable:hover { color: var(--text); }

.th-right  { text-align: right; }
.th-num    { width: 52px; }

.sort-icon { opacity: 0.5; margin-left: 3px; font-style: normal; }

tbody tr {
  border-top: 1px solid var(--border);
  transition: background 0.1s;
}
tbody tr:hover { background: var(--surface-2); }

td { padding: 13px 20px; font-size: 0.88rem; }

.td-num   { color: var(--text-3); font-size: 0.78rem; }
.td-name  { font-weight: 500; }
.td-date  { color: var(--text-2); white-space: nowrap; }
.td-miles {
  text-align: right;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--accent);
}

.no-results {
  text-align: center;
  padding: 30px;
  color: var(--text-3);
  font-size: 0.88rem;
}

/* ── Skeletons ── */
.skeletons {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  height: 44px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--border) 50%,
    var(--surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Empty state ── */
.empty-state {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
  padding: 70px 40px;
}

.empty-state span { font-size: 2.8rem; display: block; margin-bottom: 14px; }
.empty-state h3   { font-size: 1.2rem; margin-bottom: 8px; }
.empty-state p    { color: var(--text-2); margin-bottom: 22px; font-size: 0.9rem; }

/* Accessibility — visually hidden label */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-head      { flex-direction: column; }
  .summary        { gap: 14px; padding: 16px 20px; }
  .stat-divider   { display: none; }
}
</style>
