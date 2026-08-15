<template>
  <div>
    <!-- Unauthenticated state -->
    <div v-if="!isAuthenticated" class="landing">
      <div class="landing-card">
        <div class="landing-icon">📍</div>
        <h1>Mileage Tracker</h1>
        <p>Log your journeys directly into your OneDrive Excel spreadsheet. Sign in with your Microsoft account to get started.</p>
        <button class="btn btn-primary btn-lg" @click="login">
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>

    <!-- Authenticated state -->
    <div v-else class="page-layout">
      <!-- Form Card -->
      <div class="form-card">
        <div class="card-header">
          <h2>Log a Journey</h2>
          <p>This will be added to <strong>Table 1</strong> in your Excel file.</p>
        </div>

        <form class="entry-form" @submit.prevent="submitEntry">
          <div class="field">
            <label for="name">Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="e.g. John Smith"
              required
              :disabled="submitting"
            />
          </div>

          <div class="field">
            <label for="date">Date</label>
            <input
              id="date"
              v-model="form.date"
              type="date"
              required
              :disabled="submitting"
              :max="today"
            />
          </div>

          <div class="field">
            <label for="miles">Miles</label>
            <div class="input-with-unit">
              <input
                id="miles"
                v-model="form.miles"
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                required
                :disabled="submitting"
              />
              <span class="unit-label">mi</span>
            </div>
          </div>

          <!-- Status messages -->
          <Transition name="fade">
            <div v-if="successMsg" class="status-msg status-success">
              <span class="status-icon">✓</span>
              {{ successMsg }}
            </div>
          </Transition>

          <Transition name="fade">
            <div v-if="errorMsg" class="status-msg status-error">
              <span class="status-icon">⚠</span>
              {{ errorMsg }}
            </div>
          </Transition>

          <button
            type="submit"
            class="btn btn-primary btn-submit"
            :disabled="submitting"
          >
            <span v-if="submitting" class="spinner" />
            {{ submitting ? 'Saving to Excel…' : 'Save Entry' }}
          </button>
        </form>
      </div>

      <!-- Recent entries preview -->
      <div class="recent-card">
        <div class="card-header">
          <h2>Recent Entries</h2>
          <button class="btn btn-ghost btn-sm" @click="loadEntries" :disabled="loadingEntries">
            {{ loadingEntries ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loadingEntries" class="entries-loading">
          <div class="skeleton" v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="entries.length === 0" class="entries-empty">
          <span class="empty-icon">📋</span>
          <p>No entries yet. Log your first journey above.</p>
        </div>

        <div v-else class="entries-list">
          <div
            class="entry-row"
            v-for="(entry, i) in recentEntries"
            :key="i"
          >
            <div class="entry-meta">
              <span class="entry-name">{{ entry.name }}</span>
              <span class="entry-date">{{ formatDate(entry.date) }}</span>
            </div>
            <span class="entry-miles">{{ entry.miles }} <small>mi</small></span>
          </div>
        </div>

        <div v-if="entries.length > 5" class="entries-more">
          <NuxtLink to="/history" class="btn btn-ghost btn-sm">
            View all {{ entries.length }} entries →
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, login } = useAuth()
const { appendEntry, fetchEntries } = useExcel()

const today = new Date().toISOString().split('T')[0]

const form = reactive({
  name: '',
  date: today,
  miles: '' as string | number,
})

const submitting = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const entries = ref<{ name: string; date: string; miles: number }[]>([])
const loadingEntries = ref(false)

const recentEntries = computed(() => [...entries.value].reverse().slice(0, 5))

const formatDate = (d: string) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return d
  }
}

const submitEntry = async () => {
  submitting.value = true
  successMsg.value = ''
  errorMsg.value = ''

  try {
    await appendEntry({
      name: form.name.trim(),
      date: form.date,
      miles: Number(form.miles),
    })

    successMsg.value = `Entry saved — ${form.miles} miles on ${formatDate(form.date)}`

    // Reset form (keep name & date)
    form.miles = ''

    // Refresh entries list
    await loadEntries()

    setTimeout(() => { successMsg.value = '' }, 5000)
  } catch (err: any) {
    errorMsg.value = err?.message || 'Failed to save. Check your connection and Excel file ID.'
    setTimeout(() => { errorMsg.value = '' }, 8000)
  } finally {
    submitting.value = false
  }
}

const loadEntries = async () => {
  loadingEntries.value = true
  try {
    entries.value = await fetchEntries()
  } catch {
    // silently fail on history load
  } finally {
    loadingEntries.value = false
  }
}

watch(isAuthenticated, (val) => {
  if (val) loadEntries()
}, { immediate: true })
</script>

<style scoped>
/* Landing */
.landing {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.landing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 56px 48px;
  text-align: center;
  max-width: 440px;
  width: 100%;
  box-shadow: var(--shadow-md);
}

.landing-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.landing-card h1 {
  font-size: 2rem;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.landing-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
  font-size: 0.95rem;
}

.btn-lg {
  padding: 14px 28px;
  font-size: 1rem;
}

/* Page layout */
.page-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 24px;
  align-items: start;
}

/* Cards */
.form-card,
.recent-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding: 24px 28px 0;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-header h2 {
  font-size: 1.2rem;
  color: var(--text-primary);
}

.card-header p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

/* Form */
.entry-form {
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.field input {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}

.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.field input::placeholder {
  color: var(--text-muted);
}

.field input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-with-unit {
  position: relative;
}

.input-with-unit input {
  padding-right: 44px;
}

.unit-label {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  pointer-events: none;
}

.btn-submit {
  width: 100%;
  padding: 12px;
  font-size: 0.95rem;
  margin-top: 4px;
}

/* Status messages */
.status-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
}

.status-success {
  background: var(--success-light);
  color: var(--success);
  border: 1px solid #a7f3d0;
}

.status-error {
  background: var(--error-light);
  color: var(--error);
  border: 1px solid #fecaca;
}

.status-icon {
  font-weight: 700;
  font-size: 1rem;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Recent entries */
.entries-loading {
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  height: 52px;
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  to { background-position: -200% 0; }
}

.entries-empty {
  padding: 40px 28px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 12px;
}

.entries-empty p {
  font-size: 0.9rem;
  line-height: 1.5;
}

.entries-list {
  padding: 0 28px;
}

.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entry-name {
  font-weight: 500;
  font-size: 0.925rem;
  color: var(--text-primary);
}

.entry-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.entry-miles {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--accent);
}

.entry-miles small {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 2px;
}

.entries-more {
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  text-align: center;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: all 0.25s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Responsive */
@media (max-width: 800px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}
</style>
