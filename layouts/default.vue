<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-icon">📍</span>
          <span class="brand-name">Mileage Tracker</span>
        </div>

        <nav class="nav-links" v-if="isAuthenticated">
          <NuxtLink to="/" class="nav-link">Log Miles</NuxtLink>
          <NuxtLink to="/history" class="nav-link">History</NuxtLink>
        </nav>

        <div class="topbar-actions">
          <template v-if="isAuthenticated">
            <span class="user-pill">
              <span class="user-avatar">{{ initials }}</span>
              {{ account?.name }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="logout">Sign out</button>
          </template>
          <template v-else>
            <button class="btn btn-primary btn-sm" @click="login">
              Sign in with Microsoft
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { account, isAuthenticated, initAuth, login, logout } = useAuth()

onMounted(() => {
  // initAuth checks localStorage for existing accounts,
  // including those restored after a loginRedirect() return
  initAuth()
})

const initials = computed(() => {
  const name = account.value?.name || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

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
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
  text-decoration: none;
  flex-shrink: 0;
}

.brand-icon {
  font-size: 1.3rem;
}

.nav-links {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s;
  text-decoration: none;
}

.nav-link:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nav-link.router-link-active {
  background: var(--accent-light);
  color: var(--accent);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
}

.main-content {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 40px 24px;
}

/* Global button styles */
:global(.btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  white-space: nowrap;
}

:global(.btn-primary) {
  background: var(--accent);
  color: white;
  padding: 10px 20px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

:global(.btn-primary:hover) {
  background: var(--accent-dark);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

:global(.btn-primary:active) {
  transform: translateY(0);
}

:global(.btn-primary:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

:global(.btn-ghost) {
  background: transparent;
  color: var(--text-secondary);
  padding: 8px 14px;
  font-size: 0.875rem;
}

:global(.btn-ghost:hover) {
  background: var(--surface-2);
  color: var(--text-primary);
}

:global(.btn-sm) {
  padding: 6px 14px;
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .topbar-inner {
    padding: 0 16px;
    gap: 16px;
  }

  .brand-name {
    display: none;
  }

  .nav-links {
    gap: 2px;
  }

  .user-pill span:not(.user-avatar) {
    display: none;
  }

  .main-content {
    padding: 24px 16px;
  }
}
</style>
