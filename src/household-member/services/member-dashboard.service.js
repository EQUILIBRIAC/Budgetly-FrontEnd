import { HouseholdAPI } from '../infrastructure/household.api.js'

function normalizeCategory (bill) {
  return bill?.category || bill?.categoryName || bill?.type || 'Sin categoría'
}

function parseDate (value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function loadMemberDashboardData (householdId, memberId) {
  const [
    bills,
    contributions,
    memberContribs,
    users,
    household
  ] = await Promise.all([
    HouseholdAPI.billsByHousehold(householdId),
    HouseholdAPI.contributionsByHousehold(householdId),
    HouseholdAPI.memberContributions(),
    HouseholdAPI.users(),
    HouseholdAPI.householdByIdSafe(householdId)
  ])

  const currency = household?.currency === 2 ? 'USD' : 'PEN'
  const memberRecord = memberContribs.find(entry => String(entry.memberId) === String(memberId))

  const contributionsMap = new Map(contributions.map(contribution => [String(contribution.id), contribution]))
  const billsMap = new Map(bills.map(bill => [String(bill.id), bill]))

  const items = memberContribs
    .filter(entry => String(entry.memberId) === String(memberId))
    .map(entry => {
      const contribution = contributionsMap.get(String(entry.contributionId))
      const bill = billsMap.get(String(contribution?.billId))
      const dueDate = parseDate(contribution?.deadlineForMembers || bill?.paymentDay || entry.payedAt || entry.createdAt)
      const createdAt = parseDate(entry.createdAt)
      const paidAt = parseDate(entry.payedAt)

      const status = Number(entry.status) === 1 ? 'paid' : 'pending'
      const isOverdue = status !== 'paid' && dueDate && dueDate < new Date()

      return {
        id: entry.id,
        billId: contribution?.billId || bill?.id || '',
        description: bill?.description || contribution?.description || 'Gasto del hogar',
        category: normalizeCategory(bill),
        amount: Number(entry.amount || bill?.amount || 0),
        status,
        dueDate,
        createdAt,
        paidAt,
        isOverdue,
        billAmount: Number(bill?.amount || entry.amount || 0),
        currency
      }
    })

  const categories = Array.from(new Set(items.map(item => item.category))).sort()

  return {
    items,
    categories,
    currency
  }
}
