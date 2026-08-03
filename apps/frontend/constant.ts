import { NavigationSection } from "@/components/header";
import {
  AlignStartVertical,
  CreditCard,
  LayoutPanelTop,
  ChartPie,
  BarChart3,
  CircleUserRound,
  ClipboardList,
  Languages,
  LucideIcon,
  Notebook,
  NotepadText,
  Table,
  Ticket,
  Calendar1,
  Blocks,
  Workflow,
  Contact,
  ShoppingBag,
  Home,
  Calendar,
  MessageSquareCode,
} from "lucide-react";
import { useWhatsAppConnect } from "./hooks/integration";

export const navigationData: NavigationSection[] = [
  {
    title: "About us",
    href: "/about",
  },
  {
    title: "Services",
    href: "/services",
  },
  {
    title: "Team",
    href: "/team",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
];

export const pricingData: PricingPlan[] = [
  {
    plan_name: "Pro",
    plan_descp:
      "Launch your website faster with ready-to-use components, blocks and zero setup friction with us.",
    plan_price: 2500,
    plan_feature: [
      "Access to all core Shadcn UI blocks",
      "Copy-paste ready React code",
      "Regular library updates",
      "Commercial use license",
      "Community support & documentation",
    ],
    plan_recommended: false,
  },
  {
    plan_name: "Pro Plus",
    plan_descp:
      "Scale with confidence using premium blocks, templates, and included strategy guidance.",
    plan_price: 3800,
    plan_feature: [
      "Everything in Pro",
      "Premium templates & more sections",
      "Early access to new components",
      "Private Discord & priority support",
      "Monthly strategy & growth sessions",
    ],
    plan_recommended: true,
  },
  {
    plan_name: "Enterprise",
    plan_descp:
      "Build at scale with full access, priority support, and dedicated one-on-one strategy calls.",
    plan_price: 5000,
    plan_feature: [
      "Everything in Pro Plus",
      "Unlimited team seats",
      "Dedicated UI & integration support",
      "Custom component requests",
      "One-on-one implementation",
    ],
    plan_recommended: false,
  },
];

type PricingPlan = {
  plan_name: string;
  plan_descp: string;
  plan_price: number;
  plan_feature: string[];
  plan_recommended: boolean;
};

export const FAQ_DATA = [
  {
    question: "How does the yearly discount work?",
    answer:
      "When you choose the yearly billing cycle, you receive a 28% discount compared to monthly billing. The Normal plan becomes ₹359/month (billed ₹4,311 annually), and the Pro plan becomes ₹719/month (billed ₹8,631 annually).",
  },
  {
    question: "Can I upgrade or downgrade my plan at any time?",
    answer:
      "Yes, you can easily change your subscription tier or cancel your plan at any time from Billing settings.",
  },
  {
    question: "Do you provide WhatsApp numbers?",
    answer:
      "No, we do not sell WhatsApp phone numbers. You connect your own Meta WhatsApp Business Account via our secure Facebook login flow.",
  },
  {
    question: "Are there any hidden fees?",
    answer:
      "None. Meta charges for WhatsApp conversation packages, but our platform service has zero hidden processing fees. Stripe transaction fees are standard.",
  },
];

export const PLANS_DATA = [
  {
    description: "Perfect for testing and small operations starting out.",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Standard repeat order tracking",
      "Basic WhatsApp setup",
      "Community support",
    ],
    notIncluded: [
      "Email automation",
      "Custom automation rules",
      "Employee invitation option",
    ],
    recommended: false,
    cta: "Start Free",
  },
  {
    name: "Normal",
    description: "Ideal for growing brands scaling repeat customer orders.",
    price: 499,
    yearlyPrice: 359,
    yearlyBilledAmount: 4311,
    features: [
      "Email automation",
      "Custom automation rules",
      "Employee invitation option",
      "WhatsApp Business Cloud API connection",
      "Standard support (24h)",
    ],
    notIncluded: [],
    recommended: true,
    cta: "Get Started",
  },
  {
    name: "Pro",
    description: "For high-volume enterprises needing ultimate scalability.",
    price: 999,
    yearlyPrice: 719,
    yearlyBilledAmount: 8631,
    features: [
      "Email automation",
      "Custom automation rules",
      "Employee invitation option",
      "WhatsApp Business Cloud API connection",
      "Priority 24/7 dedicated support",
      "Custom billing & invoicing",
    ],
    notIncluded: [],
    recommended: false,
    cta: "Go Pro",
  },
];

export const comparisonData = {
  workspace: [
    {
      feature: "Team Members Invitation",
      free: false,
      normal: true,
      pro: true,
    },
    {
      feature: "Workspace Analytics Dashboard",
      free: "Basic",
      normal: "Full",
      pro: "Advanced",
    },
  ],
  automation: [
    { feature: "Email Automation", free: false, normal: true, pro: true },
    {
      feature: "Custom Automation Rules",
      free: false,
      normal: true,
      pro: true,
    },
    {
      feature: "Campaign Scheduling & Cron Jobs",
      free: "Standard Only",
      normal: "Flexible Scheduler",
      pro: "Real-time & Flex",
    },
    {
      feature: "Smart State-Machine Flow",
      free: "Linear Only",
      normal: "Configurable",
      pro: "Custom Dialogues",
    },
  ],
  integration: [
    {
      feature: "WhatsApp Cloud API Integration",
      free: "Simulated Webhooks",
      normal: "Direct Meta Cloud API",
      pro: "Direct Meta Cloud API",
    },
    { feature: "Stripe Payment Links", free: false, normal: true, pro: true },
    {
      feature: "API Access",
      free: false,
      normal: "Standard",
      pro: "High Rate-Limit",
    },
  ],
};

export const footerLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQs", href: "/#faq" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "WhatsApp Flows", href: "/flows" },
  { label: "Contact", href: "mailto:support@sparq.app" },
];

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: LucideIcon;
  href?: string;
  children?: NavItem[];
  isActive?: boolean;
};

export const navData: NavItem[] = [
  { label: "APPS", isSection: true },
  { title: "Dashboard", icon: Home, href: "dashboard" },
  { title: "Calendar", icon: Calendar, href: "calendar" },
  { title: "Integrations", icon: Blocks, href: "integrations" },
  { title: "WhatsApp Flows", icon: MessageSquareCode, href: "flows" },
  { title: "Workflows", icon: Workflow, href: "workflows" },
  { title: "Customers", icon: Contact, href: "customers" },
  { title: "Products", icon: ShoppingBag, href: "products" },
];

export const integrations = [
  {
    name: "WhatsApp",
    description: "Send messages and automate work",
    icon: "/whatsap.png",
    onClick: useWhatsAppConnect,
  },

  {
    name: "Stripe",
    description: "Accept payments and manage billing",
    icon: "/stripe.png",
  },

  {
    name: "Razorpay",
    description: "Payment gateway integration",
    icon: "/razorpay.png",
  },

  {
    name: "Google Calendar",
    description: "Sync events and availability",
    icon: "/calendar.png",
  },

  {
    name: "Cal.com",
    description: "Calendar booking synchronization",
    icon: "/cal.png",
  },

  {
    name: "WooCommerce",
    description: "Sync products and orders",
    icon: "/woo.jpg",
  },
];
