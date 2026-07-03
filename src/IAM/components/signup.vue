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
const userType = ref('Representative');
const selectedPlan = ref('FREE');
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

function getPlanCode(planLabel) {
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

    await httpInstance.post('/authentication/sign-up', {
      email: normalizedEmail,
      password: normalizedPassword,
      name: name.value,
      role,
      plan: planCode,
      householdId: userType.value === 'Member' ? householdId.value || null : null
    });

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
          <h1 class="form-title">Create Account</h1>
          <p class="form-sub">It only takes a minute to get started.</p>
        </div>

        <!-- Error / Success -->
        <Message v-if="error"   severity="error"   :closable="false" class="mb-3">{{ error }}</Message>
        <Message v-if="success" severity="success" :closable="false" class="mb-3">{{ success }}</Message>

        <!-- Account type toggle -->
        <div class="field">
          <label class="flabel">Account Type</label>
          <div class="type-toggle">
            <label :class="['type-opt', { active: userType === 'Representative' }]">
              <RadioButton v-model="userType" value="Representative" name="ut" inputId="ut-rep" class="sr-only-radio" />
              <i class="pi pi-home"></i>
              <span>Representative</span>
            </label>
            <label :class="['type-opt', { active: userType === 'Member' }]">
              <RadioButton v-model="userType" value="Member" name="ut" inputId="ut-mem" class="sr-only-radio" />
              <i class="pi pi-users"></i>
              <span>Member</span>
            </label>
          </div>
        </div>

        <!-- Full name -->
        <div class="field">
          <label for="sname" class="flabel">Full Name</label>
          <div class="finput-wrap">
            <i class="pi pi-user finput-icon"></i>
            <InputText id="sname" v-model="name" placeholder="Jane Doe" class="finput" autocomplete="name" />
          </div>
        </div>

        <!-- Email -->
        <div class="field">
          <label for="semail" class="flabel">Email</label>
          <div class="finput-wrap">
            <i class="pi pi-envelope finput-icon"></i>
            <InputText id="semail" v-model="email" type="email" placeholder="you@example.com" class="finput" autocomplete="email" />
          </div>
        </div>

        <!-- Password -->
        <div class="field">
          <label for="spassword" class="flabel">Password</label>
          <Password
              id="spassword" v-model="password"
              class="fpassword" inputClass="fpassword-input"
              toggleMask :feedback="true"
              placeholder="At least 8 characters"
              autocomplete="new-password"
          />
        </div>

        <!-- Confirm password -->
        <div class="field">
          <label for="sconfirm" class="flabel">Confirm Password</label>
          <Password
              id="sconfirm" v-model="confirm"
              class="fpassword" inputClass="fpassword-input"
              toggleMask :feedback="false"
              placeholder="Re-enter your password"
              autocomplete="new-password"
          />
        </div>

        <!-- Household ID (Member only) -->
        <div v-if="userType === 'Member'" class="field">
          <label for="hhid" class="flabel">
            Household ID
            <span class="flabel-opt">(optional)</span>
          </label>
          <div class="finput-wrap">
            <i class="pi pi-home finput-icon"></i>
            <InputText id="hhid" v-model="householdId" placeholder="Provided by your representative" class="finput" />
          </div>
        </div>

        <!-- Terms (Representative only) -->
        <div v-if="userType === 'Representative'" class="terms-row">
          <Checkbox inputId="accept" v-model="accept" :binary="true" class="fcheckbox" />
          <label for="accept" class="terms-text">
            I agree to the <a href="#" class="tlink">Terms</a> and <a href="#" class="tlink">Privacy Policy</a>.
          </label>
        </div>

        <!-- CTA -->
        <Button :disabled="isSubmitting" label="Create Account" class="cta-btn" @click="signUp" />

        <!-- Divider -->
        <div class="divider"><span>OR</span></div>

        <!-- Socials -->
        <Button class="social-btn" outlined @click="() => {}">
          <svg class="g-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <Button class="social-btn" outlined @click="() => {}">
          <i class="pi pi-github gh-icon"></i>
          Continue with GitHub
        </Button>

        <!-- Footer -->
        <p class="form-footer">
          Already have an account?
          <router-link to="/login" class="footer-link">Sign In</router-link>
        </p>
      </div>
    </div>

    <!-- ═════════════════════════════ RIGHT — BRAND ═════════════════════════════ -->
    <div class="brand-panel">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <div class="brand-inner">

        <h2 class="brand-headline">
          Your household,<br />your rules.
        </h2>

        <!-- Testimonial -->
        <div class="tcard">
          <svg class="tcard-quote" width="32" height="24" viewBox="0 0 32 24" fill="none">
            <path d="M0 24V14.4C0 6.4 5.33333 1.6 16 0L17.6 2.4C13.0667 3.46667 10.1333 5.6 8.8 8.8C8.26667 10.1333 8.05333 11.3333 8.16 12.4H14.4V24H0ZM17.6 24V14.4C17.6 6.4 22.9333 1.6 33.6 0L35.2 2.4C30.6667 3.46667 27.7333 5.6 26.4 8.8C25.8667 10.1333 25.6533 11.3333 25.76 12.4H32V24H17.6Z" fill="#F2D57E" opacity="0.7"/>
          </svg>
          <p class="tcard-text">
            "Setting up my household took less than 2 minutes. The role system keeps everything clean and everyone accountable."
          </p>
          <div class="tcard-author">
            <div class="tcard-avatar"><i class="pi pi-user"></i></div>
            <div>
              <span class="tcard-name">James Rivera</span>
              <span class="tcard-role">Premium Household Rep</span>
            </div>
          </div>
        </div>

        <!-- Plans overview -->
        <div class="trust-row">
          <span class="trust-label">SIMPLE PRICING</span>
          <div class="trust-line"></div>
        </div>

        <div class="plan-cards">
          <div class="plan-card">
            <span class="plan-badge plan-badge--free">Free</span>
            <p class="plan-desc">1 household · up to 3 members</p>
          </div>
          <div class="plan-card plan-card--premium">
            <span class="plan-badge plan-badge--premium">Premium</span>
            <p class="plan-desc">Unlimited households &amp; members</p>
          </div>
        </div>

        <!-- Feature pills -->
        <div class="trust-row" style="margin-top: 1.5rem;">
          <span class="trust-label">EVERYTHING INCLUDED</span>
          <div class="trust-line"></div>
        </div>

        <div class="pills">
          <span class="pill"><i class="pi pi-check"></i> Free to start</span>
          <span class="pill"><i class="pi pi-check"></i> Member roles</span>
          <span class="pill"><i class="pi pi-check"></i> Secure &amp; private</span>
          <span class="pill"><i class="pi pi-check"></i> Cancel anytime</span>
        </div>
      </div>
    </div>

    <!-- Plan dialog -->
    <Dialog v-model:visible="showPlanDialog" modal :style="{ width: '34rem' }" header="Choose your plan">
      <div class="plan-dialog-body">
        <label :class="['dialog-plan-card', { selected: selectedPlan === 'FREE' }]">
          <RadioButton inputId="plan-free" value="FREE" v-model="selectedPlan" />
          <div class="dialog-plan-info">
            <span class="dialog-plan-name">Free</span>
            <span class="dialog-plan-desc">1 household · up to 3 members</span>
          </div>
          <span class="dialog-plan-tag dialog-plan-tag--free">Free</span>
        </label>
        <label :class="['dialog-plan-card', { selected: selectedPlan === 'PREMIUM' }]">
          <RadioButton inputId="plan-premium" value="PREMIUM" v-model="selectedPlan" />
          <div class="dialog-plan-info">
            <span class="dialog-plan-name">Premium</span>
            <span class="dialog-plan-desc">Unlimited households &amp; members</span>
          </div>
          <span class="dialog-plan-tag dialog-plan-tag--premium">Premium</span>
        </label>
      </div>
      <div class="dialog-actions">
        <Button label="Cancel" outlined class="dialog-cancel" @click="showPlanDialog = false" />
        <Button label="Continue" class="dialog-confirm" @click="confirmPlanAndCreate" />
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

/* ─── Palette: #275954 | #F2E8DF | #B0D9CD | #012E40 | #F2D57E | #81BDE0 ─── */

.auth-root {
  display: flex;
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
  background: #F2E8DF;
}

/* ════════ FORM PANEL ════════ */
.form-panel {
  flex: 0 0 44%;
  background: #ffffff;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 2rem;
  overflow-y: auto;
  box-shadow: 4px 0 32px rgba(1,46,64,0.06);
}

.form-inner {
  width: 100%; max-width: 390px;
  padding-top: 1rem; padding-bottom: 2rem;
}

/* Logo */
.logo-row { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 1.75rem; }
.logo-box { width: 36px; height: 36px; border-radius: 8px; overflow: hidden; background: #275954; flex-shrink: 0; }
.logo-img { width: 100%; height: 100%; object-fit: cover; }
.logo-name { font-family: 'DM Serif Display', serif; font-size: 1.1rem; color: #012E40; }

/* Head */
.form-head { margin-bottom: 1.5rem; }
.form-title {
  font-family: 'DM Serif Display', serif;
  font-size: 1.75rem; color: #012E40;
  margin: 0 0 0.4rem; letter-spacing: -0.025em; line-height: 1.2;
}
.form-sub { font-size: 0.86rem; color: #5b7a87; line-height: 1.65; margin: 0; }

/* Fields */
.field { margin-bottom: 0.9rem; }
.flabel { display: block; font-size: 0.8rem; font-weight: 600; color: #012E40; margin-bottom: 0.38rem; }
.flabel-opt { color: #9ab5bf; font-weight: 400; font-size: 0.75rem; }

.finput-wrap { position: relative; }
.finput-icon {
  position: absolute; left: 0.8rem; top: 50%;
  transform: translateY(-50%); color: #81BDE0; font-size: 0.8rem; z-index: 1; pointer-events: none;
}

:deep(.finput.p-inputtext) {
  width: 100% !important;
  padding: 0.65rem 0.85rem 0.65rem 2.35rem !important;
  border: 1.5px solid #dde5e9 !important; border-radius: 9px !important;
  background: #f7fafb !important; color: #012E40 !important;
  font-family: 'DM Sans', sans-serif !important; font-size: 0.86rem !important;
  transition: border-color 0.18s, box-shadow 0.18s !important; box-shadow: none !important;
}
:deep(.finput.p-inputtext:focus) {
  border-color: #275954 !important; background: #fff !important;
  box-shadow: 0 0 0 3px rgba(39,89,84,0.1) !important; outline: none !important;
}
:deep(.finput.p-inputtext::placeholder) { color: #b0c4cc !important; }

:deep(.fpassword) { width: 100%; }
:deep(.fpassword .fpassword-input) {
  width: 100% !important;
  padding: 0.65rem 2.5rem 0.65rem 0.85rem !important;
  border: 1.5px solid #dde5e9 !important; border-radius: 9px !important;
  background: #f7fafb !important; color: #012E40 !important;
  font-family: 'DM Sans', sans-serif !important; font-size: 0.86rem !important;
  transition: border-color 0.18s, box-shadow 0.18s !important; box-shadow: none !important;
}
:deep(.fpassword .fpassword-input:focus) {
  border-color: #275954 !important; background: #fff !important;
  box-shadow: 0 0 0 3px rgba(39,89,84,0.1) !important; outline: none !important;
}
:deep(.fpassword .fpassword-input::placeholder) { color: #b0c4cc !important; }

/* Account type toggle */
.type-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.type-opt {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.62rem 0.9rem;
  border-radius: 9px; border: 1.5px solid #dde5e9;
  color: #6e8f9a; font-size: 0.84rem; cursor: pointer;
  transition: all 0.18s; background: #f7fafb;
}
.type-opt .pi { font-size: 0.82rem; }
.type-opt.active {
  border-color: #275954; color: #275954;
  background: rgba(39,89,84,0.06);
  font-weight: 600;
}
.sr-only-radio { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

/* Terms */
.terms-row { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.5rem 0 1rem; }
.terms-text { font-size: 0.83rem; color: #4e6e7a; line-height: 1.5; cursor: pointer; }
.tlink { color: #F2D57E; font-weight: 600; text-decoration: none; }
.tlink:hover { color: #d9a830; }

:deep(.fcheckbox .p-checkbox-box) {
  border-color: #c5d5db !important; border-radius: 5px !important;
  width: 15px !important; height: 15px !important;
}
:deep(.fcheckbox .p-checkbox-box.p-highlight) {
  background: #275954 !important; border-color: #275954 !important;
}

/* CTA */
.cta-btn {
  width: 100% !important;
  background: #275954 !important; border: none !important;
  border-radius: 9px !important; color: #F2E8DF !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 0.91rem !important; font-weight: 600 !important;
  padding: 0.78rem !important; letter-spacing: 0.01em !important;
  transition: background 0.18s, transform 0.15s !important;
}
.cta-btn:hover:not(:disabled) { background: #1d433e !important; transform: translateY(-1px) !important; }
.cta-btn:disabled { opacity: 0.5 !important; }

/* Divider */
.divider { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5ebed; }
.divider span { font-size: 0.7rem; font-weight: 700; color: #adc0c8; letter-spacing: 0.1em; }

/* Social */
.social-btn {
  width: 100% !important; background: #fff !important;
  border: 1.5px solid #dde5e9 !important; border-radius: 9px !important;
  color: #012E40 !important; font-family: 'DM Sans', sans-serif !important;
  font-size: 0.86rem !important; font-weight: 500 !important;
  padding: 0.68rem !important;
  display: flex !important; align-items: center !important;
  justify-content: center !important; gap: 0.5rem !important;
  margin-bottom: 0.55rem;
  transition: border-color 0.18s, background 0.18s !important;
}
.social-btn:last-of-type { margin-bottom: 0; }
.social-btn:hover { border-color: #B0D9CD !important; background: #f7fafb !important; }
.g-icon { width: 16px; height: 16px; flex-shrink: 0; }
.gh-icon { font-size: 0.93rem; color: #012E40; }

/* Footer */
.form-footer { text-align: center; font-size: 0.84rem; color: #6e8f9a; margin-top: 1.25rem; margin-bottom: 0; }
.footer-link { color: #275954; font-weight: 700; text-decoration: none; margin-left: 0.2rem; }
.footer-link:hover { color: #F2D57E; }


/* ════════ BRAND PANEL ════════ */
.brand-panel {
  flex: 1;
  background: linear-gradient(155deg, #275954 0%, #012E40 55%, #011d2c 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 3rem 3.5rem; position: relative; overflow: hidden;
}

.blob { position: absolute; border-radius: 50%; pointer-events: none; }
.blob-1 {
  width: 380px; height: 380px; top: -100px; right: -90px;
  background: radial-gradient(circle, rgba(129,189,224,0.2) 0%, transparent 65%);
}
.blob-2 {
  width: 300px; height: 300px; bottom: -80px; left: -70px;
  background: radial-gradient(circle, rgba(242,213,126,0.12) 0%, transparent 65%);
}

.brand-inner { position: relative; z-index: 1; max-width: 500px; width: 100%; }

.brand-headline {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(1.9rem, 3vw, 2.8rem);
  color: #F2E8DF; line-height: 1.15;
  letter-spacing: -0.03em; margin: 0 0 1.75rem;
}

/* Testimonial */
.tcard {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(176,217,205,0.22);
  border-radius: 16px; padding: 1.4rem 1.5rem; margin-bottom: 1.75rem;
  backdrop-filter: blur(6px);
}
.tcard-quote { margin-bottom: 0.45rem; display: block; }
.tcard-text { color: rgba(242,232,223,0.88); font-size: 0.86rem; line-height: 1.8; font-style: italic; margin: 0 0 1.1rem; }
.tcard-author { display: flex; align-items: center; gap: 0.65rem; }
.tcard-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #B0D9CD, #81BDE0);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tcard-avatar .pi { color: #012E40; font-size: 0.9rem; }
.tcard-name { display: block; color: #F2E8DF; font-size: 0.84rem; font-weight: 600; }
.tcard-role { display: block; color: #81BDE0; font-size: 0.74rem; margin-top: 0.1rem; }

/* Trust row */
.trust-row { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 0.9rem; }
.trust-label { color: rgba(176,217,205,0.55); font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; white-space: nowrap; }
.trust-line { flex: 1; height: 1px; background: rgba(176,217,205,0.2); }

/* Plan cards */
.plan-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
.plan-card {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(176,217,205,0.18);
  border-radius: 12px; padding: 0.85rem 1rem;
}
.plan-card--premium { border-color: rgba(242,213,126,0.3); }
.plan-badge {
  display: inline-block; font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding: 0.22rem 0.6rem; border-radius: 100px; margin-bottom: 0.4rem;
}
.plan-badge--free    { background: rgba(176,217,205,0.2); color: #B0D9CD; }
.plan-badge--premium { background: rgba(242,213,126,0.2); color: #F2D57E; }
.plan-desc { color: rgba(242,232,223,0.7); font-size: 0.75rem; margin: 0; line-height: 1.5; }

/* Pills */
.pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(176,217,205,0.18);
  border-radius: 100px; padding: 0.28rem 0.75rem;
  color: rgba(242,232,223,0.75); font-size: 0.74rem; font-weight: 500;
}
.pill .pi { color: #B0D9CD; font-size: 0.68rem; }

/* ════════ PLAN DIALOG ════════ */
.plan-dialog-body { display: flex; flex-direction: column; gap: 0.7rem; margin-bottom: 1.4rem; }
.dialog-plan-card {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.9rem 1.1rem; border-radius: 12px;
  border: 1.5px solid #dde5e9; cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  background: #f7fafb;
}
.dialog-plan-card.selected { border-color: #275954; background: rgba(39,89,84,0.06); }
.dialog-plan-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.dialog-plan-name { color: #012E40; font-size: 0.9rem; font-weight: 600; }
.dialog-plan-desc { color: #5b7a87; font-size: 0.8rem; }
.dialog-plan-tag {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 100px;
}
.dialog-plan-tag--free    { background: rgba(39,89,84,0.1); color: #275954; }
.dialog-plan-tag--premium { background: rgba(242,213,126,0.2); color: #9a7a10; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.65rem; }
.dialog-cancel {
  background: transparent !important; border-color: #dde5e9 !important;
  color: #6e8f9a !important; border-radius: 8px !important;
}
.dialog-confirm {
  background: #275954 !important; border: none !important;
  color: #F2E8DF !important; font-weight: 600 !important; border-radius: 8px !important;
}

/* Responsive */
@media (max-width: 860px) { .brand-panel { display: none; } .form-panel { flex: 1; } }
@media (max-width: 480px)  { .form-panel { padding: 1.5rem 1.2rem; } .form-title { font-size: 1.5rem; } }
</style>