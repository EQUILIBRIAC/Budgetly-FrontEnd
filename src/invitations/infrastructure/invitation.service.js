import http from '@/shared/services/http.instance';

export const InvitationService = {
  async create(dto) {
    const { data } = await http.post('/invitations', dto);
    return data;
  },

  async getPending(email, householdId) {
    const { data } = await http.get('/invitations/pending', { params: { email, householdId } });
    return data;
  }
};

export default InvitationService;
