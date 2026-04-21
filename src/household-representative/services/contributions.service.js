import http from "@/shared/services/http.instance.js";

export class ContributionsService {
  resourceEndpoint = "/contribution";

  getAll() {
    return http.get(this.resourceEndpoint);
  }

  getById(id) {
    return http.get(`${this.resourceEndpoint}/${encodeURIComponent(id)}`);
  }

  getByBillId(id) {
    return http.get(`${this.resourceEndpoint}?billId=${encodeURIComponent(id)}`);
  }

  getHouseHoldId(id) {
    return http.get(`${this.resourceEndpoint}/byhouseholdid/${encodeURIComponent(id)}`);
  }
}
