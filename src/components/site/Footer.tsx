import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="container-page py-14 grid gap-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Your gateway to prime deals. Trusted properties for sale, rent and lease across Kenya.
          </p>
          <div className="mt-4 flex gap-2">
            {[Facebook, Instagram, Twitter, Linkedin].map((I, i) => (
              <a key={i} href="#" aria-label="social" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-transparent transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/properties" className="hover:text-primary">Properties</Link></li>
            <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Categories</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Land & Plots</li><li>Houses</li><li>Apartments</li><li>Commercial</li><li>Airbnbs</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Get in Touch</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Nairobi, Kenya</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +254 700 000 000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> hello@foxwood.co.ke</li>
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e)=>e.preventDefault()}>
            <input type="email" placeholder="Your email" className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
            <button className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Foxwood Properties. All rights reserved.</p>
          <p>Made with care in Kenya.</p>
        </div>
      </div>
    </footer>
  );
}
