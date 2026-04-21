<script setup>
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

import { HouseholdAPI } from '@/household-member/infrastructure/household.api.js'
import http from '@/shared/services/http.instance.js'

const loading = ref(true)
const savingIncome = ref(false)
const incomeError = ref('')
const incomeSuccess = ref('')

const income = ref(0)
const originalIncome = ref(0)

const memberContributions = ref([])
const contributionDefs = ref([])
const bills = ref([])
const members = ref([])

const memberId = ref('')
const userInfo = ref(null)

const totals = computed(() => {
  const assigned = contributionRows.value.reduce((sum, row) => sum + row.assigned, 0)
  const paid = contributionRows.value
    .filter(row => row.status === 'Pagado')
    .reduce((sum, row) => sum + row.paidAmount, 0)
  return {
    assigned,
    paid,
    pending: Math.max(assigned - paid, 0)
  }
})

const contributionRows = computed(() => {
  if (!contributionDefs.value.length) return []
  const membersCount = members.value.length || 1
  const entries = memberContributions.value
  return contributionDefs.value.map(contribution => {
    const bill = bills.value.find(b => String(b.id) === String(contribution.billId)) || {}
    const entry = entries.find(e => String(e.contributionId) === String(contribution.id))
    const assigned = entry ? Number(entry.amount || 0) : Number(bill.amount || 0) / membersCount
    const status = entry?.status === 1 ? 'Pagado' : 'Pendiente'
    const paidAmount = entry?.status === 1 ? Number(entry.amount || 0) : 0
    return {
      id: contribution.id,
      bill: bill.description || 'Gasto pendiente',
      dueDate: contribution.deadlineForMembers,
      assigned: Number(assigned.toFixed(2)),
      status,
      paidAmount,
      lastPayment: entry?.payedAt || entry?.updatedAt || entry?.createdAt || ''
    }
  })
})

const historyRows = computed(() =>
  [...memberContributions.value]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .map(entry => {
      const contribution = contributionDefs.value.find(c => String(c.id) === String(entry.contributionId))
      const bill = bills.value.find(b => String(b.id) === String(contribution?.billId)) || {}
      return {
        id: entry.id,
        bill: bill.description || contribution?.description || 'ContribuciÃ³n',
        amount: Number(entry.amount || 0),
        status: entry.status === 1 ? 'Pagado' : 'Pendiente',
        payedAt: entry.payedAt,
        updatedAt: entry.updatedAt || entry.createdAt
      }
    })
)

const paidPercentage = computed(() => {
  if (!totals.value.assigned) return 0
  return Math.min(100, Math.round((totals.value.paid / totals.value.assigned) * 100))
})

const pendingPercentage = computed(() => 100 - paidPercentage.value)

onMounted(async () => {
  try {
    const stored = localStorage.getItem('user')
    if (!stored) throw new Error('Usuario no encontrado')

    const parsed = JSON.parse(stored)
    if (!parsed?.id || !parsed?.householdId) throw new Error('InformaciÃ³n de usuario incompleta')

    userInfo.value = parsed

    const [memberList, contribDefs, contribEntries, billsList] = await Promise.all([
      HouseholdAPI.membersByHousehold(parsed.householdId),
      HouseholdAPI.contributionsByHousehold(parsed.householdId),
      HouseholdAPI.memberContributions(),
      HouseholdAPI.billsByHousehold(parsed.householdId)
    ])

    members.value = memberList
    contributionDefs.value = contribDefs
    bills.value = billsList

    const member = memberList.find(m => String(m.userId) === String(parsed.id))
    memberId.value = member?.id || ''
    income.value = Number(member?.income || 0)
    originalIncome.value = income.value

    memberContributions.value = contribEntries.filter(entry => String(entry.memberId) === memberId.value)
  } catch (err) {
    incomeError.value = err?.message || 'No se pudo cargar la informaciÃ³n.'
  } finally {
    loading.value = false
  }
})

async function saveIncome() {
  if (!memberId.value) return
  incomeError.value = ''
  incomeSuccess.value = ''
  savingIncome.value = true
  try {
    await http.put(`/household_member/${memberId.value}`, {
      income: Number(income.value || 0).toFixed(2),
      updatedAt: new Date().toISOString()
    })
    originalIncome.value = income.value
    incomeSuccess.value = 'Ingreso actualizado correctamente.'
  } catch (err) {
    incomeError.value = err?.message || 'No se pudo actualizar el ingreso.'
  } finally {
    savingIncome.value = false
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0)
}

function formatDate(date) {
  if (!date) return 'â€”'
  try {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return date
  }
}
</script>

