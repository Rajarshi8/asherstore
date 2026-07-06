import type { Metadata } from "next";

import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Refund Policy | THE ASHER STORE",
  description: "Review the refund policy for orders placed at THE ASHER STORE."
};

export default function ReturnPolicyPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Refund Policy"
      intro="We keep refunds straightforward so you can shop confidently and get the right fit."
      sections={[
        {
          title: "Eligibility",
          points: [
            "Orders can be cancelled only before dispatch confirmation.",
            "Once shipped, cancellation will not be possible."
          ]
        },
        {
          title: "Refund Guideline",
          points: [
            "If you cancel your order after 1 hour, a 10% cancellation fee will be deducted from the refund amount.",
            "You will receive a confirmation email when processing starts."
          ]
        }
      ]}
      primaryCta={{ label: "Start a Return", href: "/returns-exchange" }}
    />
  );
}
