import { customFetch } from "@workspace/api-client-react";

export interface NotificationEmailResult {
  sent: boolean;
  to: string;
}

export const sendNotificationEmail = (id: number) =>
  customFetch<NotificationEmailResult>(`/api/purchase-requests/${id}/notification-email`, { method: "POST" });

export interface MagicActionPreview {
  action: "approve" | "reject" | "clarify" | "respond";
  requestId: number;
  requestNumber: string;
  itemDescription: string;
  type: "purchase" | "refund";
}

export const getMagicAction = (token: string) =>
  customFetch<MagicActionPreview>(`/api/magic-actions/${token}`, { method: "GET" });

export const confirmMagicAction = (token: string, note?: string) =>
  customFetch<unknown>(`/api/magic-actions/${token}/confirm`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
