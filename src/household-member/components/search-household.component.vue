<script setup>
import { ref } from 'vue'
import { searchHouseholdById, joinHousehold } from '../services/household.service.js'

import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

const code = ref('')
const found = ref(null)
const msg = ref('')
const msgSeverity = ref('info')
const searching = ref(false)
const joining = ref(false)

const getCurrentUserId = () => {
  try { return String(JSON.parse(localStorage.getItem('user') || '{}')?.id || '') } catch { return '' }
}
const getCurrentHouseholdId = () => {
  try { return String(JSON.parse(localStorage.getItem('user') || '{}')?.householdId || '') } catch { return '' }
}

async function onSearch () {
  msg.value = ''
  found.value = null
  const q = code.value.trim()
  if (!q) {
    msg.value = 'Enter a household ID.'
    msgSeverity.value = 'warn'
    return
  }
  searching.value = true
  try {
    const res = await searchHouseholdById(q)
    if (!res) {
      msg.value = 'No household was found with that ID.'
      msgSeverity.value = 'warn'
    } else {
      found.value = res
    }
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    if (status === 404) {
      msg.value = 'No household was found with that ID.'
      msgSeverity.value = 'warn'
    } else {
      msg.value = 'An error occurred while searching for the household.'
      msgSeverity.value = 'error'
    }
  } finally {
    searching.value = false
  }
}

async function onJoin () {
  if (!found.value) return
  const userId = getCurrentUserId()
  if (!userId) {
    msg.value = 'Sign in to join a household.'
    msgSeverity.value = 'warn'
    return
  }
  const currentHog = getCurrentHouseholdId()
  if (currentHog && currentHog === found.value.id) {
    msg.value = 'You already belong to this household.'
    msgSeverity.value = 'info'
    return
  }

  joining.value = true
  try {
    await joinHousehold(userId, found.value.id)
    msg.value = 'You joined the household successfully.'
    msgSeverity.value = 'success'
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    u.householdId = found.value.id
    localStorage.setItem('user', JSON.stringify(u))
  } catch (e) {
    console.error(e)
    msg.value = 'It was not possible to join the household.'
    msgSeverity.value = 'error'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="search-card">
      <h2 class="title">Join a household</h2>
      <p class="description">
        Enter the ID provided by your representative to join your household.
      </p>

      <div class="input-row">
        <InputText v-model="code" placeholder="e.g. HH1728345678901" @keyup.enter="onSearch" />
        <Button label="Search" icon="pi pi-search" :loading="searching" @click="onSearch" />
      </div>

      <div v-if="found" class="valid-message">
        Valid ID ✓
      </div>

      <div class="join-button">
        <Button label="Join household" icon="pi pi-check" :disabled="!found" :loading="joining" @click="onJoin" />
      </div>

      <Message v-if="msg" :severity="msgSeverity" :closable="false" class="mt-3">
        {{ msg }}
      </Message>

      <p class="note">
        Remember that this process is optional. You can also wait for your representative to add you manually.
      </p>
    </div>
  </div>
</template>

<style scoped>


.page {
  display: flex;
  justify-content: center;
  min-height: 100vh; /* full viewport height */
  background: #f5f6fa;
  animation: fadeIn 0.5s ease-in-out;
  padding: 1rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}





.search-card {
  background: #ffffff;
  color: #222;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  padding: 2rem 2.5rem;
  text-align: center;
  width: 100%;
  max-width: 480px;
  max-height: 480px;
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  text-align: center;
}

.description {
  font-size: 1rem;
  color: #444;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.input-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.input-row :deep(.p-inputtext) {
  flex: 1;
  min-width: 230px;
  border-radius: 8px;
  padding: 0.6rem;
  font-size: 0.95rem;
}

.input-row :deep(.p-button) {
  background: #2f7fdc;
  border: none;
  color: white;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  transition: background 0.2s;
}
.input-row :deep(.p-button:hover) {
  background: #256bb7;
}

.valid-message {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: #256bb7;
}

.join-button :deep(.p-button) {
  background: #2f7fdc;
  border: none;
  color: white;
  border-radius: 10px;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.2s;
}
.join-button :deep(.p-button:hover) {
  background: #256bb7;
}

.note {
  font-size: 0.85rem;
  color: #666;
  margin-top: 1.25rem;
  line-height: 1.4;
}
</style>
