<script setup lang="js">
import { ref, onBeforeUnmount } from 'vue';

import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';

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
  <div class="auth-root">

    <!-- ══════════════════════════════ LEFT — FORM ══════════════════════════════ -->
    <div class="form-panel">
      <div class="form-inner">

        <!-- Logo -->
        <div class="logo-row">
          <div class="logo-box">
            <img src="@/assets/logo.png" alt="logo" class="logo-img" />
          </div>
          <span class="logo-name">Budgetly</span>
        </div>

        <!-- Title -->
        <div class="form-head">
          <h1 class="form-title">Forgot Password?</h1>
          <p class="form-sub">No worries — enter your email and we'll send you a secure link to reset it.</p>
        </div>

        <!-- Messages -->
        <Message v-if="error" severity="error" :closable="false" class="mb-4">{{ error }}</Message>
        <Message v-if="info" severity="info" :closable="false" class="mb-4">{{ info }}</Message>

        <!-- Email -->
        <div class="field">
          <label for="email" class="flabel">Email</label>
          <div class="finput-wrap">
            <i class="pi pi-envelope finput-icon"></i>
            <InputText
                id="email" v-model="email" type="email"
                placeholder="you@example.com"
                class="finput" autocomplete="email"
            />
          </div>
        </div>

        <!-- CTA -->
        <Button
            label="Send reset link"
            class="cta-btn"
            :loading="loading"
            @click="sendResetLink"
        />

        <!-- Divider -->
        <div class="divider"><span>OR</span></div>

        <!-- Resend row -->
        <div class="resend-row">
          <span class="resend-label">Didn't get the email?</span>
          <Button
              text
              class="resend-btn"
              @click="resend"
              :disabled="!canResend"
              :label="canResend ? 'Resend' : `Resend in ${countdown}s`"
          />
        </div>

        <!-- Footer -->
        <p class="form-footer">
          Remembered it?
          <router-link to="login" class="footer-link">Back to sign in</router-link>
        </p>
      </div>
    </div>

    <!-- ═════════════════════════════ RIGHT — BRAND ═════════════════════════════ -->
    <div class="brand-panel">
      <!-- Decorative blobs -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <div class="brand-inner">

        <!-- Headline -->
        <h2 class="brand-headline">
          Secure your<br />account in<br />seconds.
        </h2>

        <!-- Info card -->
        <div class="tcard">
          <div class="tcard-steps">
            <div class="step">
              <div class="step-num">01</div>
              <div class="step-text">
                <span class="step-title">Enter your email</span>
                <span class="step-desc">The one associated with your Budgetly account.</span>
              </div>
            </div>
            <div class="step-divider"></div>
            <div class="step">
              <div class="step-num">02</div>
              <div class="step-text">
                <span class="step-title">Check your inbox</span>
                <span class="step-desc">We'll send a secure reset link right away.</span>
              </div>
            </div>
            <div class="step-divider"></div>
            <div class="step">
              <div class="step-num">03</div>
              <div class="step-text">
                <span class="step-title">Set a new password</span>
                <span class="step-desc">Pick something strong and get back to managing your household.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Trust row -->
        <div class="trust-row">
          <span class="trust-label">YOUR DATA IS ALWAYS SAFE</span>
          <div class="trust-line"></div>
        </div>

        <!-- Feature pills -->
        <div class="pills">
          <span class="pill"><i class="pi pi-shield"></i> Secure &amp; Private</span>
          <span class="pill"><i class="pi pi-lock"></i> Encrypted</span>
          <span class="pill"><i class="pi pi-envelope"></i> Email Verified</span>
          <span class="pill"><i class="pi pi-clock"></i> Link Expires in 1h</span>
          <span class="pill"><i class="pi pi-refresh"></i> Easy Reset</span>
          <span class="pill"><i class="pi pi-cloud"></i> Cloud Sync</span>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

/* ─── Palette ─────────────────────────────────────────────── */
/* #275954 teal | #F2E8DF cream | #B0D9CD mint               */
/* #012E40 navy | #F2D57E gold  | #81BDE0 sky                */

.auth-root {
  display: flex;
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
  background: #F2E8DF;
}

/* ════════════ FORM PANEL (left, white) ════════════ */
.form-panel {
  flex: 0 0 44%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  box-shadow: 4px 0 32px rgba(1,46,64,0.06);
}

.form-inner {
  width: 100%;
  max-width: 390px;
}

/* Logo */
.logo-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 2.25rem;
}
.logo-box {
  width: 38px; height: 38px;
  border-radius: 9px;
  overflow: hidden;
  background: #275954;
  flex-shrink: 0;
}
.logo-img { width: 100%; height: 100%; object-fit: cover; }
.logo-name {
  font-family: 'DM Serif Display', serif;
  font-size: 1.15rem;
  color: #012E40;
}

