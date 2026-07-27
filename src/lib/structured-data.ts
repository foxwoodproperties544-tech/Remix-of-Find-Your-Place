/**
 * Structured data (JSON-LD) builders + an automated validator used by the
 * public About Us / CEO pages and the admin structured-data preview.
 */
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { SUPPORT_PHONE_TEL } from "@/lib/support";
import heroAbout from "@/assets/hero-about.jpg";

export const ORG_NAME = "Foxwood Properties Ltd";
export const SUPPORT_EMAIL = "foxwoodproperties544@gmail.com";
export const ABOUT_URL = `${SITE_URL}/about-us`;
export const CEO_URL = `${SITE_URL}/team/kennedy-mutua`;
export const CEO_NAME = "Kennedy Mutua";
export const ABOUT_IMAGE = absoluteUrl(heroAbout);

export type Json = Record<string, unknown>;

export function buildOrganization(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE_URL}/#organization`,
    name: ORG_NAME,
    legalName: ORG_NAME,
    url: SITE_URL,
    logo: ABOUT_IMAGE,
    image: ABOUT_IMAGE,
    description:
      "Foxwood Properties Ltd is a trusted Kenyan property marketplace for buying, selling, renting and leasing verified property.",
    telephone: SUPPORT_PHONE_TEL,
    email: SUPPORT_EMAIL,
    areaServed: { "@type": "Country", name: "Kenya" },
    address: { "@type": "PostalAddress", addressCountry: "KE", addressLocality: "Nairobi" },
    openingHours: "Mo-Sa 08:00-18:00",
    founder: { "@type": "Person", "@id": `${CEO_URL}#person`, name: CEO_NAME },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: SUPPORT_PHONE_TEL,
        email: SUPPORT_EMAIL,
        areaServed: "KE",
        availableLanguage: ["en", "sw"],
      },
    ],
  };
}

export function buildPerson(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${CEO_URL}#person`,
    name: CEO_NAME,
    jobTitle: "Founder & Chief Executive Officer",
    url: CEO_URL,
    image: ABOUT_IMAGE,
    description:
      "Kennedy Mutua is the Founder and CEO of Foxwood Properties Ltd, building Kenya's most trusted digital property marketplace.",
    nationality: { "@type": "Country", name: "Kenya" },
    worksFor: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: ORG_NAME, url: SITE_URL },
  };
}

export function buildAboutPage(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${ORG_NAME}`,
    url: ABOUT_URL,
    description:
      "Learn about Foxwood Properties Ltd — our story, mission, values, services and the team behind Kenya's trusted property marketplace.",
    mainEntity: { "@id": `${SITE_URL}/#organization` },
  };
}

export function buildBreadcrumbs(items: { name: string; url: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/* ---------------- validation ---------------- */

export type Check = { field: string; ok: boolean; required: boolean; message: string };
export type ValidationResult = { valid: boolean; errors: number; warnings: number; checks: Check[] };

function get(obj: Json, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc as Json | undefined)?.[k], obj);
}

function isNonEmptyString(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function isAbsoluteUrl(v: unknown) {
  return typeof v === "string" && /^https:\/\/[^\s]+$/i.test(v);
}

type Rule = { field: string; required?: boolean; kind?: "string" | "url" | "object" };

function run(data: Json, rules: Rule[]): ValidationResult {
  const checks: Check[] = rules.map((r) => {
    const v = get(data, r.field);
    let ok: boolean;
    let message: string;
    if (r.kind === "url") {
      ok = isAbsoluteUrl(v);
      message = ok ? "Valid absolute https URL" : "Must be an absolute https URL";
    } else if (r.kind === "object") {
      ok = !!v && typeof v === "object";
      message = ok ? "Present" : "Missing nested object";
    } else {
      ok = isNonEmptyString(v);
      message = ok ? "Present" : "Missing or empty";
    }
    return { field: r.field, ok, required: r.required !== false, message };
  });
  const errors = checks.filter((c) => !c.ok && c.required).length;
  const warnings = checks.filter((c) => !c.ok && !c.required).length;
  return { valid: errors === 0, errors, warnings, checks };
}

export function validateOrganization(data: Json = buildOrganization()): ValidationResult {
  return run(data, [
    { field: "@context" },
    { field: "@type" },
    { field: "name" },
    { field: "url", kind: "url" },
    { field: "logo", kind: "url" },
    { field: "image", kind: "url" },
    { field: "description" },
    { field: "telephone" },
    { field: "email" },
    { field: "address", kind: "object" },
    { field: "address.addressCountry" },
    { field: "areaServed", kind: "object" },
    { field: "founder", kind: "object", required: false },
    { field: "openingHours", required: false },
    { field: "contactPoint", kind: "object", required: false },
  ]);
}

export function validatePerson(data: Json = buildPerson()): ValidationResult {
  return run(data, [
    { field: "@context" },
    { field: "@type" },
    { field: "name" },
    { field: "jobTitle" },
    { field: "url", kind: "url" },
    { field: "image", kind: "url" },
    { field: "description", required: false },
    { field: "worksFor", kind: "object" },
    { field: "worksFor.name" },
    { field: "worksFor.url", kind: "url" },
    { field: "nationality", kind: "object", required: false },
  ]);
}

export function validateAboutPage(data: Json = buildAboutPage()): ValidationResult {
  return run(data, [
    { field: "@context" },
    { field: "@type" },
    { field: "name" },
    { field: "url", kind: "url" },
    { field: "description" },
    { field: "mainEntity", kind: "object" },
  ]);
}

/** All About/CEO structured-data blocks with their automated check results. */
export function auditStructuredData() {
  const org = buildOrganization();
  const person = buildPerson();
  const about = buildAboutPage();
  return [
    { key: "organization", label: "Organization (RealEstateAgent)", page: "/about-us", data: org, result: validateOrganization(org) },
    { key: "aboutpage", label: "AboutPage", page: "/about-us", data: about, result: validateAboutPage(about) },
    { key: "person", label: "Person (Kennedy Mutua)", page: "/team/kennedy-mutua", data: person, result: validatePerson(person) },
  ];
}
