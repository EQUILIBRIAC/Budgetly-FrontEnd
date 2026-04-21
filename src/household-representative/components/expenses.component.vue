<script setup lang="js">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Calendar from "primevue/calendar";
import Tag from "primevue/tag";
import Message from "primevue/message";
import Toolbar from "primevue/toolbar";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";

import { BillService } from "@/bills-expenses/infrastucture/bills.service.js";
import {UserService} from "@/IAM/infrastructure/user.service.js";

const { t } = useI18n();
const route = useRoute();
const confirm = useConfirm();

const householdId = ref(route.query.householdId || route.params.householdId || "");
const currentUserId = ref(0);
const loading = ref(false);
const error = ref("");
const success = ref("");
const bills = ref([]);

const showDialog = ref(false);
const dialogMode = ref("create"); // 'create' | 'edit'

const blankForm = {
  id: "",
  householdId: "",
  description: "",
  amount: 0,                 // number in the form
  paymentDay: new Date(),
  createdAt: "",
  updatedAt: "",
};
const form = ref({ ...blankForm });
const isEdit = computed(() => dialogMode.value === "edit");
const dialogTitle = computed(() =>
  isEdit.value
    ? t("representativeExpenses.dialog.editTitle")
    : t("representativeExpenses.dialog.createTitle")
);
const primaryButtonLabel = computed(() =>
  isEdit.value
    ? t("representativeExpenses.dialog.buttons.save")
    : t("representativeExpenses.dialog.buttons.create")
);

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function formatMoney(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PEN", currencyDisplay: "symbol" }).format(num);
}

async function load() {
  const AuxUser = localStorage.getItem("user");
  const parsedUser = AuxUser ? JSON.parse(AuxUser) : null;
  const HouseHoldId = parsedUser?.householdId;
  currentUserId.value = Number(parsedUser?.id || 0);
  if (!HouseHoldId) {
    error.value = t("representativeExpenses.messages.noHousehold");
    return;
  }

  householdId.value = HouseHoldId;

  loading.value = true;
  error.value = "";
  success.value = "";
  try {
    const list = await BillService.listByHouseholdId(HouseHoldId);
    bills.value = list;
  } catch (e) {
    console.error(e);
    error.value = e?.message || t("representativeExpenses.messages.loadError");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialogMode.value = "create";
  form.value = {
    ...blankForm,
    householdId: householdId.value,
    paymentDay: new Date(),
  };
  showDialog.value = true;
}

function openEdit(row) {
  dialogMode.value = "edit";
  form.value = {
    ...row,
    amount: Number(row.amount || 0), // ensure numeric for InputNumber
    //Convert to Date in case backend brings it back as ISO
    paymentDay: row.paymentDay ? new Date(row.paymentDay) : new Date(),
  };
  showDialog.value = true;
}

async function save() {
  error.value = "";
  success.value = "";
  try {
    const payload = {
      ...form.value,
      householdId: form.value.householdId || householdId.value,
      createdBy: Number(currentUserId.value || 0),
      // backend expects string "100.00"
      amount: Number(form.value.amount || 0).toFixed(2),
      // backend expects ISO string
      paymentDay: form.value.paymentDay
          ? new Date(form.value.paymentDay).toISOString()
          : null,
    };

    if (isEdit.value && form.value.id) {
      const updated = await BillService.updateBill(form.value.id, payload);
      bills.value = bills.value.map(b => (b.id === updated.id ? updated : b));
      success.value = t("representativeExpenses.messages.updated");
    } else {
      const created = await BillService.createBill(payload);
      bills.value = [created, ...bills.value];
      success.value = t("representativeExpenses.messages.created");
    }
    showDialog.value = false;
  } catch (e) {
    console.error(e);
    error.value = typeof e?.message === "string" ? e.message : t("representativeExpenses.messages.saveError");
  }
}

function confirmDelete(row) {
  confirm.require({
    message: t("representativeExpenses.confirm.message", { id: row.id }),
    header: t("representativeExpenses.confirm.header"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("representativeExpenses.confirm.accept"),
    rejectLabel: t("representativeExpenses.confirm.reject"),
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await BillService.deleteBill(row.id);
        bills.value = bills.value.filter((b) => b.id !== row.id);
        success.value = t("representativeExpenses.messages.deleted");
      } catch (e) {
        console.error(e);
        error.value = e?.message || t("representativeExpenses.messages.deleteError");
      }
    },
  });
}

