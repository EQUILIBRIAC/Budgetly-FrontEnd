<script setup lang="js">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import httpInstance, { AUTH_TOKEN_KEY } from '@/shared/services/http.instance';

import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Message from 'primevue/message';

const router = useRouter();
const email = ref('');
const password = ref('');
const remember = ref(false);
const error = ref('');
const isSubmitting = ref(false);

async function fetchUserProfile(id) {
  const res = await httpInstance.get(`/user/user/${id}`);
  return res.data;
}

function decodeRoleFromToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const roleClaim = decoded?.role || decoded?.Role || decoded?.roles?.[0];
    return roleClaim ? String(roleClaim).toLowerCase() : null;
  } catch (_) {
    return null;
  }
}

async function signIn() {
  if (isSubmitting.value) return;
  error.value = '';

  if (!email.value || !password.value) {
    error.value = 'Please fill in your email and password.';
    return;
  }

  const normalizedEmail = String(email.value).trim().toLowerCase();
  const normalizedPassword = String(password.value);
  isSubmitting.value = true;

  try {
    const response = await httpInstance.post('/authentication/sign-in', {
      email: normalizedEmail,
      password: normalizedPassword
    });

    const {
      token, id, email: responseEmail,
      isNewUser: authIsNewUser, householdId: authHouseholdId,
      role: responseRole, plan: authPlan
    } = response.data || {};

    if (!token) throw new Error('Token not returned. Please try again.');

    const role = responseRole?.toLowerCase?.() || decodeRoleFromToken(token) || 'representative';
    localStorage.setItem(AUTH_TOKEN_KEY, token);

    const profile = await fetchUserProfile(id);

    const onboardingPending = (authIsNewUser ?? false) || profile?.isNewUser?.toLowerCase?.() === 'true';
    const resolvedHouseholdId = authHouseholdId || profile?.houseHoldId || '';
    const resolvedPlan = (authPlan || profile?.plan || 'FREE').toString().toUpperCase();

    localStorage.setItem('user', JSON.stringify({
      id, email: responseEmail || normalizedEmail,
      role, householdId: resolvedHouseholdId,
      isNewUser: onboardingPending, plan: resolvedPlan
    }));

    if (onboardingPending) localStorage.setItem('isNewUser', 'true');
    else localStorage.removeItem('isNewUser');

    const target = role === 'member' ? 'member-dashboard' : 'representative-dashboard';
    await router.push({ name: target });
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'An error occurred while signing in. Please try again.';
    console.error('Sign in error:', err);
  } finally {
    isSubmitting.value = false;
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
          <h1 class="form-title">Welcome Back!</h1>
          <p class="form-sub">Sign in to access your dashboard and continue managing your household.</p>
        </div>

        <!-- Error -->
        <Message v-if="error" severity="error" :closable="false" class="mb-4">{{ error }}</Message>

        <!-- Email -->
        <div class="field">
          <label for="email" class="flabel">Email</label>
          <div class="finput-wrap">
            <i class="pi pi-envelope finput-icon"></i>
            <InputText
                id="email" v-model="email" type="email"
                placeholder="Enter your email"
                class="finput" autocomplete="email"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="field">
          <label for="password" class="flabel">Password</label>
          <Password
              id="password" v-model="password"
              class="fpassword" inputClass="fpassword-input"
              toggleMask :feedback="false"
              placeholder="Enter your password"
              autocomplete="current-password"
          />
        </div>

        <!-- Options -->
        <div class="options-row">
          <label class="remember-label">
            <Checkbox v-model="remember" :binary="true" inputId="rem" class="fcheckbox" />
            <span>Remember me</span>
          </label>
          <router-link to="forgot-password" class="forgot-link">Forgot Password?</router-link>
        </div>

        <!-- CTA -->
        <Button :disabled="isSubmitting" label="Sign In" class="cta-btn" @click="signIn" />

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
          Don't have an Account?
          <router-link to="signup" class="footer-link">Sign Up</router-link>
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
          Manage your<br />household<br />smarter.
        </h2>

        <!-- Testimonial -->
        <div class="tcard">
          <svg class="tcard-quote" width="32" height="24" viewBox="0 0 32 24" fill="none">
            <path d="M0 24V14.4C0 6.4 5.33333 1.6 16 0L17.6 2.4C13.0667 3.46667 10.1333 5.6 8.8 8.8C8.26667 10.1333 8.05333 11.3333 8.16 12.4H14.4V24H0ZM17.6 24V14.4C17.6 6.4 22.9333 1.6 33.6 0L35.2 2.4C30.6667 3.46667 27.7333 5.6 26.4 8.8C25.8667 10.1333 25.6533 11.3333 25.76 12.4H32V24H17.6Z" fill="#F2D57E" opacity="0.7"/>
          </svg>
          <p class="tcard-text">
            "This platform has completely transformed how we manage our household. It's reliable, efficient, and keeps everything organized."
          </p>
          <div class="tcard-author">
            <div class="tcard-avatar">
              <i class="pi pi-user"></i>
            </div>
            <div>
              <span class="tcard-name">Sarah Mitchell</span>
              <span class="tcard-role">Household Representative</span>
            </div>
          </div>
        </div>

        <!-- Trust row -->
        <div class="trust-row">
          <span class="trust-label">JOIN 5K+ HOUSEHOLDS</span>
          <div class="trust-line"></div>
        </div>

        <!-- Feature pills -->
        <div class="pills">
          <span class="pill"><i class="pi pi-home"></i> Household Mgmt</span>
          <span class="pill"><i class="pi pi-users"></i> Member Roles</span>
          <span class="pill"><i class="pi pi-shield"></i> Secure &amp; Private</span>
          <span class="pill"><i class="pi pi-chart-bar"></i> Analytics</span>
          <span class="pill"><i class="pi pi-bell"></i> Notifications</span>
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

:deep(.fpassword) { width: 100%; }
:deep(.fpassword .fpassword-input) {
  width: 100% !important;
  padding: 0.7rem 2.6rem 0.7rem 0.9rem !important;
  border: 1.5px solid #dde5e9 !important;
  border-radius: 9px !important;
  background: #f7fafb !important;
  color: #012E40 !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 0.88rem !important;
  transition: border-color 0.18s, box-shadow 0.18s !important;
  box-shadow: none !important;
}
:deep(.fpassword .fpassword-input:focus) {
  border-color: #275954 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(39,89,84,0.1) !important;
  outline: none !important;
}
:deep(.fpassword .fpassword-input::placeholder) { color: #b0c4cc !important; }

/* Options */
.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.35rem;
}
.remember-label {
  display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.84rem; color: #4e6e7a; cursor: pointer;
}
:deep(.fcheckbox .p-checkbox-box) {
  border-color: #c5d5db !important;
  border-radius: 5px !important;
  width: 15px !important; height: 15px !important;
}
:deep(.fcheckbox .p-checkbox-box.p-highlight) {
  background: #275954 !important;
  border-color: #275954 !important;
}
.forgot-link {
  font-size: 0.82rem; font-weight: 600;
  color: #F2D57E; text-decoration: none; transition: color 0.2s;
}
.forgot-link:hover { color: #d9a830; }

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

/* Social */
.social-btn {
  width: 100% !important;
  background: #fff !important;
  border: 1.5px solid #dde5e9 !important;
  border-radius: 9px !important;
  color: #012E40 !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 0.88rem !important;
  font-weight: 500 !important;
  padding: 0.7rem !important;
  display: flex !important; align-items: center !important;
  justify-content: center !important; gap: 0.55rem !important;
  margin-bottom: 0.6rem;
  transition: border-color 0.18s, background 0.18s !important;
}
.social-btn:last-of-type { margin-bottom: 0; }
.social-btn:hover {
  border-color: #B0D9CD !important;
  background: #f7fafb !important;
}
.g-icon { width: 17px; height: 17px; flex-shrink: 0; }
.gh-icon { font-size: 0.95rem; color: #012E40; }

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

/* Testimonial card */
.tcard {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(176,217,205,0.22);
  border-radius: 16px;
  padding: 1.5rem 1.6rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(6px);
}
.tcard-quote { margin-bottom: 0.5rem; display: block; }
.tcard-text {
  color: rgba(242,232,223,0.88);
  font-size: 0.88rem;
  line-height: 1.8;
  font-style: italic;
  margin: 0 0 1.2rem;
}
.tcard-author {
  display: flex; align-items: center; gap: 0.7rem;
}
.tcard-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #B0D9CD, #81BDE0);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tcard-avatar .pi { color: #012E40; font-size: 0.95rem; }
.tcard-name {
  display: block; color: #F2E8DF;
  font-size: 0.86rem; font-weight: 600;
}
.tcard-role {
  display: block; color: #81BDE0;
  font-size: 0.76rem; margin-top: 0.1rem;
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