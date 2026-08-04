import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/disclaimer')({
  component: DisclaimerPage,
  head: () => ({
    title: 'Disclaimer | Foxwood Properties',
    meta: [
      { name: 'description', content: 'Legal disclaimer and limitation of liability for Foxwood Properties.' },
      { property: 'og:title', content: 'Disclaimer | Foxwood Properties' },
      { name: 'twitter:card', content: 'summary' }
    ]
  })
})

function DisclaimerPage() {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Disclaimer</h1>
        <div className="prose prose-teal max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Last updated: August 2026</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. General Information</h2>
            <p>The information provided by Foxwood Properties Ltd ("we", "us", or "our") on foxwood.co.ke (the "Site") is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Professional Disclaimer</h2>
            <p>The Site cannot and does not contain real estate or legal advice. Any real estate or legal information is provided for general informational and educational purposes only and is not a substitute for professional advice. Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. We do not provide any kind of real estate or legal advice. THE USE OR RELIANCE OF ANY INFORMATION CONTAINED ON THE SITE IS SOLELY AT YOUR OWN RISK.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Property Details Disclaimer</h2>
            <p>Property listings, including but not limited to prices, dimensions, amenities, and availability, are provided by third-party agents and developers. While we strive to verify listings, Foxwood Properties does not guarantee that the details are error-free or current. Prospective buyers and tenants are advised to perform their own due diligence, including physical site visits and title searches, before entering into any transaction.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. External Links Disclaimer</h2>
            <p>The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
