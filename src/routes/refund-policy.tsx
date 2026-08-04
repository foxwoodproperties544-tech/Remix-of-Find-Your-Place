import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/refund-policy')({
  component: RefundPolicyPage,
  head: () => ({
    title: 'Refund Policy | Foxwood Properties',
    meta: [
      { name: 'description', content: 'Refund policy for listing packages and advertising services on Foxwood Properties.' },
      { property: 'og:title', content: 'Refund Policy | Foxwood Properties' }
    ]
  })
})

function RefundPolicyPage() {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <div className="prose prose-teal max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Last updated: August 2026</p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Digital Services</h2>
            <p>Foxwood Properties provides digital advertising and listing services. Due to the digital nature of these services, which are typically fulfilled or initiated immediately upon payment, all sales are generally final.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Listing Packages</h2>
            <p>No refunds will be issued for listing packages once a listing has been submitted or approved. If a listing is rejected by an admin for violating our terms of service, the agent may be given the opportunity to edit and resubmit the listing. Refunds for rejected listings are at the sole discretion of Foxwood Properties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Exceptional Circumstances</h2>
            <p>We may consider refund requests in exceptional circumstances, such as:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Duplicate payments made due to technical errors.</li>
              <li>Service outages that prevented the delivery of the purchased advertising benefit.</li>
              <li>Documented unauthorized transactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Contact Us</h2>
            <p>For refund inquiries, please contact our support team at billing@foxwood.co.ke with your transaction ID and a detailed explanation of your request. Requests must be submitted within 7 days of the transaction date.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
