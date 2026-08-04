import { sections } from "@/constant";

export const metadata = {
  title: "Terms of Service — Sparq",
  description:
    "Read the Sparq Terms of Service governing your use of our WhatsApp automation platform.",
};


export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: August 1, 2026
      </p>

      <p className="text-muted-foreground leading-8 mb-10">
        Please read these Terms of Service carefully before using the Sparq
        platform. These Terms constitute a legally binding agreement between you
        and Sparq regarding your use of the Service.
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
  );
}
