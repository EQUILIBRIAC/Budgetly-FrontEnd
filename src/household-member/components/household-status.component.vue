<script setup>
import { ref, onMounted, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'

import { HouseholdAPI } from '../infrastructure/household.api.js'

const loading = ref(true)
const error = ref('')
const periodOptions = ref([])
const selectedPeriod = ref(null)
const datasets = ref({})

const defaultSummary = {
  totalContributed: 0,
  monthlyGoal: 0,
  progress: 0,
  contributors: 0,
  currency: 'PEN'
}

const summary = computed(() => datasets.value?.[selectedPeriod.value]?.summary || defaultSummary)
const rows = computed(() => datasets.value?.[selectedPeriod.value]?.rows || [])

const money = (n = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: summary.value.currency || 'PEN'
  }).format(n || 0)

const statusSeverity = status =>
  status === 'Completed' ? 'success' : status === 'Overdue' ? 'danger' : 'warn'

onMounted(load)

async function load () {
  loading.value = true
  error.value = ''
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const householdId = user?.householdId || ''
    if (!householdId) throw new Error('Household was not found.')

    const [
      memberList,
      bills,
      contributions,
      memberContribs,
      users,
      household
    ] = await Promise.all([
      HouseholdAPI.membersByHousehold(householdId),
      HouseholdAPI.billsByHousehold(householdId),
      HouseholdAPI.contributionsByHousehold(householdId),
      HouseholdAPI.memberContributions(),
      HouseholdAPI.users(),
      HouseholdAPI.householdByIdSafe(householdId)
    ])

    const currency = household?.currency === 2 ? 'USD' : 'PEN'
    const memberIds = new Set(memberList.map(m => String(m.id)))
    const filteredEntries = memberContribs.filter(entry => memberIds.has(String(entry.memberId)))
    const { dataset, options } = buildPeriodDataset({
      members: memberList,
      contributions,
      contributionEntries: filteredEntries,
      bills,
      users,
      currency
    })

    datasets.value = dataset
    periodOptions.value = options
    selectedPeriod.value = options[0]?.value || null
  } catch (e) {
    console.error(e)
    const status = e?.response?.status
    if (status === 404) {
      error.value = 'Could not find your household. Verify the household ID or join one from Search Household.'
    } else {
      error.value = 'Could not load household status.'
    }
  } finally {
    loading.value = false
  }
}

function exportCSV () {
  const header = ['Member', 'Contributed amount', 'Assigned amount', 'Due date', 'Status']
  const lines = rows.value.map(r => [
    r.name,
    Number(r.contributed).toFixed(2),
    Number(r.assigned).toFixed(2),
    r.deadline,
    r.status
  ])
  const csv = [header, ...lines].map(a => a.join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'household_status.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function buildPeriodDataset ({ members, contributions, contributionEntries, bills, users, currency }) {
  const usersMap = new Map(users.map(u => [String(u.id), u]))
  const billMap = new Map(bills.map(b => [String(b.id), b]))
  const membersWithNames = members.map(member => ({
    ...member,
    name: usersMap.get(String(member.userId))?.name || 'Member'
  }))
  const contributionIds = new Set(contributions.map(c => String(c.id)))
  const memberIds = new Set(membersWithNames.map(m => String(m.id)))
  const validEntries = contributionEntries.filter(entry =>
    contributionIds.has(String(entry.contributionId)) && memberIds.has(String(entry.memberId))
  )
  const periods = new Map()
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

  const getPeriodKey = date => {
    if (!date) return 'general'
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return 'general'
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
  }
  const getLabel = key => {
    if (key === 'general') return 'General'
    const [year, month] = key.split('-')
    return formatter
      .format(new Date(Number(year), Number(month) - 1, 1))
      .replace(/^\w/, c => c.toUpperCase())
  }
  const ensurePeriod = key => {
    if (!periods.has(key)) {
      periods.set(key, {
        label: getLabel(key),
        billIds: new Set(),
        contributionIds: new Set()
      })
    }
    return periods.get(key)
  }

  bills.forEach(bill => {
    const key = getPeriodKey(bill.paymentDay || bill.createdAt)
    ensurePeriod(key).billIds.add(String(bill.id))
  })

  contributions.forEach(contribution => {
    const bill = billMap.get(String(contribution.billId))
    const key = getPeriodKey(bill?.paymentDay || contribution.deadlineForMembers || contribution.createdAt)
    const bucket = ensurePeriod(key)
    bucket.contributionIds.add(String(contribution.id))
    if (bill) bucket.billIds.add(String(bill.id))
  })

  if (!periods.size) ensurePeriod('general')

  const dataset = {}
  const options = [...periods.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, bucket]) => {
      const periodBills = [...bucket.billIds].map(id => billMap.get(id)).filter(Boolean)
      const periodContributions = contributions.filter(c => bucket.contributionIds.has(String(c.id)))
      const periodEntries = validEntries.filter(entry => bucket.contributionIds.has(String(entry.contributionId)))
      dataset[key] = buildRowsForPeriod({
        members: membersWithNames,
        bills: periodBills,
        contributions: periodContributions,
        entries: periodEntries,
        currency,
        billMap
      })
      return { label: bucket.label, value: key }
    })

  return { dataset, options }
}

