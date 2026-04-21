<script setup>
import { ref, onMounted, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import Toolbar from 'primevue/toolbar'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

import houseImg from '@/assets/house.png'

import { HouseholdAPI } from '@/household-member/infrastructure/household.api.js'
import http from '@/shared/services/http.instance.js'

const { t } = useI18n()

// Props
const props = defineProps({
  householdId: {
    type: String,
    default: null
  }
})

const householdId = ref('')
const plan = ref('')
const households = ref([])
const router = useRouter()

const loading = ref(false)
const error = ref('')
const success = ref('')

// Income management for PREMIUM users (global, not per household)
const userIncomeVisible = ref(false)
const userTotalIncome = ref(0)
const incomeAllocations = ref([]) // Array of { householdId, householdName, percentage }
const userId = ref(null)

// Tabla 1 (FREE): resumen del representante
const monthlyTotal = ref(0)
const rows = ref([{ lastIncome: 0, myTotal: 0, compliance: 0, memberCount: 0, memberId: '' }])

// Modal para registrar "ingreso" como aporte (memberContribution)
const editVisible = ref(false)
const editAmount = ref(0)
const editingRow = ref(null)
const activeContributionId = ref('')

// Tabla 2 (informativa): distribuciÃ³n proporcional acumulativa
const allocRows = ref([])
const memberTotals = ref([])
// ContribuciÃ³n (Ãºltima) por billId
const contribByBill = ref(new Map())
const billsRef = ref([])
const membersRef = ref([])
// member-contribution status cache: key `${billId}::${memberId}` -> { id, status, amount, payedAt, contributionId }
const statusByMemberAndBill = ref(new Map())

// Agrupar por bill para mostrarlos en pestaÃ±as
const allocByBill = computed(() => {
  const map = new Map()
  for (const r of allocRows.value || []) {
    const key = `${r.billId}||${r.billDesc}`
    if (!map.has(key)) {
      map.set(key, {
        billId: r.billId,
        billDesc: r.billDesc,
        billAmount: r.billAmount,
        paymentDay: r.paymentDay,
        rows: []
      })
    }
    map.get(key).rows.push(r)
  }
  // agregar deadline si existe contribucion
  for (const v of map.values()) {
    v.deadlineForMembers = contribByBill.value.get(String(v.billId || ''))?.deadlineForMembers || null
  }
  const arr = Array.from(map.values())
  arr.sort((a,b)=> String(a.paymentDay||'').localeCompare(String(b.paymentDay||'')) || String(a.billId).localeCompare(String(b.billId)))
  return arr
})

// Grupos que tienen una contribución creada (para renderizar una "ventana" por bill)
const groupsWithContribution = computed(() => {
  const groups = allocByBill.value || []
  const byId = new Map(groups.map(g => [String(g.billId), g]))
  const bills = billsRef.value || []
  const result = []
  const map = contribByBill.value || new Map()
  for (const [billId, c] of map.entries()) {
    const id = String(billId || '')
    let g = byId.get(id)
    if (!g) {
      const b = bills.find(x => String(x.id) === id)
      if (b) {
        g = { billId: b.id, billDesc: b.description, billAmount: Number(b.amount || 0), paymentDay: b.paymentDay || '', rows: [] }
      }
    }
    if (g) {
      g.deadlineForMembers = c?.deadlineForMembers || g.deadlineForMembers || null
      result.push(g)
    }
  }
  result.sort((a,b)=> String(a.paymentDay||'').localeCompare(String(b.paymentDay||'')) || String(a.billId).localeCompare(String(b.billId)))
  return result
})

  const currentGroup = computed(() => {
  const arr = allocByBill.value || []
  if (!arr.length) return null
  // Try to focus on bill with last/active contribution
  for (const [_, c] of (contribByBill.value || new Map()).entries()) {
    const g = arr.find(x => String(x.billId) === String(c.billId))
    if (g) return g
  }
  return null
  })

  // Collapsible panels per bill
  const expandedBills = ref(new Set())
  function isExpanded(id){
    return expandedBills.value.has(String(id || ''))
  }
  function toggleBill(id){
    const key = String(id || '')
    const set = new Set(expandedBills.value)
    if (set.has(key)) set.delete(key); else set.add(key)
    expandedBills.value = set
  }
function formatMoney(n){
  const num = Number(n || 0)
  return new Intl.NumberFormat(undefined, { style:'currency', currency:'PEN' }).format(num)
}
function formatDate(iso){
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

function openHousehold(h){
  householdId.value = String(h?.id || '')
  if (householdId.value) {
    // Update URL with household ID
    router.push(`/dashboard/representative/contribution/${householdId.value}`)
    loadData()
  }
}

function backToHouseholds(){
  householdId.value = ''
  // reset local views
  allocRows.value = []
  memberTotals.value = []
  rows.value = [{ lastIncome: 0, myTotal: 0, compliance: 0, memberCount: 0, memberId: '' }]
  // Update URL to remove household ID
  router.push('/dashboard/representative/contribution')
  // reload premium list
  loadPremiumHouseholds()
}

onMounted(async () => {
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const u = JSON.parse(raw)
      // For PREMIUM: householdId comes from URL params only, not from localStorage
      // For FREE: householdId comes from localStorage (single household)
      if (u?.plan === 'FREE') {
        householdId.value = u?.householdId || ''
      } else {
        // PREMIUM: initialize empty, will be set by route param
        householdId.value = ''
      }
      plan.value = u?.plan || ''
      userId.value = u?.id
    }
  } catch {}
  
  // Check if householdId is passed as prop (from URL params)
  if (props.householdId) {
    householdId.value = String(props.householdId)
  }
  
  if (plan.value === 'FREE') await loadData()
  else await loadPremiumHouseholds()
})