/* Head */
.form-head { margin-bottom: 1.75rem; }
.form-title {
  font-family: 'DM Serif Display', serif;
  font-size: 1.9rem;
  color: #012E40;
  margin: 0 0 0.45rem;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.form-sub {
  font-size: 0.88rem;
  color: #5b7a87;
  line-height: 1.65;
  margin: 0;
}

/* Fields */
.field { margin-bottom: 1rem; }
.flabel {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #012E40;
  margin-bottom: 0.4rem;
}
.finput-wrap { position: relative; }
.finput-icon {
  position: absolute; left: 0.85rem; top: 50%;
  transform: translateY(-50%);
  color: #81BDE0; font-size: 0.82rem; z-index: 1; pointer-events: none;
}

:deep(.finput.p-inputtext) {
  width: 100% !important;
  padding: 0.7rem 0.9rem 0.7rem 2.4rem !important;
  border: 1.5px solid #dde5e9 !important;
  border-radius: 9px !important;
  background: #f7fafb !important;
  color: #012E40 !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 0.88rem !important;
  transition: border-color 0.18s, box-shadow 0.18s !important;
  box-shadow: none !important;
}
:deep(.finput.p-inputtext:focus) {
  border-color: #275954 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(39,89,84,0.1) !important;
  outline: none !important;
}
:deep(.finput.p-inputtext::placeholder) { color: #b0c4cc !important; }

/* CTA */
.cta-btn {
  width: 100% !important;
  background: #275954 !important;
  border: none !important;
  border-radius: 9px !important;
  color: #F2E8DF !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 0.92rem !important;
  font-weight: 600 !important;
  padding: 0.8rem !important;
  letter-spacing: 0.01em !important;
  transition: background 0.18s, transform 0.15s !important;
  margin-bottom: 0 !important;
}
.cta-btn:hover:not(:disabled) {
  background: #1d433e !important;
  transform: translateY(-1px) !important;
}
.cta-btn:disabled { opacity: 0.5 !important; }

/* Divider */
.divider {
  display: flex; align-items: center;
  gap: 0.75rem; margin: 1.15rem 0;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px; background: #e5ebed;
}
.divider span {
  font-size: 0.72rem; font-weight: 700;
  color: #adc0c8; letter-spacing: 0.1em;
}

/* Resend row */
.resend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.resend-label {
  font-size: 0.84rem;
  color: #4e6e7a;
}
:deep(.resend-btn.p-button-text) {
  color: #F2D57E !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  font-family: 'DM Sans', sans-serif !important;
  padding: 0.3rem 0 !important;
  transition: color 0.2s !important;
}
:deep(.resend-btn.p-button-text:hover:not(:disabled)) {
  color: #d9a830 !important;
  background: transparent !important;
}
:deep(.resend-btn.p-button-text:disabled) {
  color: #adc0c8 !important;
  opacity: 1 !important;
}

/* Footer */
.form-footer {
  text-align: center;
  font-size: 0.85rem;
  color: #6e8f9a;
  margin-top: 1.4rem;
  margin-bottom: 0;
}
.footer-link {
  color: #275954; font-weight: 700;
  text-decoration: none; margin-left: 0.2rem;
  transition: color 0.18s;
}
.footer-link:hover { color: #F2D57E; }


/* ════════════ BRAND PANEL (right, dark) ════════════ */
.brand-panel {
  flex: 1;
  background: linear-gradient(155deg, #275954 0%, #012E40 55%, #011d2c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 3.5rem;
  position: relative;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 400px; height: 400px;
  top: -120px; right: -100px;
  background: radial-gradient(circle, rgba(129,189,224,0.2) 0%, transparent 65%);
}
.blob-2 {
  width: 350px; height: 350px;
  bottom: -100px; left: -80px;
  background: radial-gradient(circle, rgba(242,213,126,0.12) 0%, transparent 65%);
}

.brand-inner {
  position: relative; z-index: 1;
  max-width: 500px; width: 100%;
}

.brand-headline {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(2rem, 3.2vw, 3rem);
  color: #F2E8DF;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0 0 2rem;
}

/* Steps card */
.tcard {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(176,217,205,0.22);
  border-radius: 16px;
  padding: 1.5rem 1.6rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(6px);
}
.tcard-steps { display: flex; flex-direction: column; gap: 0; }

.step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.step-num {
  font-family: 'DM Serif Display', serif;
  font-size: 1.3rem;
  color: #F2D57E;
  line-height: 1;
  min-width: 28px;
  padding-top: 0.1rem;
}
.step-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.step-title {
  color: #F2E8DF;
  font-size: 0.88rem;
  font-weight: 600;
}
.step-desc {
  color: rgba(242,232,223,0.65);
  font-size: 0.80rem;
  line-height: 1.55;
}
.step-divider {
  height: 1px;
  background: rgba(176,217,205,0.15);
  margin: 0.9rem 0;
}

/* Trust row */
.trust-row {
  display: flex; align-items: center;
  gap: 0.9rem; margin-bottom: 1.1rem;
}
.trust-label {
  color: rgba(176,217,205,0.55);
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.12em; white-space: nowrap;
}
.trust-line {
  flex: 1; height: 1px;
  background: rgba(176,217,205,0.2);
}

/* Pills */
.pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(176,217,205,0.18);
  border-radius: 100px;
  padding: 0.3rem 0.8rem;
  color: rgba(242,232,223,0.75);
  font-size: 0.76rem; font-weight: 500;
  transition: background 0.18s;
}
.pill .pi { color: #B0D9CD; font-size: 0.7rem; }
.pill:hover { background: rgba(176,217,205,0.12); }

/* Responsive */
@media (max-width: 860px) {
  .brand-panel { display: none; }
  .form-panel  { flex: 1; }
}
@media (max-width: 480px) {
  .form-panel  { padding: 2rem 1.2rem; }
  .form-title  { font-size: 1.6rem; }
}
</style>