function buildRowsForPeriod ({ members, bills, contributions, entries, currency, billMap }) {
  const memberCount = members.length || 1
  const monthlyGoal = bills.reduce((sum, bill) => sum + Number(bill?.amount || 0), 0)
  const baseShare = memberCount ? monthlyGoal / memberCount : 0
  const contributionIds = new Set(contributions.map(c => String(c.id)))
  const deadlineDates = contributions
    .map(c => c.deadlineForMembers || billMap.get(String(c.billId))?.paymentDay)
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
  const maxDeadline = deadlineDates.length ? new Date(Math.max(...deadlineDates.map(d => d.getTime()))) : null

  const rows = members.map(member => {
    const myEntries = entries.filter(entry => String(entry.memberId) === String(member.id) && contributionIds.has(String(entry.contributionId)))
    const assignedFromEntries = myEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const contributed = myEntries
      .filter(entry => Number(entry.status) === 1)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const assigned = myEntries.length ? assignedFromEntries : Number(baseShare.toFixed(2))
    const status = assigned > 0 && contributed >= assigned ? 'Completed' : 'Pending'

    return {
      id: member.id,
      name: member.name,
      contributed: Number(contributed.toFixed(2)),
      assigned: Number(assigned.toFixed(2)),
      deadline: maxDeadline ? formatDate(maxDeadline) : '—',
      status
    }
  })

  const totalContributed = rows.reduce((sum, row) => sum + row.contributed, 0)
  const progress = monthlyGoal > 0 ? Number(((totalContributed / monthlyGoal) * 100).toFixed(2)) : 0
  const contributors = rows.filter(row => row.contributed > 0).length

  return {
    summary: { totalContributed, monthlyGoal, progress, contributors, currency },
    rows
  }
}

function formatDate (value) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <!-- contenedor propio (no dependemos del Card) -->
    <div class="content-card">
      <div class="header">
        <h2 class="title">Household status</h2>
        <SelectButton
            v-model="selectedPeriod"
            :options="periodOptions"
            optionLabel="label"
            optionValue="value"
            aria-label="Period"
            class="month"
        />
      </div>

      <hr class="sep" />

      <div class="kpi-grid">
        <div class="kpi-label">Total contributed:</div>
        <div class="kpi-value">{{ money(summary.totalContributed) }}</div>

        <div class="kpi-label">Monthly goal:</div>
        <div class="kpi-value">{{ money(summary.monthlyGoal) }}</div>

        <div class="kpi-label">Completion rate:</div>
        <div class="kpi-value">{{ summary.progress }}%</div>

        <div class="kpi-label">Contributors:</div>
        <div class="kpi-value">{{ summary.contributors }}</div>
      </div>

      <hr class="sep" />

      <div class="table-top">
        <Button label="Export" icon="pi pi-download" class="p-button-success" @click="exportCSV" />
      </div>

      <Message v-if="error" severity="error" :closable="false" class="mb-3">{{ error }}</Message>

      <DataTable
          v-else
          :value="rows"
          :loading="loading"
          size="small"
          :stripedRows="true"
          :showGridlines="true"
          class="state-table"
      >
        <Column field="name" header="Member" :sortable="true">
          <template #body="{ data }">{{ data.name }}</template>
        </Column>

        <Column field="contributed" header="Contributed amount" :sortable="true">
          <template #body="{ data }">S/ {{ Number(data.contributed || 0).toFixed(2) }}</template>
        </Column>

        <Column field="assigned" header="Assigned amount" :sortable="true">
          <template #body="{ data }">S/ {{ Number(data.assigned || 0).toFixed(2) }}</template>
        </Column>

        <Column field="deadline" header="Due date" :sortable="true">
          <template #body="{ data }">{{ data.deadline }}</template>
        </Column>

        <Column header="Status">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="statusSeverity(data.status)" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
:host {
  display: block;
  margin-left: 250px;
  padding: 1rem;
  box-sizing: border-box;
  background: transparent;
}
@media (max-width: 992px) {
  :host { margin-left: 60px; }
}

.page {
  max-width: 1100px;
  margin: 0 auto;
}

.content-card {
  background: #ffffff;
  color: #222;
  border-radius: 16px;
  border: 0;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  padding: 1.25rem 1.5rem 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.2px;
  color: #1a1a1a;
}
.month :deep(.p-selectbutton) {
  border-radius: 999px;
  overflow: hidden;
}
.month :deep(.p-selectbutton .p-button) {
  padding: 0.45rem 0.9rem;
  box-shadow: none;
}

.sep {
  border: none;
  border-top: 2px solid rgba(0, 0, 0, 0.1);
  margin: 0.75rem 0 1rem;
}

.kpi-grid {
  max-width: 760px;
  display: grid;
  grid-template-columns: 280px 1fr;
  margin-bottom: 1rem;
}
.kpi-label,
.kpi-value {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.kpi-label {
  background: #2f7fdc; /* azul */
  color: #fff;
  font-weight: 600;
  border-right: none;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}
.kpi-value {
  background: #f9f9f9;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  color: #222;
}

.table-top {
  display: flex;
  justify-content: flex-end;
  margin: 0.2rem 0 0.6rem;
}

.state-table :deep(.p-datatable-thead > tr > th) {
  background: #2f7fdc;
  color: #fff;
  font-weight: 700;
  border-color: rgba(255, 255, 255, 0.15);
}
.state-table :deep(.p-datatable-wrapper) {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.state-table :deep(.p-datatable-tbody > tr > td) {
  border-color: rgba(0, 0, 0, 0.08);
  color: #1a1a1a;
  background: #fff;
}
.state-table :deep(.p-datatable-tbody > tr:nth-child(even) > td) {
  background: #f9f9f9;
}
.state-table :deep(.p-datatable-tbody > tr:hover) {
  background: rgba(47, 127, 220, 0.08);
}
</style>