// Watch for changes to householdId from URL params (for PREMIUM users)
watchEffect(() => {
  if (plan.value !== 'FREE' && householdId.value) {
    loadData()
  }
})

async function loadData(){
  // Validate householdId is set before loading
  if (!householdId.value) {
    console.warn('No household ID set')
    return
  }
  
  loading.value = true
  error.value = ''
  try{
    const [users, members, bills, memberContribs, contribs] = await Promise.all([
      HouseholdAPI.users(),
      HouseholdAPI.membersByHousehold(householdId.value),
      HouseholdAPI.billsByHousehold(householdId.value),
      HouseholdAPI.memberContributions(),
      HouseholdAPI.contributionsByHousehold(householdId.value)
    ])

    const u = Array.isArray(users) ? users : []
    const m = Array.isArray(members) ? members : []
    const b = Array.isArray(bills) ? bills : []
    billsRef.value = b
    membersRef.value = m

    monthlyTotal.value = b.reduce((s,x)=> s + Number(x?.amount || 0), 0)

    if (Array.isArray(contribs) && contribs.length) {
      const sorted = [...contribs].sort((a,b)=> String(a.updatedAt||a.createdAt||'').localeCompare(String(b.updatedAt||b.createdAt||'')))
      activeContributionId.value = sorted.at(-1)?.id || ''
      const mapp = new Map()
      for (const c of contribs) {
        const k = String(c.billId || '')
        const prev = mapp.get(k)
        const prevT = prev ? Date.parse(prev.updatedAt || prev.createdAt || 0) : -Infinity
        const curT = Date.parse(c.updatedAt || c.createdAt || 0)
        if (!prev || curT >= prevT) mapp.set(k, c)
      }
      contribByBill.value = mapp
    } else {
      activeContributionId.value = ''
      contribByBill.value = new Map()
    }

    const rep = JSON.parse(localStorage.getItem('user') || '{}')
    const repMember = m.find(mm => String(mm.userId) === String(rep?.id)) || null

    const myList = repMember ? (Array.isArray(memberContribs)?memberContribs:[]).filter(mc => String(mc.memberId) === String(repMember.id) && Number(mc.status || 0) === 1) : []
    const myTotal = myList.reduce((a,mc)=> a + Number(mc.amount || 0), 0)
    const lastIncome = Number(repMember?.income || 0)

    const memberCount = m.length
    const compliance = monthlyTotal.value > 0 ? Number(((myTotal / monthlyTotal.value) * 100).toFixed(2)) : 0
    rows.value = [{ lastIncome, myTotal, compliance, memberCount, memberId: repMember?.id || '' }]

    await recalcAllocTable({ users: u, members: m, bills: b, memberContribs })
  }catch(e){
    console.error(e)
    error.value = e?.message || t('representativeContributions.messages.loadError')
  } finally { loading.value = false }
}

function openEdit(row){ editingRow.value = row; editAmount.value = 0; editVisible.value = true }

async function saveIncome(){
  const row = editingRow.value;
  const amount = Number(editAmount.value || 0);
  error.value = '';
  success.value = '';
  try{
    if(amount <= 0) throw new Error(t('representativeContributions.errors.amountGreaterThanZero'));
    if(!row?.memberId){
      const rep = JSON.parse(localStorage.getItem('user') || '{}');
      if(!rep?.id || !householdId.value) throw new Error(t('representativeContributions.errors.invalidUserHousehold'));
      const now = new Date().toISOString();
      const payload = { id: `HM-${Date.now()}`, userId: String(rep.id), householdId: householdId.value, income: amount.toFixed(2), joinedAt: now, createdAt: now, updatedAt: now };
      const created = await http.post('/household_member', payload);
      row.memberId = (created?.data?.id) || payload.id;
    } else {
      await http.put(`/household_member/${row.memberId}`, { income: amount.toFixed(2) });
    }
    success.value = t('representativeContributions.messages.incomeUpdated');
    editVisible.value = false;
    await loadData();
  } catch(e){
    console.error(e);
    error.value = e?.message || t('representativeContributions.messages.incomeUpdateError');
  }
}
// Crear contribuciÃ³n para un bill
const createContribVisible = ref(false)
const currentBill = ref(null)
const contribDesc = ref('')
const contribDeadline = ref(null)
const selectedBillId = ref('')
const billOptions = computed(() => (billsRef.value || []).map(b => ({ label: `${b.id} - ${b.description}`, value: String(b.id) })))

