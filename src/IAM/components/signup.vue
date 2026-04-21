<script setup lang="js">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import httpInstance, { AUTH_TOKEN_KEY } from '@/shared/services/http.instance';

import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Message from 'primevue/message';
import RadioButton from 'primevue/radiobutton';
import Dialog from 'primevue/dialog';

const router = useRouter();
const name = ref('');
const email = ref('');
const password = ref('');
const confirm = ref('');
const accept = ref(false);
const userType = ref('Representative'); // Representative | Member
const selectedPlan = ref('FREE'); // FREE | PREMIUM
const showPlanDialog = ref(false);
const householdId = ref('');

const error = ref('');
const success = ref('');
const isSubmitting = ref(false);

async function fetchUserProfile(id) {
  const res = await httpInstance.get(`/user/user/${id}`);
  return res.data;
}

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function mapRole(rawRole) {
  return rawRole === 'Member' ? 'Member' : 'Representative';
}

// FREE -> 0, PREMIUM -> 1 (requested mapping)
function getPlanCode(planLabel) {
  // Backend enum: 1 = Free, 2 = Premium
  return planLabel === 'PREMIUM' ? 2 : 1;
}

async function signUp() {
  if (isSubmitting.value) return;

  error.value = '';
  success.value = '';

  if (!name.value.trim()) return (error.value = 'Please enter your name.');
  if (!validateEmail(email.value)) return (error.value = 'Enter a valid email address.');
  if (password.value.length < 8) return (error.value = 'Password must be at least 8 characters.');
  if (password.value !== confirm.value) return (error.value = 'Passwords do not match.');
  if (userType.value === 'Representative' && !accept.value) {
    return (error.value = 'You must accept the Terms & Privacy Policy.');
  }

  // Representatives must choose a plan before the actual sign-up/sign-in
  if (userType.value === 'Representative') {
    showPlanDialog.value = true;
    return;
  }

  await confirmPlanAndCreate();
}

async function confirmPlanAndCreate() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const normalizedEmail = String(email.value).trim().toLowerCase();
    const normalizedPassword = String(password.value);
    const role = mapRole(userType.value);
    const planLabel = selectedPlan.value || 'FREE';
    const planCode = getPlanCode(planLabel);

    // 1) Sign-up (plan now respected by backend)
    await httpInstance.post('/authentication/sign-up', {
      email: normalizedEmail,
      password: normalizedPassword,
      name: name.value,
      role,
      plan: planCode,
      householdId: userType.value === 'Member' ? householdId.value || null : null
    });

    // 2) Do NOT auto sign-in here; first interactive login should flip isNewUser to false.
    success.value = 'Account created successfully. Please sign in to continue.';
    setTimeout(() => router.push('/login'), 1200);
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'Failed to create account. Please try again.';
    error.value = message;
  } finally {
    isSubmitting.value = false;
    showPlanDialog.value = false;
  }
}
</script>

