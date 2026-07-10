import { PurchaseRequestStatus } from "@workspace/api-client-react";

export function getStatusInfo(status: PurchaseRequestStatus) {
  switch (status) {
    case 'pending_manager':
    case 'pending_accounts':
      return { label: 'Pending Approval', variant: 'warning' as const, labelAr: 'في انتظار الموافقة' };
    case 'pending_clarification_employee_manager':
    case 'pending_clarification_employee_accounts':
      return { label: 'Needs Clarification', variant: 'info' as const, labelAr: 'يحتاج توضيح' };
    case 'pending_vendor_assignment':
      return { label: 'Awaiting Vendor Assignment', variant: 'warning' as const, labelAr: 'في انتظار تحديد المورد' };
    case 'approved_by_manager':
      return { label: 'Manager Approved', variant: 'success' as const, labelAr: 'موافقة المدير' };
    case 'approved_by_accounts':
      return { label: 'Accounts Approved', variant: 'success' as const, labelAr: 'موافقة الحسابات' };
    case 'rejected_by_manager':
    case 'rejected_by_accounts':
      return { label: 'Rejected', variant: 'destructive' as const, labelAr: 'مرفوض' };
    case 'executed':
      return { label: 'Executed', variant: 'default' as const, labelAr: 'تم التنفيذ' };
    default:
      return { label: status, variant: 'outline' as const, labelAr: status };
  }
}
