import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 py-24 sm:py-32">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
                AI-Powered Tokenization for
                <span className="text-gradient bg-gradient-to-r from-accent-400 to-accent-300 bg-clip-text text-transparent">
                  {' '}
                  Real-World Assets
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-primary-100">
                Democratizing access to premium real estate and equity investments
                through blockchain technology. Start investing with as little as $500.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/marketplace"
                  className="btn-primary px-6 py-3 text-base"
                >
                  Explore Investments
                </Link>
                <Link
                  href="/issuer"
                  className="btn text-white hover:text-primary-200"
                >
                  List Your Asset <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-gray-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-8 text-center sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: '$100M+', label: 'Assets Tokenized' },
                { value: '5,000+', label: 'Verified Investors' },
                { value: '50+', label: 'Tokenized Properties' },
                { value: '7.5%', label: 'Avg. Annual Yield' },
              ].map((stat) => (
                <div key={stat.label} className="mx-auto flex max-w-xs flex-col gap-y-2">
                  <dt className="text-base leading-7 text-gray-600">{stat.label}</dt>
                  <dd className="order-first font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Why Choose CryptoAI.ai?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Built on cutting-edge technology with regulatory compliance at its core.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-5xl">
              <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'AI-Powered Processing',
                    description:
                      'Automated document processing, compliance checks, and risk assessment powered by advanced AI.',
                    icon: '🤖',
                  },
                  {
                    title: 'Regulatory Compliant',
                    description:
                      'Licensed and regulated under VARA, DFSA, and ADGM frameworks in the UAE.',
                    icon: '✅',
                  },
                  {
                    title: 'Fractional Ownership',
                    description:
                      'Invest in premium properties and companies with as little as $500.',
                    icon: '💎',
                  },
                  {
                    title: 'Secondary Trading',
                    description:
                      '24/7 trading on our compliant marketplace. Exit anytime.',
                    icon: '📈',
                  },
                  {
                    title: 'Automated Distributions',
                    description:
                      'Receive rental income and dividends automatically to your wallet.',
                    icon: '💰',
                  },
                  {
                    title: 'Bank-Grade Security',
                    description:
                      'Your assets are protected by institutional-grade custody solutions.',
                    icon: '🔒',
                  },
                ].map((feature) => (
                  <div key={feature.title} className="card p-6">
                    <div className="text-3xl mb-4">{feature.icon}</div>
                    <dt className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </dt>
                    <dd className="mt-2 text-gray-600">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Asset Types Section */}
        <section className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Asset Classes
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Diversify your portfolio across multiple asset classes.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="card overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-primary-500 to-primary-700" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">Real Estate</h3>
                  <p className="mt-2 text-gray-600">
                    Premium commercial and residential properties in Dubai freehold zones.
                    Monthly rental distributions.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li>• Office buildings & retail</li>
                    <li>• Residential portfolios</li>
                    <li>• Development projects</li>
                    <li>• Hospitality assets</li>
                  </ul>
                </div>
              </div>
              <div className="card overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-accent-500 to-accent-700" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">Equity & Shares</h3>
                  <p className="mt-2 text-gray-600">
                    Private company equity, startup shares, SAFEs, and convertible notes.
                    Participate in growth stories.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li>• Startup equity</li>
                    <li>• Private company shares</li>
                    <li>• SAFEs & convertibles</li>
                    <li>• Employee stock options</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-900 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Start Investing?
              </h2>
              <p className="mt-4 text-lg text-primary-100">
                Join thousands of investors already building wealth through tokenized assets.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                  Create Free Account
                </Link>
                <Link
                  href="/learn"
                  className="btn text-white hover:text-primary-200"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
