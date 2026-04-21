<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import httpInstance from '@/shared/services/http.instance';
import Button from 'primevue/button';
import HouseholdModal from '@/households/presentation/components/household-modal.component.vue';
import { useI18n } from 'vue-i18n';
import { HouseholdApi } from '@/households/infrastructure/household-api';

const router = useRouter();
const user = ref(null);
const members = ref([]);
const sidebarCollapsed = ref(false);
const showHouseholdModal = ref(false);

const { t } = useI18n();
const menuItems = computed(() => [
  { label: t('sidebar.dashboard'), icon: 'pi pi-th-large', route: '/dashboard/representative' },
  { label: t('sidebar.households'), icon: 'pi pi-home', route: '/dashboard/representative/households' },
  { label: t('sidebar.members'), icon: 'pi pi-users', route: '/dashboard/representative/members' },
  { label: t('sidebar.expenses'), icon: 'pi pi-wallet', route: '/dashboard/representative/expenses' },
  { label: t('sidebar.contributions'), icon: 'pi pi-chart-bar', route: '/dashboard/representative/contribution' },
  { label: t('sidebar.settings'), icon: 'pi pi-sliders-h', route: '/dashboard/representative/settings' },
  { label: t('sidebar.profile'), icon: 'pi pi-user', route: '/dashboard/representative/profile' }
]);

const menuGroups = computed(() => ({
  general: menuItems.value.slice(0, 5),
  tools: menuItems.value.slice(5)
}));

onMounted(async () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    user.value = JSON.parse(userData);
    const isNewUser =
      localStorage.getItem('isNewUser') === 'true' ||
      user.value?.isNewUser === true;
    if (isNewUser) {
      // Check Free-plan limit before showing modal
      const plan = String(user.value?.plan || 'FREE').toUpperCase();
      if (plan === 'FREE') {
        const existing = await HouseholdApi.listByRepresentative(user.value.id);
        if (Array.isArray(existing) && existing.length >= 1) {
          localStorage.removeItem('isNewUser');
          user.value.isNewUser = false;
          showHouseholdModal.value = false;
          await ensureHouseholdForRepresentative();
          await loadHouseholdMembers();
          return;
        }
      }
      showHouseholdModal.value = true;
    } else {
      await ensureHouseholdForRepresentative();
      await loadHouseholdMembers();
    }
  }
});

async function ensureHouseholdForRepresentative() {
  if (!user.value || user.value.role !== 'representative') return;

  const payload = {
    id: user.value.householdId || null,
    name: 'New Household',
    description: '',
    memberCount: 1,
    representativeId: user.value.id,
    currency: 'USD'
  };

  // If we already have an id, verify it exists; otherwise create a new one and replace it
  if (user.value.householdId) {
    try {
      const existing = await HouseholdApi.getById(user.value.householdId);
      if (existing?.id) {
        localStorage.setItem('householdId', existing.id);
        return; // OK, it exists
      }
    } catch (_) {
      // If 404, fall through and create a new one
    }
  }

  const created = await HouseholdApi.create(payload);
  user.value.householdId = created?.id || '';
  localStorage.setItem('user', JSON.stringify(user.value));
  if (user.value.householdId) localStorage.setItem('householdId', user.value.householdId);
}

