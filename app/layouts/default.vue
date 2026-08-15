<template>
  <div class="shell">
    <!-- ── Top navigation bar ── -->
    <header class="topbar">
      <div class="topbar-inner">
        <span class="brand">📍 Mileage Tracker</span>

        <nav v-if="isAuthenticated" class="nav" aria-label="Main navigation">
          <NuxtLink to="/" class="nav-link">Log Miles</NuxtLink>
          <NuxtLink to="/history" class="nav-link">History</NuxtLink>
        </nav>

        <div class="topbar-end">
          <template v-if="isAuthenticated">
            <span class="user-pill">
              <span class="avatar" aria-hidden="true">{{ initials }}</span>
              <span class="user-name">{{ account?.name }}</span>
            </span>
            <button class="btn btn-ghost btn-sm" type="button" @click="handleLogout">
              Sign out
            </button>
          </template>

          <template v-else>
            <button class="btn btn-primary btn-sm" type="button" @click="handleLogin">
              <MicrosoftLogo />
              Sign in with Microsoft
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- ── Page content ── -->
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import MicrosoftLogo from '~/components/MicrosoftLogo.vue'

const { account, isAuthenticated, initAuth, login, logout } = useAuth()

const initials = computed<string>(() => {
  const name: string = account.value?.name ?? ''
  return (
    name
      .split(' ')
      .map((part: string) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
})

async function handleLogin(): Promise<void> {
  await login()
}

async function handleLogout(): Promise<void> {
  await logout()
}

onMounted(() => {
  // Restore session from localStorage (including accounts returned after redirect)
  initAuth()
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ── */
.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.topbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
  flex-shrink: 0;
}

/* ── Nav links ── */
.nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-2);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: var(--surface-2);
  color: var(--text);
}

/* router-link-active is added by Vue Router on the matching link */
.nav-link.router-link-active {
  background: var(--accent-lt);
  color: var(--accent);
}

/* ── Topbar right side ── */
.topbar-end {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--text-2);
  font-weight: 500;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  flex-shrink: 0;
}

/* ── Page content ── */
.content {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 40px 24px;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .topbar-inner { padding: 0 16px; }
  .user-name    { display: none; }
  .content      { padding: 24px 16px; }
}
</style>