function openCreateContribution(group){
  currentBill.value = group || {}
  contribDesc.value = ''
  selectedBillId.value = ''
  contribDeadline.value = null
  createContribVisible.value = true
}

async function createContribution(){
  try{
    const billId = String(selectedBillId.value || '')
    if(!billId) throw new Error(t('representativeContributions.errors.billNotSelected'))
    if(!householdId.value) throw new Error(t('representativeContributions.errors.invalidHousehold'))
    
    // Get the bill to validate paymentDay
    const bill = billsRef.value.find(b => String(b.id) === billId)
    if(!bill) throw new Error(t('representativeContributions.errors.billNotFound'))
    
    // Validate deadlineForMembers is not after paymentDay
    if(contribDeadline.value && bill.paymentDay) {
      const deadline = new Date(contribDeadline.value)
      const paymentDay = new Date(bill.paymentDay)
      if(deadline > paymentDay) {
        throw new Error(t('representativeContributions.errors.deadlineAfterPayment'))
      }
    }
    
    const payload = {
      billId,
      householdId: householdId.value,
      description: String(contribDesc.value || currentBill.value.billDesc || ''),
      deadlineForMembers: contribDeadline.value ? new Date(contribDeadline.value).toISOString() : null,
      strategy: 1
    }
    const contribResp = await http.post('/contribution', payload)
    const createdContribution = contribResp?.data || {}
    const contributionId = createdContribution?.id || createdContribution?.Id || null
    if (!contributionId) throw new Error(t('representativeContributions.messages.contributionCreateError'))

    // Crear member_contribution para cada miembro del household
    const members = Array.isArray(membersRef.value) ? membersRef.value : []
    const totalIncome = members.reduce((sum, m) => sum + Number(m?.income || 0), 0)
    const billAmount = Number(bill?.amount || 0)

    const mcPayloads = members.map(m => {
      const income = Number(m?.income || 0)
      const percent = totalIncome > 0 ? (income / totalIncome) : 0
      const assigned = billAmount * percent
      return {
        memberId: m.id,
        contributionId: contributionId,
        amount: Number(assigned.toFixed(2))
      }
    })

    // Ejecutar en paralelo pero no bloquear si alguno falla individualmente
    await Promise.all(mcPayloads.map(p => http.post('/member_contribution', p)))

    success.value = t('representativeContributions.messages.contributionCreated')
    createContribVisible.value = false
    await loadData()
  }catch(e){
    console.error(e)
    error.value = e?.message || t('representativeContributions.messages.contributionCreateError')
  }
}
// Recalculate proportional allocation table (informational only)
// - Assigns each bill proportionally to each member's income
// - Fills `allocRows` and `memberTotals`
async function recalcAllocTable({ users = [], members = [], bills = [], memberContribs = [] } = {}) {
  try {
    const userById = new Map((users || []).map(u => [String(u.id), u]))
    const ms = Array.isArray(members) ? members : []
    const bs = Array.isArray(bills) ? bills : []

    // Total household income (for proportions)
    const totalIncome = ms.reduce((sum, m) => sum + Number(m?.income || 0), 0)

    const rows = []
    const totalsMap = new Map() // memberId -> total assigned

    // Only include bills that currently have a contribution created
    const contributedIds = new Set(Array.from((contribByBill.value || new Map()).keys()).map(String))

    // Build reverse map: contributionId -> billId (for latest contributions per bill)
    const reverseContrib = new Map()
    for (const [bId, c] of (contribByBill.value || new Map()).entries()) {
      if (c?.id) reverseContrib.set(String(c.id), String(bId))
    }
    // Current statuses coming from memberContributions
    const statusMap = new Map()
    const mcList = Array.isArray(memberContribs) ? memberContribs : []
    for (const mc of mcList) {
      const cid = String(mc.contributionId || '')
      const bId = reverseContrib.get(cid)
      if (!bId) continue
      const key = `${bId}::${String(mc.memberId)}`
      statusMap.set(key, { id: mc.id, status: Number(mc.status || 0), amount: Number(mc.amount || 0), payedAt: mc.payedAt || null, contributionId: cid })
    }

    for (const bill of bs) {
      if (!contributedIds.has(String(bill?.id || ''))) continue
      const amount = Number(bill?.amount || 0)
      if (!amount || totalIncome <= 0) continue

      for (const m of ms) {
        const income = Number(m?.income || 0)
        const percent = totalIncome > 0 ? (income / totalIncome) : 0
        const assigned = amount * percent

        const u = userById.get(String(m.userId)) || {}
        const sKey = `${String(bill?.id || '')}::${String(m?.id || '')}`
        const sObj = statusMap.get(sKey)
        rows.push({
          billId: bill?.id || '',
          billDesc: bill?.description || '',
          billAmount: amount,
          memberId: m?.id || '',
          memberName: u?.name || u?.username || String(m?.id || ''),
          incomeBefore: income,
          percent: Number((percent * 100).toFixed(2)),
          assigned: Number(assigned.toFixed(2)),
          paymentDay: bill?.paymentDay || '',
          status: Number(sObj?.status || 0),
          memberContributionId: sObj?.id || '',
          contributionId: (contribByBill.value.get(String(bill?.id || ''))?.id) || ''
        })

        const key = String(m?.id || '')
        totalsMap.set(key, Number((totalsMap.get(key) || 0) + assigned))
      }
    }

    // Totals per member
    const totals = []
    for (const m of ms) {
      const u = userById.get(String(m.userId)) || {}
      const total = Number((totalsMap.get(String(m.id)) || 0).toFixed(2))
      totals.push({ memberId: m.id, memberName: u?.name || u?.username || String(m.id || ''), total })
    }

    allocRows.value = rows
    statusByMemberAndBill.value = statusMap
    memberTotals.value = totals
  } catch (e) {
    console.error(e)
    error.value = e?.message || t('representativeContributions.messages.distributionError')
  }
}

