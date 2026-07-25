import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sw";

type Dict = Record<string, { en: string; sw: string }>;

const DICT: Dict = {
  nav_buy: { en: "Buy", sw: "Nunua" },
  nav_rent: { en: "Rent", sw: "Kodisha" },
  nav_lease: { en: "Lease", sw: "Kukodi" },
  nav_airbnbs: { en: "Airbnbs", sw: "Airbnbs" },
  nav_blog: { en: "Blog", sw: "Blogu" },
  nav_about: { en: "About Us", sw: "Kuhusu Sisi" },
  nav_contact: { en: "Contact Us", sw: "Wasiliana Nasi" },
  nav_agents: { en: "Agents", sw: "Mawakala" },
  nav_more: { en: "More", sw: "Zaidi" },
  hero_tagline: { en: "Your gateway to prime deals", sw: "Lango lako la mikataba bora" },
  cta_sign_in: { en: "Sign in", sw: "Ingia" },
  cta_list_property: { en: "List property", sw: "Orodhesha nyumba" },
  search_placeholder: { en: "Search properties, towns, counties…", sw: "Tafuta nyumba, miji, kaunti…" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: keyof typeof DICT) => string };
const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => DICT[k]?.en ?? String(k) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const stored = (localStorage.getItem("foxwood_lang") as Lang | null) ?? null;
      if (stored === "en" || stored === "sw") setLangState(stored);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("foxwood_lang", l); } catch {}
  };
  const t = (key: keyof typeof DICT) => DICT[key]?.[lang] ?? DICT[key]?.en ?? String(key);
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
