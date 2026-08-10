import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - DumbScroll",
  description: "Privacy Policy for DumbScroll application",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-800/80 rounded-2xl p-6 sm:p-10 border border-slate-700 shadow-xl backdrop-blur-sm">
        <header className="border-b border-slate-700 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: August 4, 2026
          </p>
        </header>

        <section className="space-y-6 text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong className="text-emerald-400">DumbScroll</strong>, a mobile application that provides concise book summaries and learning content to help users discover, understand, and retain ideas from books more efficiently.
          </p>

          <p>
            Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and your rights when using the DumbScroll application.
          </p>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Information We Collect</h2>
            <p className="mb-3">
              At this time, DumbScroll does not collect, store, or share any personally identifiable information from users.
            </p>
            <p>
              You can use the current version of the app without creating an account or providing personal information such as your name, email address, phone number, or payment information.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">How We Use Information</h2>
            <p className="mb-3">
              Since DumbScroll currently does not collect personal information, we do not use, analyze, or share any user data.
            </p>
            <p>
              If future versions of the app introduce optional features such as user accounts, subscriptions, personalized recommendations, analytics, or cloud synchronization, this Privacy Policy will be updated before those features become available.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Permissions</h2>
            <p>
              DumbScroll only requests permissions that are necessary for the proper functioning of the application. If additional permissions are required in future releases, this Privacy Policy will be updated accordingly.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="mb-3">
              The current version of DumbScroll does not use third-party analytics, advertising, or tracking services that collect user data.
            </p>
            <p>
              If we integrate services such as Firebase, Google Analytics, Google Play Billing, authentication providers, or other third-party services in the future, we will update this Privacy Policy before those services are enabled.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Children's Privacy</h2>
            <p>
              DumbScroll is not intended for children under the age of 13. We do not knowingly collect personal information from children.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Data Security</h2>
            <p>
              Although DumbScroll currently does not collect personal data, we are committed to maintaining a secure application and continuously improving our security practices.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect improvements to our application or changes in legal requirements. Any updates will be posted on this page along with the revised &quot;Last Updated&quot; date.
            </p>
          </div>

          <div className="border-t border-slate-700/60 pt-6">
            <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
            <p className="mb-3">
              If you have any questions, feedback, or concerns regarding this Privacy Policy, please contact us at:
            </p>
            <p className="font-mono text-emerald-400 bg-slate-900/60 inline-block px-3 py-1.5 rounded-md border border-slate-700/80 select-all">
              customercareinfinitedelight@gmail.com
            </p>
          </div>
        </section>

        <footer className="border-t border-slate-700 pt-6 mt-10 text-center text-sm text-slate-400">
          © 2026 DumbScroll. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