onMounted( async () => {
  await load();
});
</script>

<template>
  <div class="bills-home">
    <Toolbar :pt="{root:{ class:'welcome-card border-round mb-3'}}">
      <template #start>
        <div class="flex align-items-center gap-2">
          <h2 class="m-0" style="color: black !important;">{{ t('representativeExpenses.title') }}</h2>
        </div>
      </template>
      <template #end>
        <Button :label="t('representativeExpenses.addButton')" icon="pi pi-plus" @click="openCreate" />
      </template>
    </Toolbar>

    <Card :pt="{root:{ class:'welcome-card border-round mb-3'}}">
      <template #content>
        <DataTable
            :value="bills"
            dataKey="id"
            :loading="loading"
            responsiveLayout="scroll"
            class="p-datatable-sm custom-table"
            :emptyMessage="t('representativeExpenses.table.empty')"
        >
          <Column field="id" :header="t('representativeExpenses.table.columns.id')" sortable />
          <Column field="description" :header="t('representativeExpenses.table.columns.description')" sortable />
          <Column :header="t('representativeExpenses.table.columns.amount')" sortable>
            <template #body="{ data }">
              <span>{{ formatMoney(data.amount) }}</span>
            </template>
          </Column>
          <Column :header="t('representativeExpenses.table.columns.paymentDay')" sortable>
            <template #body="{ data }">
              <span>{{ formatDate(data.paymentDay) }}</span>
            </template>
          </Column>
          <Column :header="t('representativeExpenses.table.columns.created')" sortable>
            <template #body="{ data }">
              <span>{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>
          <Column :header="t('representativeExpenses.table.columns.updated')" sortable>
            <template #body="{ data }">
              <span>{{ formatDate(data.updatedAt) }}</span>
            </template>
          </Column>
        </DataTable>

        <div class="mt-3">
          <Message v-if="success" severity="success" :closable="false">{{ success }}</Message>
          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="showDialog" modal :header="dialogTitle" :style="{ width: '520px' }">
      <div class="field mb-3">
        <label class="block mb-2">{{ t('representativeExpenses.dialog.fields.description') }}</label>
        <InputText
          v-model="form.description"
          :placeholder="t('representativeExpenses.dialog.placeholders.description')"
        />
      </div>

      <div class="field mb-3">
        <label class="block mb-2">{{ t('representativeExpenses.dialog.fields.amount') }}</label>
        <InputNumber
            v-model="form.amount"
            mode="currency"
            currency="PEN"
            :min="0"
            :step="1"
            :useGrouping="true"
            inputId="amount"
        />
      </div>

      

      <div class="field mb-3">
        <label class="block mb-2">{{ t('representativeExpenses.dialog.fields.paymentDay') }}</label>
        <Calendar
            v-model="form.paymentDay"
            showIcon
            :manualInput="true"
            :pt="{ input: { class: 'w-full' } }"
        />
        <small class="text-600">
          {{ t('representativeExpenses.dialog.currentLabel') }}
          {{ form.paymentDay ? new Date(form.paymentDay).toISOString() : '' }}</small>
      </div>

      <div class="flex justify-content-end gap-2 mt-4">
        <Button
          :label="t('representativeExpenses.dialog.buttons.cancel')"
          severity="secondary"
          outlined
          @click="showDialog = false"
        />
        <Button :label="primaryButtonLabel" @click="save" />
      </div>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
::v-deep(.custom-table .p-datatable-thead > tr > th) {
  background-color: white;
  color: black;

}

.welcome-card {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  padding: 1.25rem 1.5rem;
}

::v-deep(.custom-table .p-datatable-tbody > tr > td) {
  background-color: white;
  color: black;
}
.bills-home {
  animation: fadeIn 0.5s ease-in-out;
  padding: 1rem;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
