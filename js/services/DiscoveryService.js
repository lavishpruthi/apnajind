import { Api } from "./Api.js";
import { CustomerService } from "./CustomerService.js";
import { AuthService } from "./AuthService.js";

const merchantToken = () => sessionStorage.getItem("apnajind_merchant_token") || "";
const customerToken = () => ({ token: CustomerService.token });

export class DiscoveryService {
  static offers(businessId = "") { return Api.request("offers", businessId ? { businessId } : {}, "GET", { silent: true }); }
  static posts(businessId = "") { return Api.request("posts", businessId ? { businessId } : {}, "GET", { silent: true }); }
  static events() { return Api.request("events", {}, "GET", { silent: true }); }
  static reviews(businessId) { return Api.request("reviews", { businessId }, "GET", { silent: true }); }
  static merchantContent() { return Api.request("merchantContent", { token: merchantToken() }); }
  static saveOffer(data) { return Api.request("offerSave", { ...data, token: merchantToken() }); }
  static deleteOffer(offerId) { return Api.request("offerDelete", { offerId, token: merchantToken() }); }
  static savePost(message) { return Api.request("postSave", { message, token: merchantToken() }); }
  static reply(reviewId, reply) { return Api.request("reviewReply", { reviewId, reply, token: merchantToken() }); }
  static submitReview(data) { return Api.request("customerReview", { ...customerToken(), ...data }); }
  static toggleFollow(businessId) { return Api.request("customerFollow", { ...customerToken(), businessId }); }
  static follows() { return Api.request("customerFollows", customerToken()); }
  static activity() { return Api.request("customerActivity", customerToken()); }
  static adminEvents() { return Api.request("eventAdminList", { token: AuthService.token }); }
  static saveEvent(data) { return Api.request("eventSave", { ...data, token: AuthService.token }); }
  static setEvent(id, active) { return Api.request("eventSet", { id, active, token: AuthService.token }); }
  static adminReviews() { return Api.request("reviewAdminList", { token: AuthService.token }); }
  static setReview(id, status) { return Api.request("reviewSet", { id, status, token: AuthService.token }); }
}
