<script setup>
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { HouseholdApi } from '@/households/infrastructure/household-api';
import { HouseholdService } from '@/households/infrastructure/household.service';

const props = defineProps({
  householdId: { type: String, required: true },
  visible: { type: Boolean, required: true }
});
const emit = defineEmits(['update:visible']);
const router = useRouter();

const onContinue = async () => {
  try {
    let targetId = props.householdId;
    const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
    const representativeId = storedUser?.id;
    const basePayload = {
      name: 'New Household',
      currency: 'USD',
      description: '',
      memberCount: 1,
      representativeId
    };

    // If householdId missing or not found, create it now
    let exists = false;
    if (targetId) {
      try {
        const existing = await HouseholdApi.getById(targetId);
        exists = !!existing?.id;
      } catch (_) { exists = false; }
    }
    if (!exists) {
      const plan = String(storedUser?.plan || 'FREE').toUpperCase();
      if (plan === 'FREE') {
        const existing = await HouseholdService.getHouseholds(representativeId);
        if (Array.isArray(existing) && existing.length >= 1) {
          alert('Con el plan Free solo puedes tener 1 hogar. Elimina el existente para crear uno nuevo.');
          emit('update:visible', false);
          return;
        }
      }
      const payload = { id: targetId || null, ...basePayload };
      const created = await HouseholdApi.create(payload);
      targetId = created?.id;
      if (targetId) {
        storedUser.householdId = targetId;
        localStorage.setItem('householdId', targetId);
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
    }

    localStorage.removeItem('isNewUser');
    emit('update:visible', false);
    if (targetId) await router.replace(`/dashboard/representative/household/${targetId}`);
  } catch (error) { 
    console.error('Navigation error:', error); 
    const msg = error?.response?.data?.message || error?.message || 'No se pudo crear el hogar.';
    alert(msg);
  }
};

const onSkip = () => { localStorage.removeItem('isNewUser'); emit('update:visible', false); };
</script>

<template>
  <Dialog :visible="visible" modal :closable="false" :style="{ width: '30rem' }" class="household-modal" @update:visible="(val) => emit('update:visible', val)">
    <template #header>
      <h3 class="m-0">Welcome!</h3>
    </template>
    <div class="flex flex-column align-items-center">
      <i class="pi pi-check-circle text-4xl text-green-500 mb-3"></i>
      <p class="text-center mb-4">Your household ID has been created. Click Continue to configure it, or select Skip to go to the main dashboard.</p>
      <p class="font-bold mb-4">Household ID: {{ householdId }}</p>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button label="Skip" class="p-button-outlined" @click="onSkip" />
        <Button label="Continue" @click="onContinue" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
:deep(.p-dialog) { box-shadow: 0 4px 20px rgba(0,0,0,.1); border-radius: 12px; }
:deep(.p-dialog-header) { padding:1.5rem; }
:deep(.p-dialog-content) { padding:2rem; }
:deep(.p-dialog-footer) { padding:1.5rem; }
</style>

