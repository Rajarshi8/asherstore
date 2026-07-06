import type { Metadata } from "next";

import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Shipping & Cancellation Policy | THE ASHER STORE",
  description: "Know the shipping process and cancellation rules before placing your order."
};

export default function ShippingCancellationPolicyPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Shipping & Cancellation Policy"
      intro="Delivery transparency is important. Here is how shipping and cancellations are handled at THE ASHER STORE."
      sections={[
        {
          title: "Shipping",
          points: [
            "Orders are usually dispatched within 24-72 hours on business days.",
            "Delivery timelines may vary by city and courier service coverage.",
            "Tracking information is shared as soon as the package is handed over."
          ]
        },
        {
          title: "Cancellation",
          points: [
            "Orders can be cancelled before dispatch confirmation.",
            "If you cancel your order after 1 hour, a 10% cancellation fee will be deducted from the refund amount.",
            "Refunds for valid cancellations are issued to the original payment method."
          ]
        }
      ]}
      primaryCta={{ label: "Start Cancellation", href: "/dashboard" }}
    />
  );
}