async function loadPremiumHouseholds(){
  try{
    const raw = JSON.parse(localStorage.getItem('user') || '{}')
    const repId = raw?.id
    if(!repId) return
    const list = await HouseholdAPI.householdsByRepresentative(repId)
    households.value = Array.isArray(list) ? list : []
    await loadUserIncome(repId)
  }catch(e){ console.error(e) }
}

async function loadUserIncome(repId){
  try{
    // Asegurar que tenemos households cargados
    if (!households.value || households.value.length === 0) {
      const list = await HouseholdAPI.householdsByRepresentative(repId)
      households.value = Array.isArray(list) ? list : []
    }

    // Obtener ingreso del usuario; si no existe, usar 0 sin romper el flujo
    try {
      const userIncome = await http.get(`/user-income/byUserId/${repId}`)
      const ui = Array.isArray(userIncome.data) ? userIncome.data[0] : userIncome.data
      userTotalIncome.value = Number(ui?.income || 0)
    } catch (err) {
      // 404 = aún no tiene registro de ingresos
      if (err?.response?.status === 404) {
        userTotalIncome.value = 0
      } else {
        throw err
      }
    }
    
    // Get allocations from incomeAllocation table
    let allocs = []
    try {
      const allocations = await http.get(`/income_allocation/byuserid/${repId}`)
      allocs = Array.isArray(allocations.data) ? allocations.data : []
    } catch (err) {
      if (err?.response?.status !== 404) throw err
      allocs = []
    }
    
    // If no allocations exist, create them from householdMember or from households
    if (allocs.length === 0) {
      // Get householdMember records for this user
      let hmList = []
      try {
        const hmResponse = await http.get(`/household_member/user/${repId}`)
        hmList = Array.isArray(hmResponse.data) ? hmResponse.data : (hmResponse.data ? [hmResponse.data] : [])
      } catch (err) {
        if (err?.response?.status !== 404) throw err
        hmList = []
      }
      
      if (hmList.length > 0) {
        // Build allocation array with household names
      incomeAllocations.value = hmList.map(hm => {
          const household = households.value.find(h => h.id === hm.householdId)
          // Calculate percentage from stored income
          const percentage = userTotalIncome.value > 0 ? (Number(hm.income || 0) / userTotalIncome.value * 100) : 0
          return {
            id: hm?.allocationId || null,
            householdId: hm.householdId,
            householdName: household?.name || hm.householdId,
            percentage: Number(percentage.toFixed(2))
          }
        })
      } else {
        // Create empty allocations for all households
        incomeAllocations.value = households.value.map((h, idx) => {
          const percentage = households.value.length > 0 ? (100 / households.value.length) : 0
          return {
            id: null,
            householdId: h.id,
            householdName: h.name,
            percentage: idx === 0 ? (100 - (percentage * (households.value.length - 1))) : percentage
          }
        })
      }
    } else {
      // Build allocation array with household names
      incomeAllocations.value = allocs.map(a => {
        const household = households.value.find(h => h.id === a.householdId)
        return {
          id: a.id,
          householdId: a.householdId,
          householdName: household?.name || a.householdId,
          percentage: a.percentage
        }
      })
    }
  }catch(e){
    console.error(e)
  }
}

function openEditUserIncome(){
  userIncomeVisible.value = true
}

