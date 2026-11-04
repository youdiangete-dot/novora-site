import CustomerOrderStatus from "./CustomerOrderStatus";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function OrderStatusPage() {
  if (process.env.NOVORA_CUSTOMER_ORDER_STATUS_ENABLED !== "true" || process.env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED !== "true") {
    return <main><h1>Order records unavailable</h1><p>Commercial order status access is not enabled. No demo status or order success is assumed.</p></main>;
  }
  return <CustomerOrderStatus/>;
}
