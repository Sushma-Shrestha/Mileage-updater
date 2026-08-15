<template>
  <div>
    <div class="page-header">
      <div>
        <h1>All Entries</h1>
        <p>All mileage records from <strong>Table 1</strong> in your Excel file.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="loadEntries" :disabled="loading">
          {{ loading ? 'Loading…' : '↻ Refresh' }}
        </button>
        <NuxtLink to="/" class="btn btn-primary">+ Log Miles</NuxtLink>
      </div>
    </div>

    <!-- Summary strip -->
    <div class="summary-strip" v-if="entries.length > 0">
      <div class="summary-stat">
        <span class="stat-value">{{ entries.length }}</span>
        <span class="stat-label">Entries</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-stat">
        <span class="stat-value">{{ totalMiles.toFixed(1) }}</span>
        <span class="stat-label">Total miles</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-stat">
        <span class="stat-value">{{ avgMiles.toFixed(1) }}</span>
        <span class="stat-label">Avg per trip</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-stat">
        <span class="stat-value">{{ uniqueNames }}</span>
        <span class="stat-label">{{ uniqueNames === 1 ? 'Person' : 'People' }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="table-card">
      <div class="loading-rows">
        <div class="skeleton-row" v-for="i in 6" :key="i" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="entries.length === 0" class="empty-state">
      <span class="empty-icon">📋</span>
      <h3>No entries yet</h3>
      <p>Start logging your journeys and they'll appear here.</p>
      <NuxtLink to="/" class="btn btn-primary">Log your first entry</NuxtLink>
    </div>

    <!-- Table -->
    <div v-else class="table-card">
      <!-- Search/filter bar -->
      <div class="table-toolbar">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by name…"
          class="search-input"
        />
        <span class="result-count">
          {{ filteredEntries.length }} of {{ entries.length }}
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th @click="sort('name')" class="sortable">
                Name <span class="sort-icon">{{ sortIcon('name') }}</span>
              </th>
              <th @click="sort('date')" class="sortable">
                Date <span class="sort-icon">{{ sortIcon('date') }}</span>
              </th>
              <th @click="sort('miles')" class="sortable th-right">
                Miles <span class="sort-icon">{{ sortIcon('miles') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, i) in sortedEntries" :key="i">
              <td class="td-num">{{ i + 1 }}</td>
              <td class="td-name">{{ entry.name }}</td>
              <td class="td-date">{{ formatDate(entry.date) }}</td>
              <td class="td-miles">{{ entry.miles }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="sortedEntries.length === 0" class="no-results">
        No entries match "<strong>{{ searchQuery }}</strong>"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { isAuthenticated } = useAuth()
const { fetchEntries } = useExcel()

const entries = ref<{ name: string; date: string; miles: number }[]>([])
const loading = ref(false)
const searchQuery = ref('')
const sortKey = ref<'name' | 'date' | 'miles'>('date')
const sortDir = ref<1 | -1>(-1)

const totalMiles = computed(() => entries.value.reduce((s, e) => s + Number(e.miles), 0))
const avgMiles = computed(() => entries.value.length ? totalMiles.value / entries.value.length : 0)
const uniqueNames = computed(() => new Set(entries.value.map(e => e.name)).size)

const filteredEntries = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(e => e.name.toLowerCase().includes(q))
})

const sortedEntries = computed(() => {
  return [...filteredEntries.value].sort((a, b) => {
    const av = sortKey.value === 'miles' ? Number(a.miles) : String(a[sortKey.value])
    const bv = sortKey.value === 'miles' ? Number(b.miles) : String(b[sortKey.value])
    if (av < bv) return -sortDir.value
    if (av > bv) return sortDir.value
    return 0
  })
})

const sort = (key: 'name' | 'date' | 'miles') => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else { sortKey.value = key; sortDir.value = 1 }
}

const sortIcon = (key: string) => {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 1 ? '↑' : '↓'
}

const formatDate = (d: string) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch { return d }
}

const loadEntries = async () => {
  loading.value = true
  try {
    entries.value = await fetchEntries()
  } finally {
    loading.value = false
  }
}

watch(isAuthenticated, (val) => { if (val) loadEntries() }, { immediate: true })
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 1.75rem;
  margin-bottom: 4px;
}

.page-header p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* Summary strip */
.summary-strip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 28px;
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.summary-divider {
  width: 1px;
  height: 36px;
  background: var(--border);
}

/* Table card */
.table-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.table-toolbar {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 14px;
}

.search-input {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  outline: none;
  flex: 1;
  max-width: 280px;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--accent);
}

.result-count {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-left: auto;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--surface-2);
}

th {
  padding: 12px 20px;
  text-align: left;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  white-space: nowrap;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover {
  color: var(--text-primary);
}

.sort-icon {
  opacity: 0.5;
  margin-left: 4px;
}

.th-num, .td-num {
  width: 48px;
  padding-left: 20px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.th-right {
  text-align: right;
}

tbody tr {
  border-top: 1px solid var(--border);
  transition: background 0.1s;
}

tbody tr:hover {
  background: var(--surface-2);
}

td {
  padding: 14px 20px;
  font-size: 0.9rem;
}

.td-name {
  font-weight: 500;
  color: var(--text-primary);
}

.td-date {
  color: var(--text-secondary);
  white-space: nowrap;
}

.td-miles {
  text-align: right;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  color: var(--accent);
  font-size: 1rem;
}

.no-results {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Loading skeletons */
.loading-rows {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  height: 44px;
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  to { background-position: -200% 0; }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
  }

  .summary-strip {
    flex-wrap: wrap;
    gap: 16px;
  }

  .summary-divider {
    display: none;
  }
}
</style>
