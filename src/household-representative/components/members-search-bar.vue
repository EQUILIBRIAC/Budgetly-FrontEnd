<script setup>
import { ref, computed } from 'vue';
import { STATUS_OPTIONS, ROLE_OPTIONS } from '../models/member.model.js';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  searchTerm: {
    type: String,
    default: ''
  },
  statusFilter: {
    type: String,
    default: null
  },
  roleFilter: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:searchTerm', 'update:statusFilter', 'update:roleFilter', 'search', 'clear-filters']);

const localSearchTerm = ref(props.searchTerm);
const localStatusFilter = ref(props.statusFilter);
const localRoleFilter = ref(props.roleFilter);

const { t } = useI18n();

const translatedStatusOptions = computed(() =>
  STATUS_OPTIONS.map(option => ({
    ...option,
    label: t(`representativeMembers.filters.statusOptions.${option.value ?? 'all'}`)
  }))
);

const translatedRoleOptions = computed(() =>
  ROLE_OPTIONS.map(option => ({
    ...option,
    label: t(`representativeMembers.filters.roleOptions.${option.value ?? 'all'}`)
  }))
);

function handleSearch() {
  emit('update:searchTerm', localSearchTerm.value);
  emit('update:statusFilter', localStatusFilter.value);
  emit('update:roleFilter', localRoleFilter.value);
  emit('search');
}

function handleClearFilters() {
  localSearchTerm.value = '';
  localStatusFilter.value = null;
  localRoleFilter.value = null;
  emit('update:searchTerm', '');
  emit('update:statusFilter', null);
  emit('update:roleFilter', null);
  emit('clear-filters');
}
</script>

<template>
  <div class="search-filter-bar">
    <div class="search-section">
      <span class="p-input-icon-left">
        <i class="pi pi-search" />
        <pv-inputtext
          v-model="localSearchTerm"
          :placeholder="t('representativeMembers.filters.searchPlaceholder')"
          class="search-input"
          @keyup.enter="handleSearch"
        />
      </span>
    </div>

    <div class="filter-section">
      <pv-dropdown
        v-model="localStatusFilter"
        :options="translatedStatusOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('representativeMembers.filters.statusPlaceholder')"
        class="filter-dropdown"
      />

      <pv-dropdown
        v-model="localRoleFilter"
        :options="translatedRoleOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('representativeMembers.filters.rolePlaceholder')"
        class="filter-dropdown"
      />

      <pv-button
        :label="t('representativeMembers.filters.searchButton')"
        icon="pi pi-search"
        @click="handleSearch"
        class="search-button"
      />

      <pv-button
        :label="t('representativeMembers.filters.clearButton')"
        icon="pi pi-times"
        outlined
        @click="handleClearFilters"
        class="clear-button"
      />
    </div>
  </div>
</template>

<style scoped>
.search-filter-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-section {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
}

.filter-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-dropdown {
  min-width: 120px;
}

.search-button {
  background-color: #0D8ABC;
  border-color: #0D8ABC;
}

.clear-button {
  color: white;
  border-color: #666;
}

:deep(.p-inputtext) {
  background-color: #333;
  border-color: #555;
  color: white;
}

:deep(.p-dropdown) {
  background-color: #333;
  border-color: #555;
}

:deep(.p-dropdown-label) {
  color: white;
}

@media (max-width: 768px) {
  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-section {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
