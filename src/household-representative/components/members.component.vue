<script setup>
import { ref, onMounted, computed } from 'vue';
import memberPipeline from '../services/member-assembler.service.js';
import { MemberFilters } from '../models/member.model.js';
import MembersTable from './members-table.vue';
import MembersSearchBar from './members-search-bar.vue';
import MemberDetailsModal from './member-details-modal.vue';
import AddMemberForm from './add-member-form.vue';
import { HouseholdService } from '@/households/infrastructure/household.service';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
const toast = useToast();
const { t } = useI18n();

const members = ref([]);
const loading = ref(false);
const error = ref('');
const filters = ref(new MemberFilters());
const showAddMemberDialog = ref(false);
const showMemberDetailsDialog = ref(false);
const selectedMember = ref(null);
const user = ref(null);
const plan = ref('FREE');
const household = ref(null);
const households = ref([]);
const selectedHouseholdId = ref('');

const filteredMembers = computed(() => members.value.filter(member => (member.role || '').toLowerCase() === 'member'));

onMounted(async () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    user.value = JSON.parse(userData);
    plan.value = user.value?.plan || 'FREE';
    selectedHouseholdId.value = user.value?.householdId || '';
  }
  await Promise.all([loadHouseholds(), loadMembers(), loadHousehold()]);
});

async function loadMembers() {
  loading.value = true;
  error.value = '';
  try {
    members.value = await memberPipeline.processMemberData(filters.value, selectedHouseholdId.value);
  } catch (err) {
    error.value = t('representativeMembers.toasts.loadError');
    console.error('Error loading members:', err);
  } finally {
    loading.value = false;
  }
}

async function loadHousehold() {
  try {
    if (!selectedHouseholdId.value) return;
    household.value = await HouseholdService.getHouseholdById(selectedHouseholdId.value);
  } catch (err) {
    console.error('Error loading household info:', err);
  }
}

async function loadHouseholds() {
  try {
    if (!user.value?.id) return;
    households.value = await HouseholdService.getHouseholds(user.value.id);
    if (!selectedHouseholdId.value && households.value.length) {
      selectedHouseholdId.value = households.value[0].id;
    }
  } catch (err) {
    console.error('Error loading households list:', err);
  }
}

async function handleSearch() {
  await loadMembers();
}

async function handleClearFilters() {
  filters.value.clear();
  await loadMembers();
}

function handleViewMember(member) {
  selectedMember.value = member;
  showMemberDetailsDialog.value = true;
}

function addNewMember() {
  if (!canAddMember.value) {
    const cap = Number(household.value?.memberCount || 0);
    toast.add({
      severity: 'warn',
      summary: t('representativeMembers.toasts.limit.summary'),
      detail: t('representativeMembers.toasts.limit.detail', { count: cap }),
      life: 3000
    });
    return;
  }
  showAddMemberDialog.value = true;
}

async function handleUpdateSearchTerm(value) {
  filters.value.searchTerm = value;
  await loadMembers();
}

async function handleUpdateStatusFilter(value) {
  filters.value.statusFilter = value;
  await loadMembers();
}

async function handleUpdateRoleFilter(value) {
  filters.value.roleFilter = value;
  await loadMembers();
}

async function handleMemberAdded() {
  await loadMembers();
  await loadHousehold();
}

const maxMembers = computed(() => {
  const m = Number(household.value?.memberCount);
  return Number.isFinite(m) && m > 0 ? m : null;
});

const canAddMember = computed(() => {
  if (!maxMembers.value) return true;
  return filteredMembers.value.length < maxMembers.value;
});

const householdOptions = computed(() =>
  households.value.map(h => ({ label: h.name ? `${h.name} (${h.id})` : h.id, value: h.id }))
);

function onSelectHousehold(id) {
  selectedHouseholdId.value = id;
  loadMembers();
  loadHousehold();
}
</script>

