<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { profileStore } from '@/profiles/application/profile.store.js';
import { useI18n } from 'vue-i18n';

const toast = useToast();
const { t } = useI18n();
const saving = ref(false);
const loadError = ref('');
const userId = ref(null);

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  plan: 'FREE',
  photo: ''
});

const initialSnapshot = ref({ ...form });

const fieldErrors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  plan: '',
  photo: ''
});

const loading = computed(() => profileStore.loading && !profileStore.current);
const profile = computed(() => profileStore.current);

const planOptions = computed(() => ([
  { label: t('profile.plan.free'), value: 'FREE' },
  { label: t('profile.plan.premium'), value: 'PREMIUM' }
]));

const activeTab = ref('personal');
const verificationStep = ref(1);
const pendingChanges = ref(null);
const verifyPassword = ref('');
const verifyError = ref('');
const lockedUntil = ref(null);
const photoDialog = ref(false);
const photoInput = ref('');

const isLocked = computed(() => {
  if (!lockedUntil.value) return false;
  return lockedUntil.value.getTime() > Date.now();
});

const canEdit = computed(() => verificationStep.value === 1 && !isLocked.value);

const hasPersonalChanges = computed(() => {
  const first = form.firstName.trim();
  const last = form.lastName.trim();
  const email = form.email.trim().toLowerCase();
  return (
    first !== (initialSnapshot.value.firstName || '').trim() ||
    last !== (initialSnapshot.value.lastName || '').trim() ||
    email !== (initialSnapshot.value.email || '').trim().toLowerCase()
  );
});

const hasPlanChange = computed(() => (form.plan || '') !== (initialSnapshot.value.plan || ''));

const hasPasswordChange = computed(() => {
  const next = form.password.trim();
  const current = (initialSnapshot.value.password || '').trim();
  return !!next && next !== current;
});

const hasPhotoChange = computed(() => (form.photo || '') !== (initialSnapshot.value.photo || ''));

const isDirty = computed(() => {
  return hasPersonalChanges.value || hasPlanChange.value || hasPasswordChange.value || hasPhotoChange.value;
});

const disableNext = computed(() => !isDirty.value || saving.value || isLocked.value);

const displayName = computed(() =>
  profile.value?.name || form.firstName || t('profile.fallback.name')
);
const displayEmail = computed(() =>
  form.email || t('profile.fallback.email')
);
function getPlanLabel(code) {
  const planCode = String(code || 'FREE').toLowerCase();
  return t(`profile.plan.${planCode}`);
}

const displayPlanLabel = computed(() => {
  const planName = getPlanLabel(form.plan || profile.value?.plan);
  return t('profile.fallback.planLabel', { plan: planName });
});

const lastUpdatedLabel = computed(() => {
  const updated = profile.value?.updatedAt;
  if (!updated) return '—';
  try {
    return new Date(updated).toLocaleString();
  } catch {
    return updated;
  }
});

const lockedUntilLabel = computed(() => lockedUntil.value ? lockedUntil.value.toLocaleDateString() : '');

const lockCountdownLabel = computed(() => {
  if (!lockedUntil.value) return '';
  const diff = lockedUntil.value.getTime() - Date.now();
  if (diff <= 0) return t('profile.lock.available');
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1
    ? t('profile.lock.oneDay')
    : t('profile.lock.days', { count: days });
});

function splitName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  const [first, ...rest] = parts;
  return { first, last: rest.join(' ') };
}

function setSnapshot(fromProfile) {
  const derived = splitName(fromProfile?.name);
  initialSnapshot.value = {
    firstName: (fromProfile?.firstName ?? derived.first ?? '').trim(),
    lastName: (fromProfile?.lastName ?? derived.last ?? '').trim(),
    email: fromProfile?.email || '',
    password: fromProfile?.password || '',
    plan: fromProfile?.plan || 'FREE',
    photo: fromProfile?.photo || ''
  };
  Object.assign(form, initialSnapshot.value);
  lockedUntil.value = fromProfile?.profileLockedUntil ? new Date(fromProfile.profileLockedUntil) : null;
  verificationStep.value = isLocked.value ? 3 : 1;
  pendingChanges.value = null;
  verifyPassword.value = '';
  verifyError.value = '';
  activeTab.value = 'personal';
}

