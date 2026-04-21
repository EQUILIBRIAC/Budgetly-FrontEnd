<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Chart from 'primevue/chart'

import { loadMemberDashboardData } from '../services/member-dashboard.service.js'

const loading = ref(true)
const error = ref('')

const dashboardData = ref({
  items: [],
  categories: [],
  currency: 'PEN'
})

const dateRangeType = ref('current')
const customRange = ref(null)
const categoryFilter = ref('all')
const onlyOverdue = ref(false)
const onlyPending = ref(false)

const dateOptions = [
  { label: 'Mes actual', value: 'current' },
  { label: 'Últimos 3 meses', value: 'last3' },
  { label: 'Personalizado', value: 'custom' }
]

const today = computed(() => new Date())

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    if (!stored?.id || !stored?.householdId) throw new Error('No se encontró información del usuario.')

    const { items, categories, currency } = await loadMemberDashboardData(stored.householdId, stored.id)
    dashboardData.value = { items, categories, currency }
  } catch (err) {
    console.error(err)
    error.value = err?.message || 'No se pudo cargar tu tablero.'
  } finally {
    loading.value = false
  }
})

watch(dateRangeType, value => {
  if (value !== 'custom') customRange.value = null
})

const hasData = computed(() => filteredItems.value.length > 0)

const filteredItems = computed(() => {
  const items = dashboardData.value.items || []
  const now = new Date()
  const [start, end] = resolveDateRange()

  return items.filter(item => {
    const due = item.dueDate || item.createdAt || now
    if (start && due < start) return false
    if (end && due > end) return false
    if (categoryFilter.value !== 'all' && item.category !== categoryFilter.value) return false
    if (onlyOverdue.value && !item.isOverdue) return false
    if (onlyPending.value && item.status !== 'pending') return false
    return true
  })
})

function resolveDateRange () {
  const now = new Date()
  if (dateRangeType.value === 'current') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return [start, end]
  }
  if (dateRangeType.value === 'last3') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return [start, end]
  }
  if (dateRangeType.value === 'custom' && customRange.value?.length === 2) {
    const [startDate, endDate] = customRange.value
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59)
      return [start, end]
    }
  }
  return [null, null]
}

const currencyFormatter = value =>
  new Intl.NumberFormat(dashboardData.value.currency === 'USD' ? 'en-US' : 'es-PE', {
    style: 'currency',
    currency: dashboardData.value.currency || 'PEN'
  }).format(value || 0)

