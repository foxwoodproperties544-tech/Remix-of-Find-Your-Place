import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import footerBg from "@/assets/footer-realestate.jpg";

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
      <div className="container-page py-14 grid gap-10 md:grid-cols-4">
        <div>
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
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li><Link to="/properties" className="hover:text-secondary">Properties</Link></li>
            <li><Link to="/about" className="hover:text-secondary">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-secondary">Contact</Link></li>
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
          <h4 className="font-semibold mb-3 text-sm">Get in Touch</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" /> Nairobi, Kenya</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-secondary" /> +254 700 000 000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-secondary" /> hello@foxwood.co.ke</li>
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e)=>e.preventDefault()}>
            <input type="email" placeholder="Your email" className="flex-1 rounded-full border border-primary-foreground/30 bg-background/10 backdrop-blur px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-secondary" />
            <button className="btn-secondary !py-2 !px-4 text-sm">Join</button>
          </form>
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
