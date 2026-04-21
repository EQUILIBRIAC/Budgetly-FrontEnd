import { Member } from '../models/member.entity.js';

export function toMembers({ rawMembers, users, perMemberAssigned, deadline, allMemberContribs }) {
    return rawMembers.map(m => {
        const user = users.find(u => String(u.id) === String(m.userId));
        const mine = allMemberContribs.filter(mc => String(mc.memberId) === String(m.id));
        const contributed = mine.reduce((a, mc) => a + parseFloat(mc.amount || 0), 0);
        const status = mine.some(mc => Number(mc.status) === 1) ? 'Cumplido' : 'Pendiente';
        return new Member({
            id: m.id,
            name: user?.name ?? 'Desconocido',
            contributed,
            assigned: Number(perMemberAssigned.toFixed(2)),
            deadline,
            status
        });
    });
}