<template>
  <div class="members-container">
    <div class="welcome-card border-round mb-3">
      <div class="flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="title m-0">{{ t('representativeMembers.header.title') }}</h1>
          <p class="subtitle mt-2 mb-0">{{ t('representativeMembers.header.subtitle') }}</p>
        </div>
        <div class="flex align-items-center gap-2">
          <div class="members-count-pill">
            <i class="pi pi-users mr-2"></i>
            <strong>{{ filteredMembers.length }}</strong>
            <span>{{ t('representativeMembers.header.membersSuffix') }}</span>
          </div>
          <button
            class="notif-bell"
            :title="t('representativeMembers.header.notifications')"
            :aria-label="t('representativeMembers.header.notifications')"
            type="button"
          >
            <i class="pi pi-bell"></i>
            <span class="dot-indicator" />
          </button>
        </div>
      </div>
    </div>

    <div class="search-section mb-3">
      <div class="flex align-items-center gap-2 mb-2" v-if="householdOptions.length">
        <span class="text-sm font-semibold">{{ t('representativeMembers.header.householdSelector') }}</span>
        <pv-dropdown
          :options="householdOptions"
          option-label="label"
          option-value="value"
          v-model="selectedHouseholdId"
          class="w-20rem"
          @change="onSelectHousehold($event.value)"
        />
      </div>
      <MembersSearchBar
        :search-term="filters.searchTerm"
        :status-filter="filters.statusFilter"
        :role-filter="filters.roleFilter"
        @update:search-term="handleUpdateSearchTerm"
        @update:status-filter="handleUpdateStatusFilter"
        @update:role-filter="handleUpdateRoleFilter"
        @search="handleSearch"
        @clear-filters="handleClearFilters"
      />
    </div>

    <pv-message v-if="error" severity="error" :closable="false" class="mb-3">
      {{ error }}
    </pv-message>

    <pv-card class="members-card">
      <template #content>
        <MembersTable
          :members="filteredMembers"
          :loading="loading"
          @view-member="handleViewMember"
        />
      </template>
    </pv-card>

    <div class="add-member-section">
      <pv-button
        icon="pi pi-plus"
        :label="t('representativeMembers.actions.addMember')"
        class="add-member-button"
        @click="addNewMember"
        :disabled="!canAddMember"
      />
    </div>

    <MemberDetailsModal
      v-model:visible="showMemberDetailsDialog"
      :member="selectedMember"
    />

    <AddMemberForm
      v-model:visible="showAddMemberDialog"
      :household-id="selectedHouseholdId"
      @member-added="handleMemberAdded"
    />
  </div>
</template>

<style scoped>
.members-container {
  padding: 1rem;
  background: #f8f9fa;
  min-height: 100vh;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.members-card {
  background: #fff;
  border: 1px solid rgba(15,23,42,.06);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15,23,42,.06);
  overflow: hidden;
}

.add-member-section {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.add-member-button {
  background: linear-gradient(135deg, #1e6dff 0%, #ff7a18 100%);
  border: none;
  color: #fff;
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(30,109,255,.25);
  transition: all .2s ease;
}

.add-member-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(30,109,255,.35);
}

.add-member-form {
  padding: 1rem 0;
}

:deep(.p-card) {
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(15,23,42,.06);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15,23,42,.06);
}

:deep(.p-dialog) {
  background: #fff;
  color: #0f172a;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(15,23,42,.15);
}

:deep(.p-dialog-header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #0f172a;
  border-bottom: 1px solid rgba(15,23,42,.08);
  border-radius: 16px 16px 0 0;
}

:deep(.p-dialog-content) {
  padding: 2rem;
}

:deep(.p-dialog-footer) {
  padding: 1.5rem;
  border-top: 1px solid rgba(15,23,42,.08);
}

:deep(.p-message) {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
}

:deep(.p-message.p-message-error) {
  background: #fef2f2;
  color: #dc2626;
  border-left: 4px solid #dc2626;
}

:deep(.p-button) {
  border-radius: 10px;
  font-weight: 600;
  transition: all .2s ease;
}

:deep(.p-button.p-button-primary) {
  background: linear-gradient(135deg, #1e6dff 0%, #ff7a18 100%);
  border: none;
  color: #fff;
  box-shadow: 0 4px 12px rgba(30,109,255,.25);
}

:deep(.p-button.p-button-primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(30,109,255,.35);
}

.welcome-card {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  padding: 1.25rem 1.5rem;
}

.welcome-card .title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
}

.welcome-card .subtitle {
  color: #6b7280;
}

.members-count-pill {
  padding: .45rem .7rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid rgba(15,23,42,.08);
  font-size: 0.9rem;
}

.notif-bell {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:38px;
  height:38px;
  border-radius:999px;
  background:#f1f5f9;
  border:1px solid rgba(15,23,42,.08);
  color:#0f172a;
  position:relative;
  transition: all .15s ease;
  cursor: pointer;
}

.notif-bell:hover {
  background:#fff;
  box-shadow:0 6px 14px rgba(15,23,42,.08);
  transform: translateY(-1px);
}

.notif-bell i {
  font-size: 1rem;
}

.notif-bell .dot-indicator {
  position:absolute;
  top:6px;
  right:8px;
  width:8px;
  height:8px;
  border-radius:999px;
  background:#22c55e;
  box-shadow:0 0 0 2px #fff;
}

.search-section {
  background: #fff;
  border: 1px solid rgba(15,23,42,.06);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(15,23,42,.04);
}

@media (max-width: 768px) {
  .members-container {
    padding: 1rem;
  }

  .welcome-card .title {
    font-size: 1.5rem;
  }

  .welcome-card .flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
