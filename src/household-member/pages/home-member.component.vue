<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import httpInstance from '@/shared/services/http.instance';
import Button from 'primevue/button';

const router = useRouter();
const user = ref(null);
const representative = ref(null);
const sidebarCollapsed = ref(false);

const menuItems = computed(() => [
  { label: 'Home', icon: 'pi pi-home', route: '/dashboard/member' },
  { label: 'My Contributions', icon: 'pi pi-check-square', route: '/dashboard/member/contributions' },
  { label: 'Household Status', icon: 'pi pi-file', route: '/dashboard/member/household-status' },
  { label: 'Search Household', icon: 'pi pi-search', route: '/dashboard/member/search' },
  { label: 'Settings', icon: 'pi pi-sliders-h', route: '/dashboard/member/settings' }
]);

const menuGroups = computed(() => ({
  general: menuItems.value.slice(0, 3),
  tools: menuItems.value.slice(3)
}));

onMounted(async () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    user.value = JSON.parse(userData);
    await loadHouseholdInfo();
  }
});

async function loadHouseholdInfo() {
  try {
    const response = await httpInstance.get(`/user?householdId=${user.value.householdId}&role=representative`);
    if (response.data.length > 0) {
      representative.value = response.data[0];
    }
  } catch (error) {
    console.error('Error loading household information:', error);
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function navigateTo(route) {
  router.push(route);
}

function logout() {
  localStorage.removeItem('user');
  router.push('/login');
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Sidebar -->
    <aside :class="['sidebar', { collapsed: sidebarCollapsed }]">
      <div class="sidebar-header">
        <div class="brand" @click="navigateTo('/dashboard/member')">
          <img class="brand-logo" src="@/assets/harmonix_logo.png" alt="logo" />
        </div>
        <Button icon="pi pi-bars" text @click="toggleSidebar" class="toggle-btn" />
      </div>

      <div v-if="!sidebarCollapsed && user" class="profile-card">
        <img
          class="avatar"
          :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Miembro')}&background=E8F1FF&color=111827`"
          alt="avatar"
        />
        <div class="profile-name">{{ user.name }}</div>
        <div class="profile-role">Member</div>
        <div class="profile-divider"></div>
      </div>

      <div v-if="!sidebarCollapsed" class="section-title">General</div>
      <ul class="menu">
        <li
          v-for="item in menuGroups.general"
          :key="item.label"
          :class="{ active: router.currentRoute.value.path === item.route, 'general-item': true, 'dashboard-item': item.route === '/dashboard/member' }"
          @click="item.route && navigateTo(item.route)"
        >
          <div class="pill">
            <span class="icon-hold"><i :class="item.icon"></i></span>
            <span v-if="!sidebarCollapsed" class="pill-text">{{ item.label }}</span>
          </div>
        </li>
      </ul>

      <div v-if="!sidebarCollapsed" class="section-title">Tools</div>
      <ul class="menu">
        <li
          v-for="item in menuGroups.tools"
          :key="item.label"
          :class="{ active: router.currentRoute.value.path === item.route, 'settings-item': item.route?.endsWith('/settings') }"
          @click="item.route && navigateTo(item.route)"
        >
          <div :class="['pill', { 'pill-settings': item.route?.endsWith('/settings') }]">
            <span :class="['icon-hold', { 'icon-hold-settings': item.route?.endsWith('/settings') }]"><i :class="item.icon"></i></span>
            <span v-if="!sidebarCollapsed" class="pill-text">{{ item.label }}</span>
          </div>
        </li>
      </ul>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="logout-row" @click="logout">
          <i class="pi pi-undo logout-icon"></i>
          <span class="logout-text">Log Out</span>
        </div>
        <div v-else class="logout-icon-only" @click="logout">
          <i class="pi pi-undo logout-icon"></i>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: var(--surface-ground, #f8f9fa);
}

/* SIDEBAR (mockup style shared with representative) */
.sidebar {
  position: sticky;
  top: 0;
  width: 280px;
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  color: #0f172a;
  background: #fff;
  border-right: 1px solid #eef2f7;
  padding-bottom: 16px;
  transition: width 0.3s ease, background 0.3s ease;
}

.sidebar.collapsed { width: 92px; }

.sidebar-header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px 16px;
}
.brand { display:flex; align-items:center; cursor:pointer; }
.brand-logo { width:28px; height:28px; }
.toggle-btn { color:#0f172a; }

.profile-card{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
  padding:6px 16px 12px;
}
.profile-card .avatar{
  width:72px;
  height:72px;
  border-radius:999px;
  box-shadow:0 6px 16px rgba(0,0,0,.08);
  object-fit:cover;
}
.profile-name{
  margin-top:6px;
  font-weight:800;
  color:#0f172a;
}
.profile-role{
  font-size:.85rem;
  color:#6b7280;
}
.profile-divider{
  width:calc(100% - 32px);
  height:1px;
  background:#e5e7eb;
  margin-top:12px;
}

.section-title{
  font-size:.75rem;
  color:#6b7280;
  margin:10px 18px 4px;
  text-transform: uppercase;
  letter-spacing:.08em;
}

.menu{list-style:none;padding:6px 10px;margin:0;display:flex;flex-direction:column;gap:8px}
.menu li{cursor:pointer; position:relative}
.menu li.disabled{opacity:.5;cursor:default}
.menu .pill{display:flex;align-items:center;gap:40px;padding:8px 10px;border-radius:10px;transition:background .15s ease; box-shadow:none}
.menu .pill .icon-hold{width:28px;height:28px;display:grid;place-items:center;border-radius:10px;background:#eef2f7;color:#94a3b8}
.menu .pill i{font-size:.9rem}
.menu .pill:hover{background:#f8fafc}
.menu li.active .pill{background:#ffffff; box-shadow:none}
.menu li.active .pill .icon-hold{
  background: linear-gradient(180deg,#4facfe 0%, #00c6ff 100%);
  color:#ffffff;
  box-shadow: 0 8px 18px rgba(79,172,254,.45);
}
.menu li .pill .pill-text{ color:#475569; }
.menu li.active .pill .pill-text{color:#1d4ed8;font-weight:700}
.menu li.active::after{
  content:"";
  position:absolute;
  right:-6px;
  top:50%;
  transform:translateY(-50%);
  width:3px;
  height:24px;
  border-radius:2px;
  background: linear-gradient(180deg,#4facfe 0%, #00c6ff 100%);
}
.menu li.general-item .pill .icon-hold{ width:28px; height:28px; border-radius:8px; background:transparent; color:#a3add1; display:grid; place-items:center; }
.menu li.dashboard-item .pill .icon-hold{ background:transparent; color:#1da1ff; }
.menu li.dashboard-item .pill .icon-hold i{ color:#1da1ff; }
.menu li.general-item .pill .icon-hold i{ color:#a3add1; }
.menu li.general-item.active .pill .icon-hold{ background:transparent; color:#1d4ed8; box-shadow:none; }
.menu li.general-item.active .pill .icon-hold i{ color:#1da1ff; }
.menu li.general-item.active .pill .pill-text{ color:#1da1ff; font-weight:700; }
.menu li.settings-item .icon-hold-settings{
  width:28px; height:28px; border-radius:8px;
  background: transparent;
  color:#a3add1;
  display:grid; place-items:center;
}
.menu li.settings-item .icon-hold-settings i { font-size:1rem; line-height:1; color:#a3add1; }
.menu li.settings-item .pill-settings .pill-text{ color:#94a3b8; font-weight:500; }
.menu li.settings-item.active .pill-settings{ background: transparent; }
.menu li.settings-item.active .icon-hold-settings{ background: transparent; color:#4f46e5; box-shadow:none; }
.menu li.settings-item.active .icon-hold-settings i{ color:#4f46e5; }
.menu li.settings-item.active::after{ display:none; }
.pill-text{ font-size: .85rem; }

.sidebar-footer{ border-top:none; padding: 12px 20px 24px; margin-top:auto; }
.logout-row{ display:flex; align-items:center; gap:16px; cursor:pointer; }
.logout-icon{ color:#ef4444; font-size:1.35rem; }
.logout-text{ color:#0f172a; font-weight:600; }
.logout-icon-only{ display:grid; place-items:center; padding:8px 0; cursor:pointer; }

.main-content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  padding: 1rem;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100vh;
    z-index: 1000;
    left: 0;
    transform: translateX(0);
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
  }

  .main-content {
    flex: 1;
    min-width: 0;
    height: 100vh;
    padding: 1rem;
    margin-left: 0;
    overflow-y: auto;
  }
}

/* Ensure icons don't jump */
.menu li .pill { align-items: center; }
.menu li .pill:hover { transform: none; }
.menu .pill .icon-hold,
.menu .pill .icon-hold-settings { display: grid; place-items: center; }
.menu .pill i { display: block; line-height: 1; }
</style>
