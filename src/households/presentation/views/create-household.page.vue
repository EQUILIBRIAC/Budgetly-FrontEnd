<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { HouseholdService } from '@/households/infrastructure/household.service';
import { Household } from '@/households/domain/model/household.entity';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const household = ref(new Household());
const currentUser = ref(null);
const loading = ref(false);
const errors = ref({});

const isCreateMode = computed(() => String(route.params.id || '').toLowerCase() === 'new');
const isFreePlan = computed(() => (currentUser.value?.plan || 'FREE') === 'FREE');
const maxMembers = computed(() => (isFreePlan.value ? 3 : null));
const currencyOptions = computed(() => [
  { label: t('households.form.currencies.PEN'), value: 'PEN' },
  { label: t('households.form.currencies.USD'), value: 'USD' },
  { label: t('households.form.currencies.EUR'), value: 'EUR' }
]);
const formTitle = computed(() => (isCreateMode.value ? t('households.form.titleCreate') : t('households.form.titleEdit')));
const submitLabel = computed(() => (isCreateMode.value ? t('households.form.buttons.create') : t('households.form.buttons.update')));

onMounted(async () => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) throw new Error(t('households.form.errors.userNotFound'));

    const user = JSON.parse(userData);
    currentUser.value = user;
    loading.value = true;

    if (isCreateMode.value) {
      household.value = new Household({
        name: '',
        description: '',
        memberCount: 1,
        startDate: new Date(),
        currency: 'PEN',
        representativeId: user.id,
        createdAt: new Date()
      });
      return;
    }

    const id = decodeURIComponent(route.params.id);
    const loadedHousehold = await HouseholdService.getHouseholdById(id);
    if (!loadedHousehold) throw new Error(t('households.form.errors.householdNotFound'));
    if (loadedHousehold.representativeId !== user.id) throw new Error(t('households.form.errors.forbidden'));

    household.value = new Household({
      ...loadedHousehold,
      startDate: loadedHousehold.startDate ? new Date(loadedHousehold.startDate) : new Date(),
      memberCount: Math.max(1, loadedHousehold.memberCount || 1),
      currency: loadedHousehold.currency || 'USD'
    });

    if (isFreePlan.value && household.value.memberCount > 3) {
      household.value.memberCount = 3;
      toast.add({
        severity: 'info',
        summary: t('households.form.toasts.freePlanLimit.summary'),
        detail: t('households.form.toasts.freePlanLimit.membersDetail'),
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error loading household:', error);
    toast.add({
      severity: 'error',
      summary: t('households.form.toasts.errorSummary'),
      detail: error?.message || t('households.form.toasts.loadErrorDetail'),
      life: 3000
    });
    await router.replace('/dashboard/representative/households');
  } finally {
    loading.value = false;
  }
});

const validateHousehold = () => {
  errors.value = {};
  if (!household.value.name?.trim()) errors.value.name = t('households.form.validation.nameRequired');
  if (!household.value.startDate) errors.value.startDate = t('households.form.validation.startDateRequired');
  if (!household.value.currency?.trim()) errors.value.currency = t('households.form.validation.currencyRequired');
  if (!household.value.memberCount || household.value.memberCount < 1) {
    errors.value.memberCount = t('households.form.validation.memberCountMin');
  }
  if (isFreePlan.value && household.value.memberCount > 3) {
    errors.value.memberCount = t('households.form.validation.memberCountMax');
  }
  if (Object.keys(errors.value).length > 0) throw errors.value;
};