const currentMonthKey = computed(() => {
  const now = today.value
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const totalCurrentMonth = computed(() => {
  return dashboardData.value.items
    .filter(item => monthKey(item.dueDate || item.createdAt) === currentMonthKey.value)
    .reduce((sum, item) => sum + (item.amount || 0), 0)
})

const paidAmount = computed(() =>
  filteredItems.value.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
)
const pendingAmount = computed(() =>
  filteredItems.value.filter(item => item.status !== 'paid').reduce((sum, item) => sum + item.amount, 0)
)

const overdueCount = computed(() => filteredItems.value.filter(item => item.isOverdue).length)

const upcomingAmount = computed(() => {
  const now = today.value
  const limit = new Date(now)
  limit.setDate(limit.getDate() + 7)
  return dashboardData.value.items
    .filter(item => item.status !== 'paid' && item.dueDate && item.dueDate >= now && item.dueDate <= limit)
    .reduce((sum, item) => sum + item.amount, 0)
})

const barChartData = computed(() => {
  const grouped = new Map()
  filteredItems.value.forEach(item => {
    const key = item.category || 'Sin categoría'
    grouped.set(key, (grouped.get(key) || 0) + item.amount)
  })
  const labels = [...grouped.keys()]
  return {
    labels,
    datasets: [
      {
        label: 'Monto',
        backgroundColor: '#4f46e5',
        data: labels.map(label => Number(grouped.get(label).toFixed(2)))
      }
    ]
  }
})

const lineChartData = computed(() => {
  const now = today.value
  const labels = []
  const sums = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('es-PE', { month: 'short' })
    labels.push(label)
    const total = dashboardData.value.items
      .filter(item => monthKey(item.dueDate || item.createdAt) === key)
      .reduce((sum, item) => sum + item.amount, 0)
    sums.push(Number(total.toFixed(2)))
  }
  return {
    labels,
    datasets: [
      {
        label: 'Gastos',
        data: sums,
        fill: true,
        borderColor: '#16a34a',
        tension: 0.3,
        backgroundColor: 'rgba(22,163,74,0.2)'
      }
    ]
  }
})

const donutChartData = computed(() => {
  const grouped = new Map()
  filteredItems.value.forEach(item => {
    const key = item.category || 'Sin categoría'
    grouped.set(key, (grouped.get(key) || 0) + item.amount)
  })
  const labels = [...grouped.keys()]
  const colors = ['#4f46e5', '#f97316', '#22c55e', '#14b8a6', '#f43f5e', '#facc15']
  return {
    labels,
    datasets: [
      {
        data: labels.map(label => Number(grouped.get(label).toFixed(2))),
        backgroundColor: labels.map((_, idx) => colors[idx % colors.length])
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#475569'
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#475569' },
      grid: { color: 'rgba(148,163,184,0.2)' }
    },
    y: {
      ticks: { color: '#475569' },
      grid: { color: 'rgba(148,163,184,0.2)' }
    }
  }
}

function monthKey (date) {
  if (!date) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function statusTagSeverity (status) {
  if (status === 'paid') return 'success'
  return 'warning'
}
</script>

<template>
  <div class="dashboard-page">
    <div class="filters-card">
      <div class="filters">
        <div class="filter">
          <label>Rango de fechas</label>
          <Dropdown v-model="dateRangeType" :options="dateOptions" optionLabel="label" optionValue="value" />
        </div>

        <div class="filter" v-if="dateRangeType === 'custom'">
          <label>Rango personalizado</label>
          <Calendar v-model="customRange" selectionMode="range" dateFormat="dd/mm/yy" showIcon />
        </div>

        <div class="filter">
          <label>Categoría</label>
          <Dropdown
            v-model="categoryFilter"
            :options="[{ label: 'Todas', value: 'all' }, ...dashboardData.categories.map(c => ({ label: c, value: c }))]"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div class="filter check">
          <Checkbox v-model="onlyOverdue" binary />
          <span>Solo vencidos</span>
        </div>

        <div class="filter check">
          <Checkbox v-model="onlyPending" binary />
          <span>Solo pendientes</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-grid">
      <Skeleton width="100%" height="120px" />
      <Skeleton width="100%" height="320px" />
      <Skeleton width="100%" height="320px" />
    </div>

    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

    <template v-else>
      <div class="cards-grid">
        <Card>
          <template #title>Total del mes actual</template>
          <template #content>
            <p class="kpi-value">{{ currencyFormatter(totalCurrentMonth) }}</p>
            <small>Basado en tus contribuciones del mes</small>
          </template>
        </Card>
        <Card>
          <template #title>Pagado vs pendiente</template>
          <template #content>
            <p class="kpi-value">{{ currencyFormatter(paidAmount) }} <span>pagado</span></p>
            <p class="muted">Pendiente: {{ currencyFormatter(pendingAmount) }}</p>
          </template>
        </Card>
        <Card>
          <template #title>Bills vencidos</template>
          <template #content>
            <p class="kpi-value">{{ overdueCount }}</p>
            <small>Contribuciones con fecha vencida</small>
          </template>
        </Card>
        <Card>
          <template #title>Próximos 7 días</template>
          <template #content>
            <p class="kpi-value">{{ currencyFormatter(upcomingAmount) }}</p>
            <small>Monto pendiente a corto plazo</small>
          </template>
        </Card>
      </div>

      <div class="charts-grid">
        <Card class="chart-card">
          <template #title>Gastos por categoría</template>
          <template #content>
            <div class="chart-wrapper">
              <Chart type="bar" :data="barChartData" :options="chartOptions" />
            </div>
          </template>
        </Card>

        <Card class="chart-card">
          <template #title>Evolución mensual</template>
          <template #content>
            <div class="chart-wrapper">
              <Chart type="line" :data="lineChartData" :options="chartOptions" />
            </div>
          </template>
        </Card>

        <Card class="chart-card">
          <template #title>Distribución por categoría</template>
          <template #content>
            <div class="chart-wrapper">
              <Chart type="doughnut" :data="donutChartData" :options="{ plugins: { legend: { position: 'bottom' } } }" />
            </div>
          </template>
        </Card>
      </div>

      <Card class="table-card">
        <template #title>Resumen de tus contribuciones</template>
        <template #content>
          <Message v-if="!hasData" severity="info" :closable="false">
            No hay datos para los filtros seleccionados.
          </Message>
          <DataTable
            v-else
            :value="filteredItems"
            :rows="5"
            :paginator="filteredItems.length > 5"
            responsiveLayout="stack"
          >
            <Column field="description" header="Descripción" />
            <Column field="category" header="Categoría" />
            <Column header="Monto">
              <template #body="{ data }">
                {{ currencyFormatter(data.amount) }}
              </template>
            </Column>
            <Column header="Fecha límite">
              <template #body="{ data }">
                {{ data.dueDate ? data.dueDate.toLocaleDateString('es-PE') : '—' }}
              </template>
            </Column>
            <Column header="Estado">
              <template #body="{ data }">
                <Tag :value="data.status === 'paid' ? 'Pagado' : 'Pendiente'" :severity="statusTagSeverity(data.status)" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: center;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475569;
}

.filter.check {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.muted {
  color: #94a3b8;
  margin-top: 0.2rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.chart-card {
  min-height: 320px;
}

.chart-wrapper {
  height: 260px;
}

.table-card {
  margin-top: 0.5rem;
}

.loading-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 768px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
