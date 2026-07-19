import { Facebook, Linkedin, Mail, Link2, MessageCircle, Send, Printer } from "lucide-react";
import { useState } from "react";

export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const t = enc(title);
  const u = enc(url);
  const items = [
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${t}%20${u}` },
    { name: "X (Twitter)", icon: XLogo, href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: "Telegram", icon: Send, href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: "Email", icon: Mail, href: `mailto:?subject=${t}&body=${u}` },
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Share</span>
      {items.map(({ name, icon: Icon, href }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button type="button" onClick={copy} aria-label="Copy link"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
        <Link2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => window.print()} aria-label="Print article"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
        <Printer className="h-4 w-4" />
      </button>
      {copied && <span className="text-xs text-primary font-semibold ml-1">Link copied!</span>}
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
