import { customFetch } from "@workspace/api-client-react";

export type UserRole = "admin" | "accounts_manager" | "accounts_employee" | "employee";

export interface AppUser {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Policy {
  id: number;
  title: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export const listUsers = () => customFetch<AppUser[]>("/api/users", { method: "GET" });

export const createUser = (data: { email: string; role: UserRole }) =>
  customFetch<AppUser>("/api/users", { method: "POST", body: JSON.stringify(data) });

export const updateUserRole = (id: number, role: UserRole) =>
  customFetch<AppUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) });

export const deleteUser = (id: number) =>
  customFetch<null>(`/api/users/${id}`, { method: "DELETE" });

export const listPolicies = () => customFetch<Policy[]>("/api/policies", { method: "GET" });

export const uploadPolicy = (title: string, file: File) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("file", file);
  return customFetch<Policy>("/api/policies", { method: "POST", body: formData });
};

export const deletePolicy = (id: number) =>
  customFetch<null>(`/api/policies/${id}`, { method: "DELETE" });

export const deletePurchaseRequest = (id: number) =>
  customFetch<null>(`/api/purchase-requests/${id}`, { method: "DELETE" });

export const deleteAllPurchaseRequests = () =>
  customFetch<null>("/api/purchase-requests", { method: "DELETE" });

export interface VendorDocumentType {
  id: number;
  name: string;
  createdAt: string;
}

export const listDocumentTypes = () =>
  customFetch<VendorDocumentType[]>("/api/vendor-document-types", { method: "GET" });

export const createDocumentType = (name: string) =>
  customFetch<VendorDocumentType>("/api/vendor-document-types", { method: "POST", body: JSON.stringify({ name }) });

export const updateDocumentType = (id: number, name: string) =>
  customFetch<VendorDocumentType>(`/api/vendor-document-types/${id}`, { method: "PUT", body: JSON.stringify({ name }) });

export const deleteDocumentType = (id: number) =>
  customFetch<null>(`/api/vendor-document-types/${id}`, { method: "DELETE" });
