import { navigationData } from "@/constant";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata = {
  title: "Terms of Service — Sparq",
  description: "Read the Sparq Terms of Service governing your use of our WhatsApp automation platform.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Sparq ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Service. These Terms apply to all users including businesses, merchants, and developers who access our platform.`,
  },
  {
    title: "2. Description of Service",
    content: `Sparq provides a SaaS platform that enables businesses to automate customer communication via WhatsApp, manage orders, appointments, reservations, and integrate payment gateways including Stripe and Razorpay. The Service connects to the Meta WhatsApp Business Cloud API using your own WABA (WhatsApp Business Account).`,
  },
  {
    title: "3. Account Registration",
    content: `You must register for an account using Google OAuth to access protected features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately upon becoming aware of any unauthorized use.`,
  },
  {
    title: "4. WhatsApp & Meta Platform Compliance",
    content: `Your use of the Service is also governed by Meta's Business Policies and WhatsApp Business Platform Terms. You are solely responsible for ensuring your messages, flows, and automations comply with Meta's guidelines. Sparq is not responsible for account suspensions or restrictions imposed by Meta.`,
  },
  {
    title: "5. Payment & Billing",
    content: `Subscription fees are billed monthly or annually as selected. All fees are non-refundable except as required by law. We reserve the right to modify pricing with 30 days' notice. Delinquent accounts may be suspended or terminated. Payment processing is handled by third-party providers; their terms also apply.`,
  },
  {
    title: "6. Data & Privacy",
    content: `Your use of the Service is also governed by our Privacy Policy. You retain ownership of all customer data you process through the platform. You grant Sparq a limited license to process this data solely for the purpose of providing the Service. We implement industry-standard encryption and access controls.`,
  },
  {
    title: "7. Prohibited Uses",
    content: `You may not use the Service to: (a) send spam or unsolicited messages; (b) violate Meta's messaging policies; (c) transmit malicious code; (d) impersonate any person or entity; (e) engage in any activity that violates applicable laws or regulations; (f) resell the Service without written authorization.`,
  },
  {
    title: "8. Intellectual Property",
    content: `The Service and its original content, features, and functionality are owned by Sparq and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without prior written consent.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the maximum extent permitted by applicable law, Sparq shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, goodwill, or business interruption, even if Sparq has been advised of the possibility of such damages.`,
  },
  {
    title: "10. Termination",
    content: `We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive.`,
  },
  {
    title: "11. Changes to Terms",
    content: `We reserve the right to modify or replace these Terms at any time. Material changes will be notified via email or a prominent notice on our Service. Your continued use of the Service after any changes constitutes acceptance of the new Terms.`,
  },
  {
    title: "12. Governing Law",
    content: `These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Mumbai, Maharashtra, India.`,
  },
  {
    title: "13. Contact",
    content: `If you have any questions about these Terms, please contact us at support@sparq.app or write to us at our registered office address.`,
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="relative z-20 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        <Header navigationData={navigationData} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-10">
            Last updated: August 1, 2026
          </p>

          <p className="text-muted-foreground leading-8 mb-10">
            Please read these Terms of Service carefully before using the Sparq
            platform. These Terms constitute a legally binding agreement between
            you and Sparq regarding your use of the Service.
          </p>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                <p className="text-muted-foreground leading-8">{section.content}</p>
              </section>
            ))}
          </div>
        </main>
      </div>

      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