async function saveUserIncome(){
  error.value = ''
  success.value = ''
  try{
    if(userTotalIncome.value <= 0) throw new Error(t('representativeContributions.errors.amountGreaterThanZero'))
    
    // Validate percentages sum to 100
    const totalPercentage = incomeAllocations.value.reduce((sum, a) => sum + Number(a.percentage || 0), 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(t('representativeContributions.errors.percentSum', { current: totalPercentage.toFixed(2) }))
    }
    
    const now = new Date().toISOString()
    
    // Save or update user income
    let existingIncomeId = null
    try {
      const uiResp = await http.get(`/user-income/byUserId/${userId.value}`)
      const ui = Array.isArray(uiResp.data) ? uiResp.data[0] : uiResp.data
      existingIncomeId = ui?.id || null
    } catch (err) {
      if (err?.response?.status !== 404) throw err
      existingIncomeId = null
    }

    if (existingIncomeId) {
      const userIncomeData = {
        id: existingIncomeId,
        income: userTotalIncome.value.toFixed(2),
        updatedAt: now
      }
      await http.put(`/user-income/byId/${existingIncomeId}`, userIncomeData)
    } else {
      const userIncomeData = {
        id: `UI-${Date.now()}`,
        userId: userId.value,
        income: userTotalIncome.value.toFixed(2),
        createdAt: now,
        updatedAt: now
      }
      await http.post('/user-income', userIncomeData)
    }
    
    // Update householdMember records with calculated income (total income * percentage)
    for (const alloc of incomeAllocations.value) {
      const calculatedIncome = (userTotalIncome.value * Number(alloc.percentage || 0) / 100).toFixed(2)
      
      // Find existing householdMember for this user and household
      let memberList = []
      try {
        const existingMember = await http.get(`/household_member/user/${userId.value}`)
        const list = Array.isArray(existingMember.data) ? existingMember.data : (existingMember.data ? [existingMember.data] : [])
        memberList = list.filter(m => String(m.householdId) === String(alloc.householdId))
      } catch (err) {
        if (err?.response?.status !== 404) throw err
        memberList = []
      }
      
      if (memberList.length > 0) {
        // Update existing householdMember
        const memberId = memberList[0].id
        await http.put(`/household_member/${memberId}`, {
            income: calculatedIncome,
            updatedAt: now
          })
      } else {
        // Create new householdMember if doesn't exist
        const newMember = {
          id: `HM-${Date.now()}`,
          userId: userId.value,
          householdId: alloc.householdId,
          income: calculatedIncome,
          joinedAt: now,
          createdAt: now,
          updatedAt: now
        }
        await http.post('/household_member', newMember)
      }
      
      // Save allocation for reference
      const allocData = {
        id: alloc.id,
        userId: userId.value,
        householdId: alloc.householdId,
        percentage: Number(alloc.percentage || 0)
      }
      
      if (allocData.id) {
        await http.put(`/income_allocation/byid/${encodeURIComponent(allocData.id)}`, allocData)
      } else {
        const created = await http.post('/income_allocation', {
          userId: allocData.userId,
          householdId: allocData.householdId,
          percentage: allocData.percentage
        })
        alloc.id = created?.data?.id || alloc.id
      }
    }
    
    success.value = t('representativeContributions.messages.incomeAllocUpdated')
    userIncomeVisible.value = false
    await loadUserIncome(userId.value)
  }catch(e){
    console.error(e)
    error.value = e?.message || t('representativeContributions.messages.incomeUpdateError')
  }
}

async function toggleMemberStatus(row){
  try{
    if(!row?.memberId || !row?.billId) return
    // Need contribution id for this bill
    const c = contribByBill.value.get(String(row.billId))
    if(!c?.id) throw new Error(t('representativeContributions.errors.noContribution'))
    const key = `${String(row.billId)}::${String(row.memberId)}`
    const current = statusByMemberAndBill.value.get(key)
    if(current?.id){
      await http.delete(`/member_contribution/${current.id}`)
      statusByMemberAndBill.value.delete(key)
      row.status = 0
      await loadData()
    } else {
      // Crear member_contribution pendiente con el monto asignado
      const payload = {
        contributionId: c.id,
        memberId: row.memberId,
        amount: Number(row.assigned || 0).toFixed(2)
      }
      const mcResp = await http.post('/member_contribution', payload)
      const mcData = mcResp?.data || {}
      statusByMemberAndBill.value.set(key, {
        id: mcData.id || '',
        status: mcData.status ?? 0,
        amount: Number(mcData.amount ?? payload.amount),
        payedAt: mcData.payedAt || null,
        contributionId: payload.contributionId
      })
      row.status = mcData.status ?? 0
      await loadData()
    }
  }catch(e){
    console.error(e)
    error.value = e?.message || t('representativeContributions.messages.statusUpdateError')
  }
}

</script>

