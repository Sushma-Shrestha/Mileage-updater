<template>
  <div>
    <!-- ────────────────────────────────────────
         Not signed in — landing screen
    ──────────────────────────────────────── -->
    <div v-if="!isAuthenticated" class="landing">
      <div class="landing-card">
        <div class="landing-icon" aria-hidden="true">📍</div>
        <h1>Mileage Tracker</h1>
        <p>
          Log journeys straight into your OneDrive Excel file.
          Sign in with your personal Microsoft account to get started.
        </p>
        <button
          class="btn btn-primary btn-lg"
          type="button"
          @click="handleLogin"
        >
          <MicrosoftLogo />
          Sign in with Microsoft
        </button>
      </div>
    </div>

    <!-- ────────────────────────────────────────
         Signed in — form + recent entries
    ──────────────────────────────────────── -->
    <div v-else class="page-grid">

      <!-- ── Log entry form ── -->
      <section class="card" aria-labelledby="form-heading">
        <div class="card-head">
          <h2 id="form-heading">Log a Journey</h2>
          <p>Saved to <strong>Table 1</strong> in your Excel file.</p>
        </div>

        <form class="form" novalidate @submit.prevent="handleSubmit">

          <!-- Name -->
          <div class="field">
            <label for="field-name">Name</label>
            <input
              id="field-name"
              v-model="formName"
              type="text"
              placeholder="e.g. Jane Smith"
              autocomplete="name"
              required
              :disabled="saving"
            />
          </div>

          <!-- Date -->
          <div class="field">
            <label for="field-date">Date</label>
            <input
              id="field-date"
              v-model="formDate"
              type="date"
              required
              :max="todayISO"
              :disabled="saving"
            />
          </div>

          <!-- Miles -->
          <div class="field">
            <label for="field-miles">Miles</label>
            <div class="input-suffix-wrap">
              <input
                id="field-miles"
                v-model="formMiles"
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                required
                :disabled="saving"
              />
              <span class="input-suffix" aria-hidden="true">mi</span>
            </div>
          </div>

          <!-- Success / error feedback -->
          <Transition name="fade">
            <div
              v-if="successMsg"
              class="alert alert-ok"
              role="status"
              aria-live="polite"
            >
              ✓ {{ successMsg }}
            </div>
          </Transition>

          <Transition name="fade">
            <div
              v-if="errorMsg"
              class="alert alert-err"
              role="alert"
            >
              ⚠ {{ errorMsg }}
            </div>
          </Transition>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="saving"
          >
            <span v-if="saving" class="spinner" aria-hidden="true" />
            {{ saving ? 'Saving to Excel…' : 'Save Entry' }}
          </button>

        </form>
      </section>

      <!-- ── Recent entries panel ── -->
      <section class="card" aria-labelledby="recent-heading">
        <div class="card-head card-head-row">
          <h2 id="recent-heading">Recent Entries</h2>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="loadingList"
            @click="loadEntries"
          >
            {{ loadingList ? 'Loading…' : '↻ Refresh' }}
          </button>
        </div>

        <!-- Skeleton loaders -->
        <div v-if="loadingList" class="skeletons" aria-busy="true" aria-label="Loading entries">
          <div v-for="n in 4" :key="n" class="skeleton" />
        </div>

        <!-- Empty state -->
        <div v-else-if="entries.length === 0" class="empty">
          <span aria-hidden="true">📋</span>
          <p>No entries yet — log your first journey above.</p>
        </div>

        <!-- Entry rows (most recent first, max 5) -->
        <ul v-else class="entry-list" aria-label="Recent mileage entries">
          <li
            v-for="(entry, index) in recentEntries"
            :key="index"
            class="entry-row"
          >
            <div class="entry-meta">
              <span class="entry-name">{{ entry.name }}</span>
              <span class="entry-date">{{ formatDate(entry.date) }}</span>
            </div>
            <span class="entry-miles">
              {{ entry.miles }}<small>mi</small>
            </span>
          </li>
        </ul>

        <!-- Link to full history when there are more than 5 entries -->
        <div v-if="entries.length > 5" class="card-foot">
          <NuxtLink to="/history" class="btn btn-ghost btn-sm">
            View all {{ entries.length }} entries →
          </NuxtLink>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useState } from '#app'
import { useAuth } from '~/composables/useAuth'
import { useExcel, type MileageEntry } from '~/composables/useExcel'
import MicrosoftLogo from '~/components/MicrosoftLogo.vue'

// ── Auth ─────────────────────────────────────────────────────────────────────

const { isAuthenticated, login } = useAuth()

async function handleLogin(): Promise<void> {
  await login()
}

// ── Excel ─────────────────────────────────────────────────────────────────────

const { appendEntry, fetchEntries } = useExcel()

// ── Form state ────────────────────────────────────────────────────────────────

const todayISO: string = new Date().toISOString().split('T')[0]!

