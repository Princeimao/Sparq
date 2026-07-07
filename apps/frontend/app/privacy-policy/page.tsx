import { navigationData } from "@/constant";
import Header from "@/components/header";
import Footer from "@/components/footer";

const page = () => {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="relative z-20 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        <Header navigationData={navigationData} />
        <main className="min-h-screen bg-gray-50 py-16 px-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Privacy Policy
          </h1>

          <p className="mb-10 text-sm text-gray-500">
            Last updated: July 7, 2026
          </p>

          <div className="space-y-10 text-gray-700">
            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Introduction
              </h2>
              <p className="leading-8">
                Your privacy is important to us. This Privacy Policy explains
                how we collect, use, disclose, and safeguard your information
                when you use our website and services. By using our platform,
                you agree to the practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Information We Collect
              </h2>

              <ul className="list-disc space-y-3 pl-6 leading-8">
                <li>
                  Personal information such as your name, email address, and
                  contact details.
                </li>
                <li>
                  Account information you provide when registering or updating
                  your profile.
                </li>
                <li>
                  Usage information including browser type, device information,
                  pages visited, and interactions with our services.
                </li>
                <li>
                  Cookies and similar technologies used to improve your
                  experience.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                How We Use Your Information
              </h2>

              <ul className="list-disc space-y-3 pl-6 leading-8">
                <li>Provide and maintain our services.</li>
                <li>Improve website performance and user experience.</li>
                <li>Respond to customer support requests.</li>
                <li>Send important updates regarding your account.</li>
                <li>Protect against fraud and unauthorized access.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Cookies
              </h2>

              <p className="leading-8">
                We use cookies and similar tracking technologies to analyze site
                traffic, remember your preferences, and enhance your browsing
                experience. You can disable cookies through your browser
                settings, although some features may not function properly.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Data Security
              </h2>

              <p className="leading-8">
                We implement appropriate technical and organizational measures
                to protect your information against unauthorized access,
                disclosure, alteration, or destruction. However, no method of
                transmission over the internet is completely secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Third-Party Services
              </h2>

              <p className="leading-8">
                Our website may integrate with third-party services such as
                analytics providers, payment processors, or authentication
                services. These providers have their own privacy policies, and
                we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Your Rights
              </h2>

              <ul className="list-disc space-y-3 pl-6 leading-8">
                <li>Access your personal information.</li>
                <li>Correct inaccurate or incomplete data.</li>
                <li>Request deletion of your personal information.</li>
                <li>Withdraw consent where applicable.</li>
                <li>Request a copy of your stored data.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Children's Privacy
              </h2>

              <p className="leading-8">
                Our services are not intended for children under the age
                required by applicable law. We do not knowingly collect personal
                information from children.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Changes to This Policy
              </h2>

              <p className="leading-8">
                We may update this Privacy Policy periodically. Any changes will
                be posted on this page along with the updated revision date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                Contact Us
              </h2>

              <p className="leading-8">
                If you have any questions about this Privacy Policy or how we
                handle your data, please contact us at:
              </p>

              <div className="mt-4 rounded-xl border bg-gray-50 p-5">
                <p>
                  <strong>Email:</strong> support@example.com
                </p>
                <p>
                  <strong>Website:</strong> https://example.com
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
};

export default page;