<template>
  <div class="member-contributions">
    <div class="grid gap-3">
      <div class="col-12 lg:col-4">
        <Card class="summary-card">
          <template #title>Ingreso mensual</template>
          <template #content>
            <p class="text-600 mb-3">
              Este dato solo es visible para ti y nos permite estimar metas personalizadas.
            </p>
            <div class="flex align-items-center gap-3">
              <InputNumber
                v-model="income"
                mode="currency"
                currency="PEN"
                locale="es-PE"
                class="w-full"
                :min="0"
              />
              <Button
                icon="pi pi-save"
                label="Guardar"
                :loading="savingIncome"
                :disabled="savingIncome || income === originalIncome"
                @click="saveIncome"
              />
            </div>
            <Message v-if="incomeSuccess" severity="success" class="mt-3" :closable="false">
              {{ incomeSuccess }}
            </Message>
            <Message v-if="incomeError" severity="error" class="mt-3" :closable="false">
              {{ incomeError }}
            </Message>
          </template>
        </Card>
      </div>

      <div class="col-12 lg:col-8">
        <Card class="summary-card">
          <template #title>Tus aportes</template>
          <template #content>
            <div class="flex flex-wrap gap-3 align-items-center justify-content-between">
              <div class="summary-pill bg-primary">
                <span>Total asignado</span>
                <strong>{{ formatCurrency(totals.assigned) }}</strong>
              </div>
              <div class="summary-pill bg-success">
                <span>Pagado</span>
                <strong>{{ formatCurrency(totals.paid) }}</strong>
              </div>
              <div class="summary-pill bg-warning">
                <span>Pendiente</span>
                <strong>{{ formatCurrency(totals.pending) }}</strong>
              </div>
            </div>
            <Divider />
            <div class="bars-wrapper">
              <div class="bar">
                <div class="bar-paid" :style="{ width: paidPercentage + '%' }"></div>
              </div>
              <div class="bar-legend">
                <span><i class="pi pi-check-circle text-success mr-2" />{{ paidPercentage }}% pagado</span>
                <span><i class="pi pi-clock text-warning mr-2" />{{ pendingPercentage }}% pendiente</span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <Card class="table-card">
      <template #title>Contribuciones registradas por tu representante</template>
      <template #content>
        <DataTable
          :value="contributionRows"
          :loading="loading"
          dataKey="id"
          size="small"
          :emptyMessage="'No tienes contribuciones asignadas aÃºn.'"
        >
          <Column field="bill" header="Gasto" />
          <Column header="Fecha lÃ­mite">
            <template #body="{ data }">
              {{ formatDate(data.dueDate) }}
            </template>
          </Column>
          <Column header="Monto asignado">
            <template #body="{ data }">
              <strong>{{ formatCurrency(data.assigned) }}</strong>
            </template>
          </Column>
          <Column header="Estado">
            <template #body="{ data }">
              <Tag :severity="data.status === 'Pagado' ? 'success' : 'warning'" :value="data.status" />
            </template>
          </Column>
          <Column header="Ãšltimo movimiento">
            <template #body="{ data }">
              {{ formatDate(data.lastPayment) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Card class="table-card">
      <template #title>Historial y pagos realizados</template>
      <template #content>
        <DataTable
          :value="historyRows"
          :loading="loading"
          dataKey="id"
          size="small"
          :rows="5"
          :paginator="historyRows.length > 5"
          :emptyMessage="'AÃºn no registras pagos propios.'"
        >
          <Column field="bill" header="Concepto" />
          <Column header="Monto">
            <template #body="{ data }">
              {{ formatCurrency(data.amount) }}
            </template>
          </Column>
          <Column header="Estado">
            <template #body="{ data }">
              <Tag :severity="data.status === 'Pagado' ? 'success' : 'info'" :value="data.status" />
            </template>
          </Column>
          <Column header="Fecha de registro">
            <template #body="{ data }">
              {{ formatDate(data.updatedAt) }}
            </template>
          </Column>
          <Column header="Pagado el">
            <template #body="{ data }">
              {{ formatDate(data.payedAt) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.member-contributions {
  padding: 0.5rem;
}

.summary-card {
  height: 100%;
}

.summary-pill {
  flex: 1;
  min-width: 140px;
  color: #fff;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

.summary-pill span {
  font-size: 0.85rem;
  opacity: 0.85;
}

.summary-pill strong {
  font-size: 1.2rem;
}

.bg-primary {
  background: linear-gradient(120deg, #6366f1, #4f46e5);
}

.bg-success {
  background: linear-gradient(120deg, #22c55e, #16a34a);
}

.bg-warning {
  background: linear-gradient(120deg, #f97316, #ea580c);
}

.bars-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.bar-paid {
  height: 100%;
  background: linear-gradient(120deg, #22c55e, #16a34a);
}

.bar-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #475569;
  font-size: 0.85rem;
}

.table-card {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .bar-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }

  .summary-pill {
    width: 100%;
  }
}
</style>


