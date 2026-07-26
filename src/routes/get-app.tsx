import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, Copy, Check, Share2, Download, MessageCircle, Apple, Chrome } from "lucide-react";
import { BRAND, v } from "@/lib/branding";
import { SITE_URL } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackPwaEvent as track } from "@/lib/pwa-track";

const SURFACE = "get-app";


const SHARE_URL = `${SITE_URL}/get-app`;
const TITLE = "Download the Foxwood Properties App";
const DESC =
  "Install the Foxwood Properties app on your phone in seconds — browse verified homes, land and rentals across Kenya, save searches and get instant alerts.";
const OG_IMAGE = `${SITE_URL}/favicon-512.png`;

export const Route = createFileRoute("/get-app")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: GetApp,
});

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function GetApp() {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    track("page_view", SURFACE);
    QRCode.toDataURL(SHARE_URL, {
      width: 512,
      margin: 1,
      color: { dark: "#0F766E", light: "#ffffff" },
    })
      .then((url) => {
        setQr(url);
        track("qr_shown", SURFACE);
      })
      .catch(() => setQr(null));
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      track("impression", SURFACE);
    };
    const onInstalled = () => track("installed", SURFACE);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const copy = async (fromShare = false) => {
    if (!fromShare) track("copy_link", SURFACE);
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast.success("Link copied — paste it anywhere to share");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Long-press the link to copy manually.");
    }
  };

  const share = async () => {
    track("share_click", SURFACE);
    const data = { title: TITLE, text: `${BRAND.name} — ${BRAND.tagline}. Install the app:`, url: SHARE_URL };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled */
      }
    }
    copy(true);
  };

  const install = async () => {
    track("install_click", SURFACE);
    if (!deferred) {
      track("ios_hint_shown", SURFACE);
      toast.info("Use your browser menu → “Install app” / “Add to Home Screen”.");
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice?.outcome === "dismissed") track("dismiss", SURFACE);
    setDeferred(null);
  };


  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `${BRAND.name} — ${BRAND.tagline}. Install the app: ${SHARE_URL}`,
  )}`;

  return (
    <main className="bg-background">
      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Free • No app store needed
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              Get the {BRAND.name} app
            </h1>
            <p className="mt-4 max-w-prose text-muted-foreground">{DESC}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={install}>
                <Download className="mr-2 h-4 w-4" /> Install now
              </Button>
              <Button size="lg" variant="secondary" onClick={share}>
                <Share2 className="mr-2 h-4 w-4" /> Share link
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                </a>
              </Button>
            </div>

            <div className="mt-6 rounded-lg border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Shareable download link</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-sm">{SHARE_URL}</code>
                <Button size="sm" variant="outline" onClick={copy} aria-label="Copy download link">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              {qr ? (
                <img
                  src={qr}
                  alt={`QR code linking to ${SHARE_URL}`}
                  width={240}
                  height={240}
                  className="h-60 w-60"
                />
              ) : (
                <div className="h-60 w-60 animate-pulse rounded bg-muted" />
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Scan with your phone camera to open and install
            </p>
            <img
              src={v("/favicon-192.png")}
              alt={`${BRAND.name} app icon`}
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl border shadow-sm"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <h2 className="text-2xl font-semibold tracking-tight">How to install</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <Chrome className="h-4 w-4 text-primary" /> Android (Chrome)
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open this page in Chrome.</li>
              <li>Tap “Install now” above, or the ⋮ menu.</li>
              <li>Choose “Install app” / “Add to Home screen”.</li>
              <li>Open Foxwood from your home screen.</li>
            </ol>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <Apple className="h-4 w-4 text-primary" /> iPhone &amp; iPad (Safari)
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open this page in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Select “Add to Home Screen”.</li>
              <li>Tap “Add” — the icon appears on your home screen.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