const formName  = ref<string>('')
const formDate  = ref<string>(todayISO)
const formMiles = ref<string>('')
const saving    = ref<boolean>(false)
const successMsg = ref<string>('')
const errorMsg   = ref<string>('')

// ── Entries state ─────────────────────────────────────────────────────────────

const entries     = ref<MileageEntry[]>([])
const loadingList = ref<boolean>(false)

// Show the 5 most recent entries, newest first
const recentEntries = computed<MileageEntry[]>(() =>
  [...entries.value].reverse().slice(0, 5),
)

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

function clearMessages(delayMs: number, which: 'success' | 'error'): void {
  setTimeout(() => {
    if (which === 'success') successMsg.value = ''
    else                     errorMsg.value   = ''
  }, delayMs)
}

// ── Form submit ───────────────────────────────────────────────────────────────

async function handleSubmit(): Promise<void> {
  saving.value     = true
  successMsg.value = ''
  errorMsg.value   = ''

  const entry: MileageEntry = {
    name:  formName.value.trim(),
    date:  formDate.value,
    miles: Number(formMiles.value),
  }

  try {
    await appendEntry(entry)
    successMsg.value = `${entry.miles} miles on ${formatDate(entry.date)} saved.`
    formMiles.value  = ''           // reset miles; keep name & date for quick re-entry
    clearMessages(5000, 'success')
    await loadEntries()             // refresh the recent panel
  } catch (err: unknown) {
    errorMsg.value =
      err instanceof Error
        ? err.message
        : 'Failed to save. Check your connection and try again.'
    clearMessages(8000, 'error')
  } finally {
    saving.value = false
  }
}

// ── Load entries ──────────────────────────────────────────────────────────────

async function loadEntries(): Promise<void> {
  loadingList.value = true
  try {
    entries.value = await fetchEntries()
  } catch {
    // Silently fail — the list is supplementary; the form still works
  } finally {
    loadingList.value = false
  }
}

// Load as soon as the user is authenticated (including after redirect login)
watch(
  isAuthenticated,
  (authenticated: boolean) => {
    if (authenticated) loadEntries()
  },
  { immediate: true },
)
</script>

<style scoped>
/* ── Landing ── */
.landing {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.landing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 52px 44px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: var(--shadow-md);
}

.landing-icon { font-size: 2.8rem; margin-bottom: 18px; display: block; }
.landing-card h1 { font-size: 1.9rem; margin-bottom: 10px; }
.landing-card p  {
  color: var(--text-2);
  font-size: 0.95rem;
  line-height: 1.65;
  margin-bottom: 28px;
}

/* ── Page grid ── */
.page-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 820px) {
  .page-grid { grid-template-columns: 1fr; }
}

/* ── Card ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.card-head {
  padding: 24px 28px 0;
  margin-bottom: 22px;
}

.card-head h2 { font-size: 1.15rem; margin-bottom: 4px; }
.card-head p  { font-size: 0.85rem; color: var(--text-2); }

.card-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-foot {
  padding: 14px 28px;
  border-top: 1px solid var(--border);
  text-align: center;
}

/* ── Form ── */
.form {
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

.field input,
.input-suffix-wrap input {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.95rem;
  color: var(--text);
  background: var(--surface);
  outline: none;
  width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field input:focus,
.input-suffix-wrap input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.field input::placeholder { color: var(--text-3); }
.field input:disabled      { opacity: 0.6; cursor: not-allowed; }

/* Miles input with "mi" suffix */
.input-suffix-wrap          { position: relative; }
.input-suffix-wrap input    { padding-right: 40px; }
.input-suffix {
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-3);
  pointer-events: none;
  user-select: none;
}

/* ── Alert messages ── */
.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-ok  {
  background: var(--green-lt);
  color: var(--green);
  border: 1px solid #a7f3d0;
}

.alert-err {
  background: var(--red-lt);
  color: var(--red);
  border: 1px solid #fecaca;
}

/* ── Spinner ── */
.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Skeleton loaders ── */
.skeletons {
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  height: 52px;
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
.empty {
  padding: 36px 28px;
  text-align: center;
  color: var(--text-3);
}

.empty span { font-size: 2rem; display: block; margin-bottom: 10px; }
.empty p    { font-size: 0.88rem; }

/* ── Entry list ── */
.entry-list {
  list-style: none;
  padding: 0 28px;
}

.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid var(--border);
}

.entry-row:last-child { border-bottom: none; }

.entry-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entry-name { font-weight: 500; font-size: 0.92rem; }
.entry-date { font-size: 0.78rem; color: var(--text-3); }

.entry-miles {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--accent);
}

.entry-miles small {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-3);
  margin-left: 2px;
}

/* ── Transition ── */
.fade-enter-active,
.fade-leave-active  { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from,
.fade-leave-to      { opacity: 0; transform: translateY(-5px); }
</style>