async function loadHouseholdMembers() {
  if (!user.value?.householdId) return;
  try {
    const response = await httpInstance.get(`/household_member/household/${user.value.householdId}`);
    members.value = response.data;
  } catch (error) {
    console.error('Error loading household members:', error);
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
  localStorage.removeItem('isNewUser');
  router.push('/login');
}

async function removeMember(memberId) {
  try {
    await httpInstance.delete(`/user/user/${memberId}`);
    await loadHouseholdMembers();
  } catch (error) {
    console.error('Error removing member:', error);
  }
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Sidebar (mockup style) -->
    <aside :class="['sidebar', { collapsed: sidebarCollapsed }]">
      <div class="sidebar-header">
        <div class="brand" @click="navigateTo('/dashboard/representative')">
          <img class="brand-logo" src="@/assets/harmonix_logo.png" alt="logo" />
        </div>
        <Button icon="pi pi-bars" text @click="toggleSidebar" class="toggle-btn" />
      </div>

            <!-- Profile header (as in mockup) -->
      <div v-if="!sidebarCollapsed && user" class="profile-card">
        <img
          class="avatar"
          :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=E8F1FF&color=111827`"
          alt="avatar"
        />
        <div class="profile-name">{{ user.name }}</div>
        <div class="profile-role">Representative</div>
        <div class="profile-divider"></div>
      </div>
      <div v-if="!sidebarCollapsed" class="section-title">General</div>
      <ul class="menu">
        <li v-for="item in menuGroups.general"
            :key="item.label"
            :class="{ active: router.currentRoute.value.path === item.route, 'general-item': true, 'dashboard-item': item.route === '/dashboard/representative' }"
            @click="!item.disabled && item.route && navigateTo(item.route)">
          <div class="pill">
            <span class="icon-hold"><i :class="item.icon"></i></span>
            <span v-if="!sidebarCollapsed" class="pill-text">{{ item.label }}</span>
          </div>
        </li>
      </ul>

      <div v-if="!sidebarCollapsed" class="section-title">Tools</div>
      <ul class="menu">
        <li v-for="item in menuGroups.tools"
            :key="item.label"
            :class="{ active: router.currentRoute.value.path === item.route, disabled: item.disabled, 'settings-item': item.route?.endsWith('/settings') }"
            @click="!item.disabled && item.route && navigateTo(item.route)">
          <div :class="['pill', { 'pill-settings': item.route?.endsWith('/settings') }]">
            <span :class="['icon-hold', { 'icon-hold-settings': item.route?.endsWith('/settings') }]"><i :class="item.icon"></i></span>
            <span v-if="!sidebarCollapsed" class="pill-text">{{ item.label }}</span>
          </div>
        </li>
      </ul>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="logout-row" @click="logout">
          <i class="pi pi-undo logout-icon"></i>
          <span class="logout-text">{{ t('sidebar.logout') }}</span>
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

    <HouseholdModal
      v-if="showHouseholdModal"
      :visible="showHouseholdModal"
      :householdId="user?.householdId || ''"
      @update:visible="showHouseholdModal = $event"
    />
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

/* SIDEBAR (futuristic glassmorphism) */
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
  /* Stronger contrast so items are readable over light backgrounds */
  color: #e6ecff;
  background:
    linear-gradient(180deg, rgba(16,24,40,0.60) 0%, rgba(16,24,40,0.50) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%);
  border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%); /* flush left side */
  margin: 0; /* stick to the left edge */
  padding-bottom: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
  transition: width 0.3s ease, background 0.3s ease;
}

.sidebar.collapsed { width: 92px; }



.sidebar-header {
  display:flex;
  align-items:center; justify-content:space-between; padding:12px 16px; }
.logo {
  display:flex;
  align-items:center;
  gap: 0.75rem;
  cursor:pointer;
  font-weight:700; color:#f5f7ff; font-size:1.1rem; }
.toggle-btn { color:#f5f7ff; }

.user-profile { display:flex; align-items:center;
  gap:1rem; padding:10px 16px; }
.user-profile img { width:46px; height:46px; border-radius:50%;
  object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.25); }
.user-profile h4 { margin:0; font-size:1rem; }
.user-profile p { margin:0; font-size:.85rem; color:#d6def8; opacity:.85; }

.menu { list-style:none; padding:8px; margin:6px 0; flex-grow:1; display:flex; flex-direction:column; gap:8px; }
.menu li { cursor:pointer; }
.menu .pill {
  display:flex; align-items:center; gap:12px;
  padding:10px 14px; border-radius:12px; transition:all .2s ease;
  color:#e6ecff;
}
.menu li .pill:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
.menu li.active .pill {
  /* Brand gradient based on HarMoniX palette (blue 👉 orange) */
  background: #001b2e;
  color:#f3f3f3;
  box-shadow: 0 8px 20px rgba(166, 195, 250, 0.25);
}
.menu i { font-size:1.15rem; color:#ffffff; }
.menu li.active i { color:#ffffff; }

.sidebar-footer { padding:8px 12px; border-top: 1px solid rgba(255,255,255,0.15); }

/* Logout button themed to sidebar */
:deep(.sidebar-footer .p-button) {
  width: 100%;
  justify-content: flex-start;
  color: #e6ecff !important;
  background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
}
:deep(.sidebar-footer .p-button:hover) {
  background: linear-gradient(135deg, rgba(30,109,255,0.28) 0%, rgba(255,122,24,0.22) 100%);
  box-shadow: 0 6px 16px rgba(30,109,255,0.25);
}

  .main-content {
    flex: 1;
    min-width: 0;
    height: 100vh;
    padding: 1rem;
    transition: margin-left 0.3s ease;
    overflow-y: auto;
  }
/* --- Overrides to match mockup (light sidebar) --- */
.sidebar { background:#fff; color:#0f172a; border-right:1px solid #eef2f7; width:260px; padding-bottom:16px; }
.sidebar-header{padding:14px 16px}
.brand{display:flex;align-items:center;cursor:pointer}
.brand-logo{width:28px;height:28px}
.toggle-btn{color:#0f172a}
.section-title{font-size:.75rem;color:#6b7280;margin:10px 18px 4px; text-transform: uppercase; letter-spacing:.08em}
/* Profile header */
.profile-card{ display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 16px 12px; }
.profile-card .avatar{ width:72px; height:72px; border-radius:999px; box-shadow: 0 6px 16px rgba(0,0,0,.08); object-fit:cover; }
.profile-name{ margin-top:6px; font-weight:800; color:#0f172a; }
.profile-role{ font-size:.85rem; color:#6b7280; }
.profile-divider{ width:calc(100% - 32px); height:1px; background:#e5e7eb; margin-top:12px; }
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
  content:""; position:absolute; right:-6px; top:50%; transform:translateY(-50%);
  width:3px; height:24px; border-radius:2px;
  background: linear-gradient(180deg,#4facfe 0%, #00c6ff 100%);
}
/* General icons styled like Settings (transparent, subtle color) */
.menu li.general-item .pill .icon-hold{ width:28px; height:28px; border-radius:8px; background:transparent; color:#a3add1; display:grid; place-items:center; }
.menu li.dashboard-item .pill .icon-hold{ background:transparent; color:#1da1ff; }
.menu li.dashboard-item .pill .icon-hold i{ color:#1da1ff; }
.menu li.general-item .pill .icon-hold i{ color:#a3add1; }
.menu li.general-item.active .pill .icon-hold{ background:transparent; color:#1d4ed8; box-shadow:none; }
.menu li.general-item.active .pill .icon-hold i{ color:#1da1ff; }
.menu li.general-item.active .pill .pill-text{ color:#1da1ff; font-weight:700; }
/* Settings item special style (mockup) */
.menu li.settings-item .icon-hold-settings{
  width:28px; height:28px; border-radius:8px;
  background: transparent; /* sin cápsula amarilla, como el mock */
  color:#a3add1;
  display:grid; place-items:center;
}
.menu li.settings-item .icon-hold-settings i { font-size:1rem; line-height:1; color:#a3add1; }
/* Texto de Settings similar a Profile */
.menu li.settings-item .pill-settings .pill-text{ color:#94a3b8; font-weight:500; }
.menu li.settings-item.active .pill-settings{ background: transparent; }
.menu li.settings-item.active .icon-hold-settings{ background: transparent; color:#4f46e5; box-shadow:none; }
.menu li.settings-item.active .icon-hold-settings i{ color:#4f46e5; }
.menu li.settings-item.active::after{ display:none; }
/* Slightly smaller text for pill labels */
.pill-text{ font-size: .85rem; }


.sidebar-footer{border-top:1px solid #eef2f7;margin-top:auto}
:deep(.sidebar-footer .p-button){width:100%;justify-content:flex-start;color:#0f172a!important}

.main-content{width:100%}
/* Footer/log out area styled like mockup */
.sidebar-footer{ border-top:none; padding: 12px 20px 24px; margin-top:auto; }
.logout-row{ display:flex; align-items:center; gap:16px; cursor:pointer; }
.logout-icon{ color:#ef4444; font-size:1.35rem; }
.logout-text{ color:#0f172a; font-weight:600; }
.logout-icon-only{ display:grid; place-items:center; padding:8px 0; cursor:pointer; }

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

/* Fix: avoid icon jump/disappear on hover */
/* Ensure stable dimensions and remove transforms that reflow the row */
.menu li .pill { align-items: center; }
.menu li .pill:hover { transform: none; }
.menu .pill .icon-hold,
.menu .pill .icon-hold-settings { display: grid; place-items: center; }
.menu .pill i { display: block; line-height: 1; }
</style>
