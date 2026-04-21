import { HouseholdSummary } from '../models/household-summary.entity.js';

export function toHouseholdSummary({ bills=[], members=[], memberContribs=[], currencyCode='PEN' }) {
    const memberIds = new Set(members.map(m => m.id));
    const contribs = memberContribs.filter(mc => memberIds.has(mc.memberId));
    const totalContributed = contribs.reduce((a, c) => a + parseFloat(c.amount || 0), 0);
    const monthlyGoal = bills.reduce((a, b) => a + parseFloat(b.amount || 0), 0);
    const progress = monthlyGoal > 0 ? Number(((totalContributed / monthlyGoal) * 100).toFixed(2)) : 0;
    return new HouseholdSummary({ totalContributed, monthlyGoal, progress, contributors: members.length, currency: currencyCode });
}