<template>
  <div class="contrib-home">
    <Toolbar class="mb-3">
      <template #start>
        <div class="flex align-items-center gap-2">
          <h2 class="m-0">{{ t('representativeContributions.title') }}</h2>
          <Tag severity="info" :value="householdId || '-'" />
        </div>
      </template>
    </Toolbar>

    <!-- PREMIUM: households selector cards when no household chosen -->
    <template v-if="plan !== 'FREE' && !householdId">
      <div class="premium-houses">
        <div class="flex justify-content-between align-items-center mb-3">
          <h3 class="m-0">{{ t('representativeContributions.premium.yourHouseholds') }}</h3>
          <Button size="small" :label="t('representativeContributions.buttons.editIncome')" @click="openEditUserIncome" />
        </div>
        <div class="grid">
          <div v-for="h in households" :key="h.id" class="col-12">
            <div class="mock-card" @click="openHousehold(h)" role="button" tabindex="0">
              <div class="mock-left">
                <div class="mock-illus">
                  <img :src="houseImg" alt="House icon" class="mock-illus-img" />
                </div>
                <span class="dot d1"></span>
                <span class="dot d2"></span>
                <span class="dot d3"></span>
              </div>
              <div class="mock-content">
                <div class="mock-title">{{ h.name || t('representativeContributions.premium.card.fallbackName') }}</div>
                <div class="mock-desc">{{ h.description || t('representativeContributions.premium.card.noDescription') }}</div>
                <div class="mock-id">{{ t('representativeContributions.premium.card.idLabel') }}: {{ h.id }}</div>
              </div>
              <button type="button" class="mock-cta" :title="t('representativeContributions.premium.card.open')" :aria-label="t('representativeContributions.premium.card.open')" @click.stop="openHousehold(h)">
                <i class="pi pi-angle-right"></i>
              </button>
            </div>
          </div>
          <div v-if="!households.length" class="col-12"><Message :closable="false">{{ t('representativeContributions.premium.empty') }}</Message></div>
        </div>
      </div>
      
      <!-- Dialog to edit user income and allocations -->
      <Dialog v-model:visible="userIncomeVisible" modal :header="t('representativeContributions.premium.dialog.title')" :style="{ width: '40rem' }">
        <div class="flex flex-column gap-3">
          <div>
            <label class="block mb-2">{{ t('representativeContributions.premium.dialog.totalIncome') }}</label>
            <InputNumber v-model="userTotalIncome" mode="currency" currency="PEN" :min="0" :step="1" :useGrouping="true" class="w-full" />
          </div>
          
          <div>
            <label class="block mb-2">{{ t('representativeContributions.premium.dialog.allocateLabel') }}</label>
            <DataTable :value="incomeAllocations" class="p-datatable-sm">
              <Column field="householdName" :header="t('representativeContributions.premium.dialog.columns.household')" />
              <Column field="percentage" :header="t('representativeContributions.premium.dialog.columns.percentage')">
                <template #body="{ data }">
                  <InputNumber v-model="data.percentage" :min="0" :max="100" :step="0.1" suffix=" %" />
                </template>
              </Column>
            </DataTable>
            <div class="mt-2 text-sm">
              <span :style="{ color: Math.abs((incomeAllocations.reduce((sum, a) => sum + Number(a.percentage || 0), 0)) - 100) < 0.01 ? '#22c55e' : '#ef4444' }">
                {{ t('representativeContributions.premium.dialog.totalLabel') }} {{ (incomeAllocations.reduce((sum, a) => sum + Number(a.percentage || 0), 0)).toFixed(2) }}%
              </span>
            </div>
          </div>
          
          <div class="flex justify-content-end gap-2">
            <Button :label="t('representativeContributions.buttons.cancel')" severity="secondary" @click="userIncomeVisible = false" />
            <Button :label="t('representativeContributions.buttons.save')" @click="saveUserIncome" />
          </div>
        </div>
      </Dialog>
    </template>

    <!-- Contributions content: for FREE or when a PREMIUM household is selected -->
    <template v-else>
      <!-- Back to households for PREMIUM -->
      <div v-if="plan !== 'FREE'" class="mb-2">
        <Button size="small" icon="pi pi-arrow-left" :label="t('representativeContributions.buttons.backToHouseholds')" outlined @click="backToHouseholds" />
      </div>
      <!-- Resumen: tarjetas en lugar de tabla -->
      <div class="flex justify-content-end mb-2">
        <Button size="small" :label="t('representativeContributions.buttons.editIncome')" @click="openEdit(rows[0])" />
      </div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-title"><i class="pi pi-dollar mr-2"></i>{{ t('representativeContributions.metrics.income') }}</div>
          <div class="metric-value">{{ formatMoney(rows[0]?.lastIncome || 0) }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title"><i class="pi pi-percentage mr-2"></i>{{ t('representativeContributions.metrics.compliance') }}</div>
          <div class="metric-value">{{ (rows[0]?.compliance || 0) + '%' }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title"><i class="pi pi-money-bill mr-2"></i>{{ t('representativeContributions.metrics.myTotal') }}</div>
          <div class="metric-value">{{ formatMoney(rows[0]?.myTotal || 0) }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title"><i class="pi pi-users mr-2"></i>{{ t('representativeContributions.metrics.members') }}</div>
          <div class="metric-value">{{ rows[0]?.memberCount || 0 }}</div>
        </div>
      </div>
      <Message v-if="success" severity="success" class="mt-2" :closable="false">{{ success }}</Message>
      <Message v-if="error" severity="error" class="mt-2" :closable="false">{{ error }}</Message>

      <Dialog v-model:visible="editVisible" modal :header="t('representativeContributions.simpleDialog.title')" :style="{ width: '30rem' }">
        <div class="flex flex-column gap-3">
          <div>
            <label class="block mb-2">{{ t('representativeContributions.simpleDialog.amount') }}</label>
            <InputNumber v-model="editAmount" mode="currency" currency="PEN" :min="0" :step="1" :useGrouping="true" class="w-full" />
          </div>
          <div class="flex justify-content-end gap-2">
            <Button :label="t('representativeContributions.buttons.cancel')" severity="secondary" @click="editVisible = false" />
            <Button :label="t('representativeContributions.buttons.save')" @click="saveIncome" />
          </div>
        </div>
      </Dialog>

      <!-- Panels por cada bill con contribución -->
      <h3 class="mt-5">{{ t('representativeContributions.distribution.title') }}</h3>
      <div class="flex justify-content-end mb-2">
        <Button size="small" :label="t('representativeContributions.buttons.addContribution')" @click="openCreateContribution({})" />
      </div>
      <div class="bill-tabs-wrapper">
        <template v-if="(groupsWithContribution && groupsWithContribution.length)">
          <div v-for="g in groupsWithContribution" :key="g.billId" class="bill-panel">
            <div class="bill-header collapsible" @click="toggleBill(g.billId)" role="button" :aria-expanded="isExpanded(g.billId)">
              <div class="bill-title">{{ g.billDesc }}</div>
              <i :class="['pi', isExpanded(g.billId) ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
            </div>
            <div v-show="isExpanded(g.billId)" class="bill-content">
              <DataTable :value="g.rows" class="p-datatable-sm" :emptyMessage="t('representativeContributions.distribution.empty')">
                <Column field="memberName" :header="t('representativeContributions.distribution.columns.member')" />
                <Column field="incomeBefore" :header="t('representativeContributions.distribution.columns.income')">
                  <template #body="{ data }">{{ formatMoney(data.incomeBefore) }}</template>
                </Column>
                <Column field="percent" :header="t('representativeContributions.distribution.columns.percent')">
                  <template #body="{ data }">{{ data.percent }}%</template>
                </Column>
                <Column field="assigned" :header="t('representativeContributions.distribution.columns.assigned')">
                  <template #body="{ data }">{{ formatMoney(data.assigned) }}</template>
                </Column>
                <Column field="status" :header="t('representativeContributions.distribution.columns.status')">
                  <template #body="{ data }">
                    <Tag :severity="data.status ? 'success' : 'warning'" :value="data.status ? t('representativeContributions.status.completed') : t('representativeContributions.status.pending')" />
                  </template>
                </Column>
                <Column :header="t('representativeContributions.distribution.columns.actions')">
                  <template #body="{ data }">
                    <Button size="small" :label="data.status ? t('representativeContributions.buttons.markPending') : t('representativeContributions.buttons.markPaid')" :icon="data.status ? 'pi pi-undo' : 'pi pi-check'" @click="toggleMemberStatus(data)" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </template>
        <div v-else class="empty-panel">{{ t('representativeContributions.distribution.empty') }}</div>
      </div>
      <!-- Dialog crear contribuciÃ³n -->
      <Dialog v-model:visible="createContribVisible" modal :header="t('representativeContributions.createDialog.title')" :style="{ width: '36rem' }">
        <div class="flex flex-column gap-3">
          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
          <div>
            <label class="block mb-2">{{ t('representativeContributions.createDialog.selectBill') }}</label>
            <Dropdown class="w-full" v-model="selectedBillId" :options="billOptions" optionLabel="label" optionValue="value" :placeholder="t('representativeContributions.createDialog.billPlaceholder')" />
          </div>
          <div>
            <label class="block mb-2">{{ t('representativeContributions.createDialog.description') }}</label>
            <input class="p-inputtext p-component w-full" v-model="contribDesc" :placeholder="t('representativeContributions.createDialog.descriptionPlaceholder')" />
          </div>
          <div>
            <label class="block mb-2">{{ t('representativeContributions.createDialog.deadline') }}</label>
            <Calendar v-model="contribDeadline" showIcon :manualInput="true" :maxDate="currentBill?.paymentDay ? new Date(currentBill.paymentDay) : null" :pt="{ input: { class: 'w-full' } }" />
            <small class="text-xs text-color-secondary" v-if="currentBill?.paymentDay">
              {{ t('representativeContributions.createDialog.deadlineNote') }} {{ new Date(currentBill.paymentDay).toLocaleDateString() }}
            </small>
          </div>
          <div class="flex justify-content-end gap-2">
            <Button :label="t('representativeContributions.buttons.cancel')" severity="secondary" @click="createContribVisible = false" />
            <Button :label="t('representativeContributions.buttons.create')" @click="createContribution" />
          </div>
        </div>
      </Dialog>

      <h4 class="mt-3">{{ t('representativeContributions.memberTotals.title') }}</h4>
      <DataTable :value="memberTotals" class="p-datatable-sm" :emptyMessage="t('representativeContributions.memberTotals.empty')">
        <Column field="memberName" :header="t('representativeContributions.memberTotals.columns.member')" />
        <Column field="total" :header="t('representativeContributions.memberTotals.columns.total')">
          <template #body="{ data }">{{ formatMoney(data.total) }}</template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<style scoped>
.contrib-home { animation: fadeIn 0.5s ease-in-out; padding: 1rem; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* Resumen en tarjetas */
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin-bottom: .5rem; }
.metric-card { background: #fff; border: 1px solid rgba(15,23,42,.06); border-radius: 12px; box-shadow: 0 8px 24px rgba(15,23,42,.06); padding: 1rem 1.25rem; }
.metric-title { font-weight: 600; color: #111827; margin-bottom: .5rem; display:flex; align-items:center; gap:.5rem; }
.metric-value { font-size: 1.25rem; color: #0f172a; }

/* Tabs estilo "ventanas" */
.bill-tabs-wrapper { margin-top: .5rem; }
.bill-panel { padding: 1rem; background: #fff; border: 1px solid #9ec9ff; border-top-left-radius: 0; border-radius: 12px; }
.bill-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.bill-title { font-weight: 600; color: #1f2d3d; }
.bill-meta { display: flex; gap: 1rem; color: #475569; }

:deep(.bill-tabs .p-tabview-nav) { border: none; padding-left: .25rem; }
:deep(.bill-tabs .p-tabview-nav li .p-tabview-nav-link) {
  background: #e6f2ff; color: #1d4ed8; border: 1px solid #9ec9ff; border-bottom: none;
  border-top-left-radius: 12px; border-top-right-radius: 12px; padding: .35rem .75rem; margin-right: .35rem;
}
:deep(.bill-tabs .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  background: #ffffff; color: #0f172a; position: relative; top: 1px;
}
:deep(.bill-panel-container) { border: 1px solid #9ec9ff; border-radius: 12px; padding: 0; }

/* Panel vacÃ­o (mock) */
.empty-panel { display: flex; align-items: center; justify-content: center; min-height: 280px; }
/* Ocultar tabla y textos; dejar solo el botón */
.bill-title { display:none; }
.bill-meta span { display:none; }

@media (min-width:0){ .bill-header{ justify-content:flex-end; } }

.metric-title .pi { font-size: 1rem; line-height: 1; }
/* Align metric icons with text */
.metric-title { display:flex; align-items:center; gap:.5rem; }
.metric-title .pi { display:inline-flex; align-items:center; justify-content:center; width:1.125rem; height:1.125rem; font-size:1.125rem; line-height:1; vertical-align:middle; margin-right:.25rem; position:relative; top:0; }
.metric-title .pi::before { line-height:1; }:deep(.bill-tabs .p-tabview-nav){ display:none !important; height:0; padding:0; margin:0; }
.bill-panel{ border-top-left-radius:12px !important; }

/* Overrides to enable collapsible bills */
.bill-panel { padding: .5rem 0 1rem 0; background: transparent; border: none; }
.bill-header.collapsible { cursor: pointer; background: #fff; border: 1px solid rgba(15,23,42,.06); border-radius: 12px; padding: .75rem 1rem; }
.bill-title { display: block; }
.bill-meta span { display: inline; }
.bill-header { justify-content: space-between !important; }
.bill-header .pi { margin-left: auto; color: #111827; font-size: 0.875rem; }
.bill-content { padding-top: .5rem; }

/* Premium households grid */
.premium-houses .mock-card { position: relative; display:flex; align-items:center; gap:2rem; padding:2rem; border-radius:24px; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); border:1px solid rgba(15,23,42,.08); overflow:hidden; cursor:pointer; transition: all 0.3s ease; }
.premium-houses .mock-card:hover { transform: translateY(-2px); }
.premium-houses .mock-left { position: relative; width: 160px; height: 160px; display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
.premium-houses .mock-illus { width:140px; height:140px; background:linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%); border-radius:20px; display:flex; align-items:center; justify-content:center; }
.premium-houses .mock-illus-img { width:100px; height:100px; object-fit:contain; }
.premium-houses .dot { position:absolute; background:#ef4444; border-radius:999px; }
.premium-houses .dot.d1 { width:10px; height:10px; top:6px; left:10px; }
.premium-houses .dot.d2 { width:16px; height:16px; top:8px; right:12px; }
.premium-houses .dot.d3 { width:6px; height:6px; bottom:14px; left:28px; }
.premium-houses .mock-content { flex:1 1 auto; min-width:0; }
.premium-houses .mock-title { font-weight:800; color:#0f172a; font-size:1.375rem; line-height:1.3; }
.premium-houses .mock-desc { margin-top:.5rem; color:#6b7280; font-weight:500; font-size:1rem; }
.premium-houses .mock-id { margin-top:.5rem; color:#9ca3af; font-size:.875rem; font-weight:500; }
.premium-houses .mock-cta { position:absolute; right:20px; bottom:20px; display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:999px; background:#ef4444; color:#fff; border:none; cursor:pointer; transition: all .2s ease; font-size:1.25rem; }
.premium-houses .mock-cta:hover { transform: translateY(-3px); }
.premium-houses .mock-cta:active { transform: translateY(-1px); }

/* Income allocation dialog styles */
.text-sm { font-size: 0.875rem; }
:deep(.p-datatable-sm .p-datatable-thead > tr > th) { padding: 0.5rem; }
:deep(.p-datatable-sm .p-datatable-tbody > tr > td) { padding: 0.5rem; }
:deep(.p-inputnumber) { width: 100%; }
</style>










































