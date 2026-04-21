import { HouseholdAPI } from '../infrastructure/household.api.js';
import { toMembers } from '../infrastructure/member.assembler.js';
import { toHouseholdSummary } from '../infrastructure/household-summary.assembler.js';

export async function fetchHouseholdMembers(householdId) {
    const [users, rawMembers, allMemberContribs, bills, contributions] = await Promise.all([
        HouseholdAPI.users(),
        HouseholdAPI.membersByHousehold(householdId),
        HouseholdAPI.memberContributions(),
        HouseholdAPI.billsByHousehold(householdId),
        HouseholdAPI.contributionsByHousehold(householdId)
    ]);

    const monthlyGoal = bills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const perMemberAssigned = rawMembers.length ? monthlyGoal / rawMembers.length : 0;

    const lastDeadlineISO = contributions.map(c => c.deadlineForMembers).filter(Boolean).sort().at(-1) || null;
    const formatDate = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };

    return toMembers({
        rawMembers,
        users,
        perMemberAssigned,
        deadline: formatDate(lastDeadlineISO),
        allMemberContribs
    });
}

export async function fetchHouseholdSummary(householdId) {
    const [bills, members, memberContribs, householdArr] = await Promise.all([
        HouseholdAPI.billsByHousehold(householdId),
        HouseholdAPI.membersByHousehold(householdId),
        HouseholdAPI.memberContributions(),
        HouseholdAPI.householdById(householdId)
    ]);

    const currencyCode = (householdArr?.[0]?.currency === 2) ? 'USD' : 'PEN';
    return toHouseholdSummary({ bills, members, memberContribs, currencyCode });
}

export async function searchHouseholdById(code) {
    const res = await HouseholdAPI.householdById(code);
    return res.length ? res[0] : null;
}

export async function joinHousehold(userId, householdId) {
    const payload = {
        id: `HM-${Date.now()}`,
        userId: String(userId),
        householdId,
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return await HouseholdAPI.createMember(payload);
}