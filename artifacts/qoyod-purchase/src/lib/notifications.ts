import { customFetch } from "@workspace/api-client-react";

export interface NotificationEmail {
  to: string;
  bcc: string;
  subject: string;
  body: string;
}

export const getNotificationEmail = (id: number) =>
  customFetch<NotificationEmail>(`/api/purchase-requests/${id}/notification-email`, { method: "POST" });

export function openMailto({ to, bcc, subject, body }: NotificationEmail) {
  const params = new URLSearchParams({ bcc, subject, body });
  window.location.href = `mailto:${to}?${params.toString()}`;
}

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
