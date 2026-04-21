<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InvitationService from '@/invitations/infrastructure/invitation.service';
import { HouseholdService } from '@/households/infrastructure/household.service';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  householdId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:visible', 'member-added']);

const toast = useToast();
const { t } = useI18n();

const formData = ref({
  email: '',
  householdId: '',
  description: ''
});

const loading = ref(false);
const errors = ref({});
const availableHouseholds = ref([]);
const householdsLoading = ref(false);
const representativeId = ref(null);

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
});

const dialogTitle = computed(() => t('representativeMembers.addMember.title'));

const isFormValid = computed(() =>
  formData.value.email &&
  formData.value.householdId &&
  formData.value.description
);

const householdOptions = computed(() =>
  availableHouseholds.value.map(household => ({
    label: household.name ? `${household.name} (${household.id})` : household.id,
    value: household.id
  }))
);

const hasHouseholdSelectorAbove = computed(() => !!props.householdId);

async function loadHouseholds() {
  if (!representativeId.value) {
    availableHouseholds.value = [];
    syncHouseholdSelection(true);
    return;
  }
  householdsLoading.value = true;
  try {
    const list = await HouseholdService.getHouseholds(representativeId.value);
    availableHouseholds.value = Array.isArray(list) ? list : [];
    // En cuanto cargan los hogares, forzamos una selección válida
    syncHouseholdSelection(true);
  } catch (error) {
    console.error('Error loading households for selector:', error);
    availableHouseholds.value = [];
  } finally {
    householdsLoading.value = false;
    syncHouseholdSelection();
  }
}

function syncHouseholdSelection(preferProp = false) {
  const allowed = new Set(householdOptions.value.map(opt => opt.value));
  const preferred = preferProp && props.householdId ? props.householdId : formData.value.householdId;

  if (preferred && allowed.has(preferred)) {
    formData.value.householdId = preferred;
    return;
  }

  if (props.householdId && allowed.has(props.householdId)) {
    formData.value.householdId = props.householdId;
    return;
  }

  if (!allowed.size) {
    formData.value.householdId = props.householdId || '';
    return;
  }

  if (!allowed.has(formData.value.householdId)) {
    formData.value.householdId = householdOptions.value[0].value;
  }
}

watch(() => props.householdId, (newId) => {
  if (newId && !formData.value.householdId) {
    syncHouseholdSelection(true);
  }
});

watch(dialogVisible, async isOpen => {
  if (isOpen) {
    await loadHouseholds();
  }
});

onMounted(async () => {
  try {
    const storedUser = localStorage.getItem('user');
    console.log('Current User: ', storedUser);
    representativeId.value = storedUser ? JSON.parse(storedUser)?.id ?? null : null;
  } catch (error) {
    representativeId.value = null;
  }
  resetForm();
  await loadHouseholds();
});

