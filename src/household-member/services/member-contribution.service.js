import httpInstance from "@/shared/services/http.instance.js";

export class MemberContributionService {
    resourceEndpoint = import.meta.env.VITE_MEMBER_CONTRIBUTIONS_PATH;

    getAll(){
        return httpInstance.get(this.resourceEndpoint);
    }

    getByContributionId(id){
        return httpInstance.get(`${this.resourceEndpoint}/?contributionId=${id}`);
    }

    getByMemberId(id){
        return httpInstance.get(`${this.resourceEndpoint}/?memberId=${id}`);
    }

    create(resource){
        return httpInstance.post(this.resourceEndpoint, resource);
    }
    update(id, resource){
        return httpInstance.put(`${this.resourceEndpoint}/${id}`, resource);
    }

    delete(id){
        return httpInstance.delete(`${this.resourceEndpoint}/${id}`);
    }
}