function validateForm() {
  fieldErrors.firstName = form.firstName.trim() ? '' : t('profile.errors.required');
  fieldErrors.lastName = form.lastName.trim() ? '' : t('profile.errors.required');
  const emailValue = form.email.trim();
  fieldErrors.email = emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
    ? ''
    : t('profile.errors.invalidEmail');
  const newPassword = form.password.trim();
  fieldErrors.password = newPassword && newPassword.length < 6 ? t('profile.errors.passwordLength') : '';
  fieldErrors.plan = form.plan ? '' : t('profile.errors.planRequired');
  fieldErrors.photo = form.photo && !/^https?:\/\//i.test(form.photo) ? t('profile.errors.invalidUrl') : '';
  return !Object.values(fieldErrors).some(Boolean);
}

async function bootstrap() {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) throw new Error(t('profile.errors.sessionNotFound'));
    const parsed = JSON.parse(stored);
    if (!parsed?.id) throw new Error(t('profile.errors.invalidUserId'));
    userId.value = parsed.id;
    const loaded = await profileStore.loadProfile(parsed.id);
    setSnapshot(loaded);
  } catch (err) {
    console.error('Error loading profile', err);
    loadError.value = err?.message || t('profile.messages.loadError');
  }
}

async function persistProfile(changes = {}, { lockProfile = false } = {}) {
  if (!userId.value) return;
  saving.value = true;
  loadError.value = '';
  try {
    const first = changes.firstName ?? form.firstName;
    const last = changes.lastName ?? form.lastName;
    const composedName = [first, last].filter(Boolean).join(' ').trim();
    const payload = {
      ...profile.value,
      ...changes,
      name: composedName || profile.value?.name || '',
      firstName: first,
      lastName: last,
      photo: changes.photo ?? form.photo ?? profile.value?.photo ?? '',
      updatedAt: new Date().toISOString()
    };
    const passwordOverride = (changes.password ?? form.password)?.trim();
    payload.password = passwordOverride ? passwordOverride : profile.value?.password;
    if (lockProfile) {
      payload.profileLockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    const updated = await profileStore.updateProfile(userId.value, payload);
    setSnapshot(updated);

    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem('user', JSON.stringify({
        ...parsed,
        name: updated.name,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        plan: updated.plan,
        profileLockedUntil: updated.profileLockedUntil
      }));
    }

    toast.add({
      severity: 'success',
      summary: lockProfile ? t('profile.toast.finalized.title') : t('profile.toast.updated.title'),
      detail: lockProfile
        ? t('profile.toast.finalized.detail')
        : t('profile.toast.updated.detail'),
      life: 3000
    });
  } catch (err) {
    console.error('Error updating profile', err);
    loadError.value = err?.message || t('profile.messages.saveError');
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  Object.assign(form, initialSnapshot.value);
  verificationStep.value = isLocked.value ? 3 : 1;
  pendingChanges.value = null;
  verifyPassword.value = '';
  verifyError.value = '';
  photoInput.value = '';
  photoDialog.value = false;
}

function handleNext() {
  if (!canEdit.value) return;
  if (!validateForm()) return;
  pendingChanges.value = { ...form };
  verificationStep.value = 2;
  verifyPassword.value = '';
  verifyError.value = '';
}

function handleBack() {
  verificationStep.value = 1;
  pendingChanges.value = null;
  verifyPassword.value = '';
  verifyError.value = '';
}

async function handleVerification() {
  if (!pendingChanges.value) {
    verifyError.value = t('profile.errors.noPendingChanges');
    return;
  }
  if (verifyPassword.value.trim() !== (profile.value?.password || '')) {
    verifyError.value = t('profile.errors.invalidPassword');
    return;
  }
  verifyError.value = '';
  await persistProfile(pendingChanges.value, { lockProfile: true });
  pendingChanges.value = null;
  verificationStep.value = 3;
  verifyPassword.value = '';
}

function openPhotoDialog() {
  photoInput.value = form.photo || profile.value?.photo || '';
  photoDialog.value = true;
}

function applyPhoto() {
  if (photoInput.value && !/^https?:\/\//i.test(photoInput.value)) {
    fieldErrors.photo = t('profile.errors.invalidUrl');
    return;
  }
  fieldErrors.photo = '';
  form.photo = photoInput.value.trim();
  photoDialog.value = false;
}

onMounted(bootstrap);
</script>

<template>
  <div class="profile-page">
    <pv-message v-if="loadError" severity="error" :closable="false" class="mb-3">{{ loadError }}</pv-message>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>{{ $t('profile.loading') }}</span>
    </div>

    <div v-else class="page-layout">
      <div class="side-column">
        <div class="profile-card">
          <div class="avatar">
            <img :src="form.photo || profile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.firstName || 'R')}+${encodeURIComponent(form.lastName || '')}&background=1f2937&color=fff`" alt="avatar" />
            <button
              class="edit-photo-btn"
              @click="openPhotoDialog"
              :disabled="!canEdit"
            >
              <i class="pi pi-camera"></i>
            </button>
          </div>
          <h3>{{ displayName }}</h3>
          <p>{{ displayEmail }}</p>
          <span class="tag">{{ displayPlanLabel }}</span>
        </div>

        <div class="help-card">
          <div class="icon">
            <i class="pi pi-comments"></i>
          </div>
          <h4>{{ $t('profile.help.title') }}</h4>
          <p>{{ $t('profile.help.description') }}</p>
          <pv-button :label="$t('profile.help.button')" class="w-full" outlined />
        </div>
      </div>

      <div class="main-column">
        <div class="verification-card">
          <div class="verification-header">
            <div>
              <h4>{{ $t('profile.verification.title') }}</h4>
              <p>{{ $t('profile.verification.subtitle') }}</p>
            </div>
            <span class="eta">{{ $t('profile.verification.eta') }}</span>
          </div>
          <div class="progress">
            <div :class="['step', { completed: verificationStep > 1, active: verificationStep === 1 }]">
              <span>1</span>
              <p>{{ $t('profile.verification.steps.data') }}</p>
            </div>
            <div :class="['connector', { completed: verificationStep > 1 }]"></div>
            <div :class="['step', { completed: verificationStep > 2, active: verificationStep === 2 }]">
              <span>2</span>
              <p>{{ $t('profile.verification.steps.review') }}</p>
            </div>
            <div :class="['connector', { completed: verificationStep > 2 }]"></div>
            <div :class="['step', { active: verificationStep === 3, completed: verificationStep === 3 }]">
              <span>3</span>
              <p>{{ $t('profile.verification.steps.done') }}</p>
            </div>
          </div>
        </div>

        <div class="details-card">
          <div class="tabs">
            <button
              class="tab"
              :class="{ active: activeTab === 'personal' }"
              @click="activeTab = 'personal'"
              :disabled="verificationStep !== 1 || isLocked"
            >
              {{ $t('profile.tabs.personal') }}
            </button>
            <button
              class="tab"
              :class="{ active: activeTab === 'config' }"
              @click="activeTab = 'config'"
              :disabled="verificationStep !== 1 || isLocked"
            >
              {{ $t('profile.tabs.config') }}
            </button>
          </div>

          <div v-if="verificationStep === 1 && activeTab === 'personal'" class="form-grid">
            <div class="field">
              <label>{{ $t('profile.fields.firstName') }}</label>
              <pv-inputtext
                v-model="form.firstName"
                placeholder=""
                :class="{ 'p-invalid': !!fieldErrors.firstName }"
                :disabled="!canEdit"
              />
              <small v-if="fieldErrors.firstName" class="error">{{ fieldErrors.firstName }}</small>
            </div>

            <div class="field">
              <label>{{ $t('profile.fields.lastName') }}</label>
              <pv-inputtext
                v-model="form.lastName"
                placeholder=""
                :class="{ 'p-invalid': !!fieldErrors.lastName }"
                :disabled="!canEdit"
              />
              <small v-if="fieldErrors.lastName" class="error">{{ fieldErrors.lastName }}</small>
            </div>

            <div class="field full">
              <label>{{ $t('profile.fields.email') }}</label>
              <pv-inputtext
                v-model="form.email"
                type="email"
                :placeholder="$t('profile.placeholders.email')"
                :class="{ 'p-invalid': !!fieldErrors.email }"
                :disabled="!canEdit"
              />
              <small v-if="fieldErrors.email" class="error">{{ fieldErrors.email }}</small>
            </div>
          </div>

          <div v-if="verificationStep === 1 && activeTab === 'config'" class="form-grid">
            <div class="field">
              <label>{{ $t('profile.fields.plan') }}</label>
              <pv-dropdown
                v-model="form.plan"
                :options="planOptions"
                option-label="label"
                option-value="value"
                :placeholder="$t('profile.placeholders.plan')"
                :class="{ 'p-invalid': !!fieldErrors.plan }"
                :disabled="!canEdit"
              />
              <small v-if="fieldErrors.plan" class="error">{{ fieldErrors.plan }}</small>
            </div>

            <div class="field">
              <label>{{ $t('profile.fields.password') }}</label>
              <pv-password
                v-model="form.password"
                toggleMask
                :feedback="false"
                :class="{ 'p-invalid': !!fieldErrors.password }"
                inputClass="w-full"
                :placeholder="$t('profile.placeholders.password')"
                :disabled="!canEdit"
              />
              <small v-if="fieldErrors.password" class="error">{{ fieldErrors.password }}</small>
            </div>
          </div>

          <div v-if="verificationStep === 2" class="verification-panel">
            <p>{{ $t('profile.verification.confirmMessage') }}</p>
            <div class="summary-grid">
              <div>
                <span>{{ $t('profile.summary.fullName') }}</span>
                <strong>{{ (pendingChanges?.firstName || '') + ' ' + (pendingChanges?.lastName || '') }}</strong>
              </div>
              <div>
                <span>{{ $t('profile.summary.email') }}</span>
                <strong>{{ pendingChanges?.email }}</strong>
              </div>
              <div>
                <span>{{ $t('profile.summary.plan') }}</span>
                <strong>{{ getPlanLabel(pendingChanges?.plan) }}</strong>
              </div>
            </div>
            <pv-password
              v-model="verifyPassword"
              toggleMask
              :feedback="false"
              :placeholder="$t('profile.placeholders.currentPassword')"
              inputClass="w-full"
            />
            <small v-if="verifyError" class="error">{{ verifyError }}</small>
          </div>

          <div v-if="verificationStep === 3" class="verification-panel success">
            <p>{{ $t('profile.verification.success', { date: lockedUntilLabel, countdown: lockCountdownLabel }) }}</p>
          </div>

          <div class="actions">
            <template v-if="verificationStep === 1">
              <pv-button
                :label="$t('profile.buttons.reset')"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                @click="handleReset"
                :disabled="(!isDirty && !pendingChanges) || saving"
              />
              <pv-button
                :label="$t('profile.buttons.next')"
                icon="pi pi-arrow-right"
                @click="handleNext"
                :disabled="disableNext"
              />
            </template>
            <template v-else-if="verificationStep === 2">
              <div class="actions-split">
                <pv-button
                  :label="$t('profile.buttons.back')"
                  icon="pi pi-arrow-left"
                  outlined
                  @click="handleBack"
                  :disabled="saving"
                />
                <pv-button
                  :label="$t('profile.buttons.confirm')"
                  icon="pi pi-check"
                  @click="handleVerification"
                  :disabled="!verifyPassword || saving"
                  :loading="saving"
                />
              </div>
            </template>
            <template v-else>
              <div class="lock-note">
                {{ $t('profile.verification.lockedMessage', { date: lockedUntilLabel, countdown: lockCountdownLabel }) }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <pv-dialog
      v-model:visible="photoDialog"
      :header="$t('profile.photo.title')"
      :modal="true"
      :style="{ width: '420px' }"
    >
      <div class="field">
        <label>{{ $t('profile.photo.label') }}</label>
        <pv-inputtext
          v-model="photoInput"
          :placeholder="$t('profile.photo.placeholder')"
          class="w-full"
        />
        <small v-if="fieldErrors.photo" class="error">{{ fieldErrors.photo }}</small>
      </div>
      <div class="preview" v-if="photoInput">
        <img :src="photoInput" alt="preview" />
      </div>
      <template #footer>
        <pv-button :label="$t('profile.buttons.cancel')" severity="secondary" outlined @click="photoDialog = false" />
        <pv-button :label="$t('profile.buttons.savePhoto')" icon="pi pi-check" @click="applyPhoto" />
      </template>
    </pv-dialog>
  </div>
</template>
<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background: #f5f7fb;
  min-height: 100%;
}

.page-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1.5rem;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-card,
.help-card,
.verification-card,
.details-card {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.profile-card {
  text-align: center;
}

.profile-card .avatar {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  margin: 0 auto 1rem;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(31, 41, 55, 0.3);
  position: relative;
}

.edit-photo-btn {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #2563eb;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(37,99,235,.4);
}

.edit-photo-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.profile-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-card h3 {
  margin: 0;
  color: #111827;
}

.profile-card p {
  margin: 0.25rem 0;
  color: #94a3b8;
}

.profile-card .tag {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.15rem 0.75rem;
  border-radius: 999px;
  background: #e0f2ff;
  color: #0369a1;
  font-size: 0.8rem;
}

.help-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.help-card .icon {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  background: #e8f2ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
}

.help-card h4 {
  margin: 0;
  color: #0f172a;
}

.help-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.verification-card .verification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.verification-card h4 {
  margin: 0;
  color: #0f172a;
}

.verification-card p {
  margin: 0.3rem 0 0;
  color: #64748b;
}

.verification-card .eta {
  font-weight: 600;
  color: #2563eb;
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.progress .step {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #94a3b8;
  font-size: 0.8rem;
}

.progress .step span {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #cbd5f5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.35rem;
}

.progress .step.active span {
  border-color: #2563eb;
  color: #2563eb;
}

.progress .step.completed span {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.progress .step.active,
.progress .step.completed {
  color: #2563eb;
}

.connector {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
}

.connector.completed {
  background: #2563eb;
}

.details-card {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  border: none;
  background: transparent;
  padding-bottom: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  position: relative;
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab.active {
  color: #2563eb;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #2563eb;
  border-radius: 2px;
}

.details-card .form-grid {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem 1.5rem;
}

.field label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 600;
  color: #0f172a;
}

.field.full {
  grid-column: 1 / -1;
}

.verification-panel {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.verification-panel.success {
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.summary-grid span {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-grid strong {
  color: #0f172a;
}

.error {
  color: #dc2626;
  font-size: 0.8rem;
}

.actions {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.actions-split {
  display: flex;
  gap: 0.75rem;
}

.preview img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 12px;
  margin-top: 0.5rem;
  border: 1px solid #e5e7eb;
}

.lock-note {
  font-weight: 600;
  color: #0f172a;
}

@media (max-width: 992px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
  .side-column {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .profile-card,
  .help-card {
    flex: 1 1 260px;
  }
}

@media (max-width: 640px) {
  .actions {
    flex-direction: column;
  }
}
</style>
