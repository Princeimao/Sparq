import { PRIVACY_SECTION } from "@/constant";

export const metadata = {
  title: "Privacy Policy — Sparq",
  description:
    "Read the Sparq Privacy Policy explaining how we collect, use, and protect your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>

        <p className="text-sm text-muted-foreground">
          Last updated: August 1, 2026
        </p>
      </div>

      <div className="rounded-2xl border bg-background p-6 sm:p-10 shadow-sm">
        <p className="text-muted-foreground leading-8 mb-10">
          This Privacy Policy explains how Sparq collects, uses, and protects
          information when you use our WhatsApp automation platform.
        </p>

        <div className="space-y-10">
          {PRIVACY_SECTION.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold mb-3">
                {section.title}
              </h2>

              <p className="text-muted-foreground leading-8 whitespace-pre-line">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}