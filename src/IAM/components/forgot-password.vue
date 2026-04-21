<script setup lang="js">
import { ref, onBeforeUnmount } from 'vue';

import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Divider from 'primevue/divider';

const email = ref('');
const error = ref('');
const info = ref('');
const loading = ref(false);

const canResend = ref(false);
const countdown = ref(0);
let timerId = null;

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function startCooldown(seconds = 60) {
  canResend.value = false;
  countdown.value = seconds;
  clearInterval(timerId);
  timerId = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timerId);
      canResend.value = true;
    }
  }, 1000);
}

async function sendResetLink() {
  error.value = '';
  info.value = '';

  if (!validateEmail(email.value)) {
    error.value = 'Enter a valid email address.';
    return;
  }

  loading.value = true;
  try {
    // TODO: replace with real API call, e.g.:
    // await api.auth.requestPasswordReset({ email: email.value })
    await new Promise((res) => setTimeout(res, 1000)); // demo delay

    info.value = 'If an account exists for this email, a reset link has been sent.';
    startCooldown(60);
  } catch (e) {
    error.value = 'Something went wrong. Please try again in a moment.';
  } finally {
    loading.value = false;
  }
}

function resend() {
  if (!canResend.value) return;
  sendResetLink();
}

onBeforeUnmount(() => clearInterval(timerId));
</script>

<template>
  <div class="grid h-screen">
    <!-- Left side (visual/brand) -->
    <div class="hidden md:col-6 md:flex align-items-center justify-content-center surface-ground" style="background-color: white !important;">
      <div class="p-5 text-center">
        <img
            src="@/assets/logo.jpeg"
            alt="forgot password hero"
            class="w-full border-round-2xl shadow-3"
            style="max-width: 560px;"
        />
        <h2 class="mt-4 mb-2" style="color: black !important;">Forgot your password?</h2>
        <p class="text-600 line-height-3" style="color: black !important;">
          No worries—enter your email and we’ll send you a link to reset it securely.
        </p>
      </div>
    </div>

    <!-- Right side (form) -->
    <div class="col-12 md:col-6 flex align-items-center justify-content-center" style="background-color: #2c3e50 !important">
      <div class="w-full" style="max-width: 420px;">
        <div class="mb-4">
          <h1 class="m-0">Reset your password</h1>
          <p class="mt-2 text-600">We’ll email you a secure reset link.</p>
        </div>

        <Message v-if="error" severity="error" :closable="false" class="mb-3">{{ error }}</Message>
        <Message v-if="info" severity="info" :closable="false" class="mb-3">{{ info }}</Message>

        <div class="field mb-3">
          <label for="email" class="block mb-2">Email</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-envelope" />
            <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                class="w-full"
                autocomplete="email"
            />
          </span>
        </div>

        <Button
            label="Send reset link"
            class="w-full"
            :loading="loading"
            @click="sendResetLink"
        />

        <div class="custom-divider">
          <span>or</span>
        </div>

        <div class="flex align-items-center justify-content-between">
          <span class="text-600">Didn’t get the email?</span>
          <Button
              text
              @click="resend"
              :disabled="!canResend"
              :label="canResend ? 'Resend' : `Resend in ${countdown}s`"
          />
        </div>

        <p class="mt-4 text-600 text-center">
          Remembered it?
          <a href="#" class="text-primary"><router-link to="login">Back to sign in</router-link></a>
        </p>
      </div>
    </div>
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
