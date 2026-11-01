import { Api } from "./Api.js";
import { AuthService } from "./AuthService.js";

const withToken = (data) => ({ ...data, token: AuthService.token });

export class MasterService {
  static codeTypes = {
    list: () => Api.request("ctList", withToken()),
    save: (data) => Api.request("ctSave", withToken(data)),
    remove: (id) => Api.request("ctDelete", withToken({ id })),
  };
  static codes = {
    list: (type) => Api.request("cList", withToken({ type })),
    save: (data) => Api.request("cSave", withToken(data)),
    remove: (id) => Api.request("cDelete", withToken({ id })),
  };
  static roles = {
    list: () => Api.request("rList", withToken()),
    save: (data) => Api.request("rSave", withToken(data)),
    remove: (id) => Api.request("rDelete", withToken({ id })),
  };
  static users = {
    list: () => Api.request("uList", withToken()),
    save: (data) => Api.request("uSave", withToken(data)),
    remove: (id) => Api.request("uDelete", withToken({ id })),
  };
}