async function saveHousehold() {
  try {
    loading.value = true;
    validateHousehold();

    const householdToSave = {
      ...household.value,
      name: household.value.name.trim(),
      description: household.value.description?.trim() || '',
      memberCount: Math.max(1, isFreePlan.value ? Math.min(3, household.value.memberCount) : household.value.memberCount),
      currency: household.value.currency.trim().toUpperCase(),
      startDate: household.value.startDate instanceof Date
        ? household.value.startDate.toISOString()
        : new Date(household.value.startDate).toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isCreateMode.value) {
      const user = JSON.parse(localStorage.getItem('user'));
      if ((user?.plan || 'FREE') === 'FREE') {
        const existing = await HouseholdService.getHouseholds(user.id);
        if (Array.isArray(existing) && existing.length >= 1) {
          toast.add({
            severity: 'warn',
            summary: t('households.form.toasts.freePlanLimit.summary'),
            detail: t('households.form.toasts.freePlanLimit.householdDetail'),
            life: 3500
          });
          await router.replace('/dashboard/representative/households');
          return;
        }
      }
      await HouseholdService.createHousehold(householdToSave);
      toast.add({
        severity: 'success',
        summary: t('households.form.toasts.successSummary'),
        detail: t('households.form.toasts.createSuccess'),
        life: 3000
      });
    } else {
      await HouseholdService.updateHousehold(householdToSave.id, householdToSave);
      toast.add({
        severity: 'success',
        summary: t('households.form.toasts.successSummary'),
        detail: t('households.form.toasts.updateSuccess'),
        life: 3000
      });
    }

    await router.replace('/dashboard/representative/households');
  } catch (error) {
    if (error === errors.value) {
      return;
    }
    console.error('Error saving household:', error);
    toast.add({
      severity: 'error',
      summary: t('households.form.toasts.errorSummary'),
      detail: error?.message || t('households.form.toasts.saveErrorDetail'),
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function cancel() {
  router.replace('/dashboard/representative/households');
}
</script>

<template>
  <div class="card">
    <Toast />
    <h2 class="mb-4">{{ formTitle }}</h2>
    <form @submit.prevent="saveHousehold" class="flex flex-column gap-3">
      <div class="field">
        <label for="id">{{ t('households.form.labels.id') }}</label>
        <InputText id="id" v-model="household.id" disabled class="w-full" />
      </div>
      <div class="field">
        <label for="name">{{ t('households.form.labels.name') }}</label>
        <InputText id="name" v-model="household.name" :class="{ 'p-invalid': errors.name }" class="w-full" />
        <small class="p-error" v-if="errors.name">{{ errors.name }}</small>
      </div>
      <div class="field">
        <label for="description">{{ t('households.form.labels.description') }}</label>
        <Textarea id="description" v-model="household.description" rows="3" class="w-full" />
      </div>
      <div class="field">
        <label for="memberCount">{{ t('households.form.labels.memberCount') }}</label>
        <InputNumber
          id="memberCount"
          v-model="household.memberCount"
          :min="1"
          :max="maxMembers ?? undefined"
          class="w-full"
        />
        <small class="p-error" v-if="errors.memberCount">{{ errors.memberCount }}</small>
        <small v-else-if="isFreePlan" class="text-600">{{ t('households.form.helper.freePlanMembers') }}</small>
      </div>
      <div class="field">
        <label for="startDate">{{ t('households.form.labels.startDate') }}</label>
        <Calendar
          id="startDate"
          v-model="household.startDate"
          dateFormat="yy-mm-dd"
          :showTime="true"
          :showIcon="true"
          class="w-full"
        />
        <small class="p-error" v-if="errors.startDate">{{ errors.startDate }}</small>
      </div>
      <div class="field">
        <label for="currency">{{ t('households.form.labels.currency') }}</label>
        <Dropdown
          id="currency"
          v-model="household.currency"
          :options="currencyOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
        <small class="p-error" v-if="errors.currency">{{ errors.currency }}</small>
      </div>
      <div class="flex justify-content-end gap-2">
        <Button type="button" :label="t('households.form.buttons.cancel')" class="p-button-outlined" @click="cancel" :disabled="loading" />
        <Button type="submit" :label="submitLabel" :loading="loading" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: .5rem;
  font-weight: 500;
}

:deep(.p-inputtext),
:deep(.p-dropdown),
:deep(.p-calendar),
:deep(.p-inputnumber) {
  width: 100%;
}
</style>
