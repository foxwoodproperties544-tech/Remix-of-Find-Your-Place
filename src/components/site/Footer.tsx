import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import footerBg from "@/assets/footer-realestate.jpg";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, trackSupportClick, whatsappUrl } from "@/lib/support";

export function Footer() {
  return (
    <footer className="mt-24 relative isolate overflow-hidden text-primary-foreground">
      <img
        src={footerBg}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1920}
        height={1080}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 94%, black) 0%, color-mix(in oklab, var(--color-primary) 82%, transparent) 60%, color-mix(in oklab, var(--color-primary) 88%, black) 100%)",
        }}
      />
      <div className="container-page py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-background/95 backdrop-blur inline-flex px-3 py-2">
            <Logo />
          </div>
          <p className="mt-4 text-sm text-primary-foreground/85 max-w-xs">
            Your gateway to prime deals. Trusted properties for sale, rent and lease across Kenya.
          </p>
          <div className="mt-4 flex gap-2">
            {[Facebook, Instagram, Twitter, Linkedin].map((I, i) => (
              <a key={i} href="#" aria-label="social" className="grid h-9 w-9 place-items-center rounded-full border border-primary-foreground/30 hover:bg-secondary hover:border-transparent transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-6">
            <h4 className="font-semibold mb-3 text-sm">Contact Us</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/85">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" /> Nairobi, Kenya</li>
              <li>
                <a href={`tel:${SUPPORT_PHONE_TEL}`} onClick={() => trackSupportClick("call", "generic")} className="flex items-center gap-2 hover:text-secondary">
                  <Phone className="h-4 w-4 text-secondary" /> Phone: {SUPPORT_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" onClick={() => trackSupportClick("whatsapp", "generic")} className="flex items-center gap-2 hover:text-secondary">
                  <MessageCircle className="h-4 w-4 text-secondary" /> WhatsApp: {SUPPORT_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href="mailto:hello@foxwood.co.ke" className="flex items-center gap-2 hover:text-secondary">
                  <Mail className="h-4 w-4 text-secondary" /> hello@foxwood.co.ke
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm">Explore</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li><Link to="/" className="hover:text-secondary">Home</Link></li>
            <li><Link to="/properties" className="hover:text-secondary">All Properties</Link></li>
            <li><Link to="/properties" search={{ category: "For Sale" } as any} className="hover:text-secondary">Buy</Link></li>
            <li><Link to="/properties" search={{ category: "For Rent" } as any} className="hover:text-secondary">Rent</Link></li>
            <li><Link to="/properties" search={{ category: "For Lease" } as any} className="hover:text-secondary">Lease</Link></li>
            <li><Link to="/properties" search={{ type: "Airbnbs" } as any} className="hover:text-secondary">Airbnbs</Link></li>
            <li><Link to="/blog" className="hover:text-secondary">Blog</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm">Services</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li><Link to="/services/buy" className="hover:text-secondary">Buy Property</Link></li>
            <li><Link to="/services/sell" className="hover:text-secondary">Sell Property</Link></li>
            <li><Link to="/services/rent" className="hover:text-secondary">Rent Property</Link></li>
            <li><Link to="/services/lease" className="hover:text-secondary">Lease Property</Link></li>
            <li><Link to="/services/list" className="hover:text-secondary">List Your Property</Link></li>
            <li><Link to="/services/valuation" className="hover:text-secondary">Property Valuation</Link></li>
            <li><Link to="/services/marketing" className="hover:text-secondary">Property Marketing</Link></li>
            <li><Link to="/services/management" className="hover:text-secondary">Property Management</Link></li>
            <li><Link to="/services/investment" className="hover:text-secondary">Investment Advice</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm">Tools</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li><Link to="/mortgage" className="hover:text-secondary">Mortgage Calculator</Link></li>
            <li><Link to="/due-diligence" className="hover:text-secondary">Land Due Diligence</Link></li>
            <li><Link to="/compare" className="hover:text-secondary">Compare Properties</Link></li>
            <li><Link to="/favorites" className="hover:text-secondary">My Favorites</Link></li>
            <li><Link to="/saved-searches" className="hover:text-secondary">Saved Searches</Link></li>
            <li><Link to="/dashboard" className="hover:text-secondary">Dashboard</Link></li>
            <li><Link to="/dashboard/new" className="hover:text-secondary">Add Listing</Link></li>
            <li><Link to="/dashboard/inquiries" className="hover:text-secondary">Inquiries</Link></li>
            <li><Link to="/auth" className="hover:text-secondary">Sign In</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li><Link to="/about" className="hover:text-secondary">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-secondary">Contact Us</Link></li>
            <li><Link to="/blog" className="hover:text-secondary">Blog & News</Link></li>
            <li><Link to="/faq" className="hover:text-secondary">FAQ</Link></li>
            <li><Link to="/help" className="hover:text-secondary">Help Centre</Link></li>
            <li><Link to="/get-app" className="hover:text-secondary">Download the App</Link></li>
            <li><Link to="/privacy" className="hover:text-secondary">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-secondary">Terms & Conditions</Link></li>
            <li><Link to="/cookies" className="hover:text-secondary">Cookie Policy</Link></li>
          </ul>
          <h4 className="font-semibold mb-3 mt-6 text-sm">Newsletter</h4>
          <NewsletterSignup />

        </div>
      </div>
      <div className="border-t border-primary-foreground/20">
        <div className="container-page py-5 text-xs text-primary-foreground/80 flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Foxwood Properties. All rights reserved.</p>
          <p>Made with care in Kenya.</p>
        </div>
      </div>
    </footer>
  );
}
