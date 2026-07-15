import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import p5 from "@/assets/p5.jpg";
import p6 from "@/assets/p6.jpg";

export type Category = "For Sale" | "For Rent" | "For Lease";
export type PropertyType =
  | "Land / Plots" | "Houses" | "Apartments" | "Airbnbs"
  | "Commercial" | "Office Spaces" | "Shops" | "Warehouses"
  | "Farms" | "Holiday Homes";

export interface Property {
  id: string;
  title: string;
  price: number;
  priceSuffix?: string;
  category: Category;
  type: PropertyType;
  county: string;
  town: string;
  area: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  image: string;
  featured?: boolean;
  description: string;
  features: string[];
  amenities: string[];
}

export const counties = ["Nairobi","Kiambu","Kajiado","Machakos","Mombasa"];
export const locations = [
  { name: "Nairobi", count: 128, img: p2 },
  { name: "Kiambu", count: 64, img: p1 },
  { name: "Kitengela", count: 42, img: p4 },
  { name: "Syokimau", count: 31, img: p2 },
  { name: "Ngong", count: 28, img: p3 },
  { name: "Juja", count: 22, img: p1 },
  { name: "Mombasa", count: 37, img: p6 },
  { name: "Machakos", count: 19, img: p3 },
];

export const properties: Property[] = [
  {
    id: "fx-001",
    title: "Modern 4BR Villa with Pool",
    price: 42000000, category: "For Sale", type: "Houses",
    county: "Kajiado", town: "Kitengela", area: "Acacia",
    bedrooms: 4, bathrooms: 3, size: "3,200 sq ft",
    image: p4, featured: true,
    description: "A stunning modern villa featuring an infinity pool, spacious living areas and premium finishes throughout. Perfect for family living in a serene gated community.",
    features: ["Swimming Pool","Garden","Balcony","Parking","CCTV","Electric Fence"],
    amenities: ["Wi-Fi","Water Supply","Electricity","24/7 Security"],
  },
  {
    id: "fx-002",
    title: "Bright 2BR Apartment in Westlands",
    price: 95000, priceSuffix: "/mo", category: "For Rent", type: "Apartments",
    county: "Nairobi", town: "Nairobi", area: "Westlands",
    bedrooms: 2, bathrooms: 2, size: "1,150 sq ft",
    image: p2, featured: true,
    description: "Contemporary two-bedroom apartment with panoramic city views, high-speed internet and easy access to top restaurants and offices.",
    features: ["Balcony","Parking","CCTV","Furnished"],
    amenities: ["Wi-Fi","Water Supply","Backup Power","Gym"],
  },
  {
    id: "fx-003",
    title: "1/4 Acre Prime Plot",
    price: 3500000, category: "For Sale", type: "Land / Plots",
    county: "Kajiado", town: "Isinya", area: "Kisaju",
    bedrooms: 0, bathrooms: 0, size: "1/4 Acre",
    image: p3, featured: true,
    description: "Ready title deed plot in a fast growing area, ideal for residential or investment. Tarmac access, water and electricity nearby.",
    features: ["Ready Title","Fenced","Road Access"],
    amenities: ["Water","Electricity"],
  },
  {
    id: "fx-004",
    title: "Executive Office Space",
    price: 220000, priceSuffix: "/mo", category: "For Lease", type: "Office Spaces",
    county: "Nairobi", town: "Nairobi", area: "Upperhill",
    bedrooms: 0, bathrooms: 2, size: "2,400 sq ft",
    image: p5, featured: true,
    description: "Grade-A office space in the heart of Upperhill with dedicated parking, backup power and high-speed fiber.",
    features: ["Parking","CCTV","Backup Power","Fiber Internet"],
    amenities: ["Reception","Lifts","24/7 Security"],
  },
  {
    id: "fx-005",
    title: "Family Home in Runda",
    price: 65000000, category: "For Sale", type: "Houses",
    county: "Nairobi", town: "Nairobi", area: "Runda",
    bedrooms: 5, bathrooms: 4, size: "4,500 sq ft",
    image: p1, featured: true,
    description: "Elegant family home on a mature 1/2 acre garden. Spacious rooms, DSQ and a heated pool in a secure Runda neighbourhood.",
    features: ["Swimming Pool","Garden","DSQ","Electric Fence","CCTV"],
    amenities: ["Wi-Fi","Water Supply","Backup Power","Security"],
  },
  {
    id: "fx-006",
    title: "Cozy Airbnb Cottage",
    price: 6500, priceSuffix: "/night", category: "For Rent", type: "Airbnbs",
    county: "Nairobi", town: "Nairobi", area: "Karen",
    bedrooms: 1, bathrooms: 1, size: "650 sq ft",
    image: p6, featured: true,
    description: "Charming fully-furnished cottage in leafy Karen. Perfect for short stays with fast Wi-Fi and a cozy garden.",
    features: ["Furnished","Wi-Fi","Garden","Parking"],
    amenities: ["Netflix","Kitchen","Hot Water"],
  },
];

export const testimonials = [
  { name: "Mercy W.", role: "Homeowner, Kitengela", quote: "Foxwood made buying my first home effortless. The agent was patient and honest — I felt guided every step." },
  { name: "James O.", role: "Investor, Nairobi", quote: "I've bought two plots through Foxwood. Verified titles, no games. This is how real estate should feel." },
  { name: "Aisha K.", role: "Tenant, Westlands", quote: "Found my apartment in a weekend. The listings are accurate and the team responds fast." },
];

export const categoryCards = [
  { title: "Land & Plots", img: p3, type: "Land / Plots" },
  { title: "Apartments", img: p2, type: "Apartments" },
  { title: "Houses", img: p1, type: "Houses" },
  { title: "Airbnbs", img: p6, type: "Airbnbs" },
  { title: "Commercial", img: p5, type: "Commercial" },
];

export function formatKsh(n: number) {
  return "KSh " + n.toLocaleString("en-KE");
}
