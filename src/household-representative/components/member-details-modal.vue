<script setup>
import { computed } from 'vue';
import { Member } from '../models/member.model.js';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  member: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible']);

const { t } = useI18n();

const memberInstance = computed(() => (props.member ? new Member(props.member) : null));

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
});

const dialogTitle = computed(() => {
  if (memberInstance.value) {
    return t('representativeMembers.details.title', { name: memberInstance.value.name });
  }
  return t('representativeMembers.details.genericTitle');
});

const statusLabel = computed(() => {
  if (!memberInstance.value) return '';
  const key = `representativeMembers.status.${memberInstance.value.status}`;
  const translated = t(key);
  return translated === key ? memberInstance.value.getStatusLabel() : translated;
});

const roleLabel = computed(() => {
  if (!memberInstance.value) return '';
  const key = `representativeMembers.roles.${memberInstance.value.role}`;
  const translated = t(key);
  return translated === key ? memberInstance.value.getRoleLabel() : translated;
});
</script>

<template>
  <pv-dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    :modal="true"
    :style="{ width: '50vw' }"
  >
    <div v-if="memberInstance" class="member-details">
      <div class="detail-row">
        <label>{{ t('representativeMembers.details.fields.name') }}</label>
        <span>{{ memberInstance.name }}</span>
      </div>
      <div class="detail-row">
        <label>{{ t('representativeMembers.details.fields.email') }}</label>
        <span>{{ memberInstance.email }}</span>
      </div>
      <div class="detail-row">
        <label>{{ t('representativeMembers.details.fields.status') }}</label>
        <pv-tag
          :value="statusLabel"
          :severity="memberInstance.getStatusSeverity()"
        />
      </div>
      <div class="detail-row">
        <label>{{ t('representativeMembers.details.fields.role') }}</label>
        <span>{{ roleLabel }}</span>
      </div>
      <div class="detail-row">
        <label>{{ t('representativeMembers.details.fields.total') }}</label>
        <span class="amount-highlight">{{ memberInstance.getFormattedTotalContributed() }}</span>
      </div>
    </div>
  </pv-dialog>
</template>

<style scoped>
.member-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #333;
}

.detail-row label {
  font-weight: bold;
  color: #ccc;
}

.amount-highlight {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.1rem;
}

:deep(.p-dialog) {
  background-color: #1a1a1a;
  color: white;
}

:deep(.p-dialog-header) {
  background-color: #2c3e50;
  color: white;
}
</style>