<template>
  <div class="grid h-screen">
    <!-- Left side (visual/brand) -->
    <div class="hidden md:col-6 md:flex align-items-center justify-content-center surface-ground" style="background-color: white !important;">
      <div class="p-5 text-center">
        <img
            src="@/assets/logo.jpeg"
            alt="signup hero"
            class="w-full border-round-2xl shadow-3"
        />
        <h2 class="mt-4 mb-2" style="color: black !important;">Create your account</h2>
        <p class="text-600 line-height-3" style="color: black !important;">
          Start free or go Premium any time.
        </p>
      </div>
    </div>

    <!-- Right side (form) -->
    <div class="col-12 md:col-6 flex align-items-center justify-content-center" style="background-color: #2c3e50">
      <div class="w-full" style="max-width: 460px;">
        <div class="mb-4">
          <h1 class="m-0">Sign up</h1>
          <p class="mt-2 text-600">It only takes a minute.</p>
        </div>

        <Message v-if="error" severity="error" :closable="false" class="mb-3">{{ error }}</Message>
        <Message v-if="success" severity="success" :closable="false" class="mb-3">{{ success }}</Message>

        <div class="field mb-4">
          <label class="block mb-2">Account Type</label>
          <div class="flex gap-4">
            <div class="flex align-items-center">
              <RadioButton id="representative" v-model="userType" value="Representative" name="userType" />
              <label for="representative" class="ml-2">Household Representative</label>
            </div>
            <div class="flex align-items-center">
              <RadioButton id="member" v-model="userType" value="Member" name="userType" />
              <label for="member" class="ml-2">Household Member</label>
            </div>
          </div>
        </div>

        <div class="field mb-3">
          <label for="name" class="block mb-2">Full name</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-user"/>
            <InputText id="name" v-model="name" placeholder="Jane Doe" class="w-full" autocomplete="name" />
          </span>
        </div>

        <div class="field mb-3">
          <label for="email" class="block mb-2">Email</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-envelope" />
            <InputText id="email" v-model="email" type="email" placeholder="you@example.com" class="w-full" autocomplete="email" />
          </span>
        </div>

        <div class="field mb-3">
          <label for="password" class="block mb-2">Password</label>
          <Password
              id="password"
              v-model="password"
              class="w-full"
              inputClass="w-full"
              toggleMask
              :feedback="true"
              placeholder="At least 8 characters"
              autocomplete="new-password"
          />
        </div>

        <div class="field mb-2">
          <label for="confirm" class="block mb-2">Confirm password</label>
          <Password
              id="confirm"
              v-model="confirm"
              class="w-full"
              inputClass="w-full"
              toggleMask
              :feedback="false"
              placeholder="Re-enter your password"
              autocomplete="new-password"
          />
        </div>

        <div v-if="userType === 'Member'" class="field mb-3">
          <label for="householdId" class="block mb-2">Household ID (optional for now)</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-home" />
            <InputText id="householdId" v-model="householdId" placeholder="Provided by your representative" class="w-full" />
          </span>
        </div>

        <div v-if="userType === 'Representative'" class="flex align-items-start gap-2 my-3">
          <Checkbox inputId="accept" v-model="accept" :binary="true" />
          <label for="accept" class="line-height-3">
            I agree to the <a href="#" class="text-primary">Terms</a> and <a href="#" class="text-primary">Privacy Policy</a>.
          </label>
        </div>

        <Button :disabled="isSubmitting" label="Create account" class="w-full" @click="signUp" />

        <div class="custom-divider">
          <span>or</span>
        </div>

        <Button class="w-full mb-2" outlined>
          <i class="pi pi-google mr-2" /> Continue with Google
        </Button>
        <Button class="w-full" outlined>
          <i class="pi pi-github mr-2" /> Continue with GitHub
        </Button>

        <p class="mt-4 text-600 text-center">
          Already have an account?
          <router-link class="text-primary" to="/login">Sign in</router-link>
        </p>
      </div>
    </div>

    <!-- Plan selection dialog -->
    <Dialog v-model:visible="showPlanDialog" modal :style="{ width: '34rem' }" header="Choose your plan">
      <div class="flex flex-column gap-3">
        <div class="flex align-items-center gap-3">
          <RadioButton inputId="plan-free" value="FREE" v-model="selectedPlan" />
          <label for="plan-free">Free - 1 household, up to 3 members</label>
        </div>
        <div class="flex align-items-center gap-3">
          <RadioButton inputId="plan-premium" value="PREMIUM" v-model="selectedPlan" />
          <label for="plan-premium">Premium - unlimited households and members</label>
        </div>
        <div class="flex justify-content-end gap-2 mt-3">
          <Button label="Cancel" class="p-button-outlined" @click="showPlanDialog = false" />
          <Button label="Continue" @click="confirmPlanAndCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.custom-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
}

.custom-divider::before,
.custom-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px dashed #ccc; /* customize color or style */
}

.custom-divider::before {
  margin-right: 1rem;
}

.custom-divider::after {
  margin-left: 1rem;
}

.custom-divider span {
  font-weight: 600;
  color: white;
}

:deep(img) { object-fit: cover; }
</style>