function validateForm() {
  errors.value = {};

  if (!formData.value.email.trim()) {
    errors.value.email = t('representativeMembers.addMember.validation.emailRequired');
  } else if (!isValidEmail(formData.value.email)) {
    errors.value.email = t('representativeMembers.addMember.validation.emailInvalid');
  }

  if (!formData.value.householdId.trim()) {
    errors.value.householdId = t('representativeMembers.addMember.validation.householdRequired');
  }

  if (!formData.value.description.trim()) {
    errors.value.description = t('representativeMembers.addMember.validation.descriptionRequired');
  }

  return Object.keys(errors.value).length === 0;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  if (!formData.value.householdId?.trim()) {
    errors.value.householdId = t('representativeMembers.addMember.validation.householdRequired');
    return;
  }

  try {
    if (formData.value.householdId) {
      const hhRes = await httpInstance.get(`/house_hold/${encodeURIComponent(formData.value.householdId)}`);
      const hh = hhRes.data;
      const max = Number(hh?.memberCount || 0);
      if (Number.isFinite(max) && max > 0) {
        const membersRes = await httpInstance.get(`/household_member/household/${encodeURIComponent(formData.value.householdId)}`);
        const current = Array.isArray(membersRes.data) ? membersRes.data.length : 0;
        if (current >= max) {
          toast.add({
            severity: 'warn',
            summary: t('representativeMembers.toasts.limit.summary'),
            detail: t('representativeMembers.toasts.limit.detail', { count: max }),
            life: 3000
          });
          return;
        }
      }
    }
  } catch (_) {
    // guard errors are non-blocking
  }

  loading.value = true;

  try {
    const payload = {
      householdId: formData.value.householdId.trim(),
      email: formData.value.email.trim(),
      description: formData.value.description.trim()
    };

    await InvitationService.create(payload);

    toast.add({
      severity: 'success',
      summary: t('representativeMembers.addMember.toast.success.summary'),
      detail: t('representativeMembers.addMember.toast.success.detail'),
      life: 3000
    });

    resetForm();
    emit('member-added');
    emit('update:visible', false);
  } catch (error) {
    console.error('Error sending invitation:', error);
    toast.add({
      severity: 'error',
      summary: t('representativeMembers.addMember.toast.error.summary'),
      detail: t('representativeMembers.addMember.toast.error.detail'),
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.value = {
    email: '',
    householdId: props.householdId || '',
    description: ''
  };
  errors.value = {};
  syncHouseholdSelection(true);
}

function handleCancel() {
  resetForm();
  emit('update:visible', false);
}
</script>

<template>
  <pv-dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    :modal="true"
    :style="{ width: '50vw' }"
    :closable="!loading"
  >
    <div class="add-member-form">
      <div class="field">
        <label for="email" class="field-label">{{ t('representativeMembers.addMember.fields.email') }}</label>
        <pv-inputtext
          id="email"
          v-model="formData.email"
          type="email"
          :placeholder="t('representativeMembers.addMember.placeholders.email')"
          class="form-input"
          :class="{ 'p-invalid': errors.email }"
          :disabled="loading"
        />
        <small v-if="errors.email" class="error-message">{{ errors.email }}</small>
      </div>

      <div class="field">
        <label for="householdId" class="field-label">{{ t('representativeMembers.addMember.fields.household') }}</label>
        <template v-if="!hasHouseholdSelectorAbove && (householdOptions.length > 1 || !formData.householdId)">
          <pv-dropdown
            id="householdId"
            v-model="formData.householdId"
            :options="householdOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('representativeMembers.addMember.placeholders.household')"
            class="form-input"
            :class="{ 'p-invalid': errors.householdId }"
            :disabled="loading || !householdOptions.length"
            :loading="householdsLoading"
            filter
            :empty-message="householdsLoading ? t('representativeMembers.addMember.emptyLoading') : t('representativeMembers.addMember.emptyOptions')"
          />
          <small v-if="!householdOptions.length && !householdsLoading" class="helper-message">
            {{ t('representativeMembers.addMember.helper.noHouseholds') }}
          </small>
        </template>
        <template v-else>
          <div class="readonly-pill">
            {{ householdOptions.find(opt => opt.value === formData.householdId)?.label || formData.householdId || t('representativeMembers.addMember.helper.noHouseholds') }}
          </div>
        </template>
        <small v-if="errors.householdId" class="error-message">{{ errors.householdId }}</small>
      </div>

      <div class="field">
        <label for="description" class="field-label">{{ t('representativeMembers.addMember.fields.description') }}</label>
        <pv-textarea
          id="description"
          v-model="formData.description"
          :placeholder="t('representativeMembers.addMember.placeholders.description')"
          class="form-textarea"
          :class="{ 'p-invalid': errors.description }"
          :disabled="loading"
          rows="4"
        />
        <small v-if="errors.description" class="error-message">{{ errors.description }}</small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <pv-button
          :label="t('representativeMembers.addMember.buttons.cancel')"
          icon="pi pi-times"
          outlined
          @click="handleCancel"
          :disabled="loading"
        />
        <pv-button
          :label="t('representativeMembers.addMember.buttons.submit')"
          icon="pi pi-send"
          @click="handleSubmit"
          :disabled="!isFormValid || loading"
          :loading="loading"
        />
      </div>
    </template>
  </pv-dialog>
</template>

<style scoped>
.add-member-form {
  padding: 1rem 0;
}

.field {
  margin-bottom: 1.5rem;
}

.field-label {
  display: block;
  color: #0f172a;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-input,
.form-textarea {
  width: 100%;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.error-message {
  color: #dc2626;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
}

.helper-message {
  color: #6b7280;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
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
  font-weight: 700;
}

:deep(.p-dialog-content) {
  padding: 2rem;
}

:deep(.p-dialog-footer) {
  padding: 1.5rem;
  border-top: 1px solid rgba(15,23,42,.08);
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
}

:deep(.p-inputtext:focus),
:deep(.p-textarea:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:deep(.p-inputtext.p-invalid),
:deep(.p-textarea.p-invalid) {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

:deep(.p-button) {
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
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

:deep(.p-button.p-button-outlined) {
  border: 1px solid #d1d5db;
  color: #0f172a;
  background: transparent;
}

:deep(.p-button.p-button-outlined:hover) {
  background: #f8fafc;
  border-color: #3b82f6;
  color: #3b82f6;
}

@media (max-width: 768px) {
  :deep(.p-dialog) {
    width: 95vw !important;
    margin: 1rem;
  }

  :deep(.p-dialog-content) {
    padding: 1.5rem;
  }

  :deep(.p-dialog-footer) {
    padding: 1rem;
  }
}
</style>
