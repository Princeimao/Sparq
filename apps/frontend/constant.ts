import {
  LucideIcon,
  Blocks,
  Workflow,
  Contact,
  ShoppingBag,
  Home,
  Calendar,
  MessageSquareCode,
  Zap,
  Globe,
  ShieldCheck,
  Users,
  MessageSquare,
  BarChart3,
  ArrowDownUp,
  BellRing,
  RotateCw,
  Tag,
  LayoutGrid,
  FormInput,
  Diamond,
  CirclePlay,
  Route,
} from "lucide-react";
import { useWhatsAppConnect } from "./hooks/integration";

export type NavigationSection = {
  title: string;
  href: string;
  isActive?: boolean;
};


export const navigationData: NavigationSection[] = [
  {
    title: "About us",
    href: "/about",
  },
  {
    title: "Terms",
    href: "/terms",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
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

export const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Sparq ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Service. These Terms apply to all users including businesses, merchants, and developers who access our platform.`,
  },
  {
    title: "2. Description of Service",
    content: `Sparq provides a SaaS platform that enables businesses to automate customer communication via WhatsApp, manage orders, appointments, reservations, and integrate payment gateways including Stripe and Razorpay. The Service connects to the Meta WhatsApp Business Cloud API using your own WABA (WhatsApp Business Account).`,
  },
  {
    title: "3. Account Registration",
    content: `You must register for an account using Google OAuth to access protected features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately upon becoming aware of any unauthorized use.`,
  },
  {
    title: "4. WhatsApp & Meta Platform Compliance",
    content: `Your use of the Service is also governed by Meta's Business Policies and WhatsApp Business Platform Terms. You are solely responsible for ensuring your messages, flows, and automations comply with Meta's guidelines. Sparq is not responsible for account suspensions or restrictions imposed by Meta.`,
  },
  {
    title: "5. Payment & Billing",
    content: `Subscription fees are billed monthly or annually as selected. All fees are non-refundable except as required by law. We reserve the right to modify pricing with 30 days' notice. Delinquent accounts may be suspended or terminated. Payment processing is handled by third-party providers; their terms also apply.`,
  },
  {
    title: "6. Data & Privacy",
    content: `Your use of the Service is also governed by our Privacy Policy. You retain ownership of all customer data you process through the platform. You grant Sparq a limited license to process this data solely for the purpose of providing the Service. We implement industry-standard encryption and access controls.`,
  },
  {
    title: "7. Prohibited Uses",
    content: `You may not use the Service to: (a) send spam or unsolicited messages; (b) violate Meta's messaging policies; (c) transmit malicious code; (d) impersonate any person or entity; (e) engage in any activity that violates applicable laws or regulations; (f) resell the Service without written authorization.`,
  },
  {
    title: "8. Intellectual Property",
    content: `The Service and its original content, features, and functionality are owned by Sparq and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without prior written consent.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the maximum extent permitted by applicable law, Sparq shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, goodwill, or business interruption, even if Sparq has been advised of the possibility of such damages.`,
  },
  {
    title: "10. Termination",
    content: `We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive.`,
  },
  {
    title: "11. Changes to Terms",
    content: `We reserve the right to modify or replace these Terms at any time. Material changes will be notified via email or a prominent notice on our Service. Your continued use of the Service after any changes constitutes acceptance of the new Terms.`,
  },
  {
    title: "12. Governing Law",
    content: `These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Mumbai, Maharashtra, India.`,
  },
  {
    title: "13. Contact",
    content: `If you have any questions about these Terms, please contact us at support@sparq.app or write to us at our registered office address.`,
  },
];

export const PRIVACY_SECTION = [
  {
    title: "1. Introduction",
    content: `Sparq ("we", "our", or "the Service") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect information when you use our WhatsApp automation platform. By accessing or using Sparq, you agree to the practices described in this policy.`,
  },
  {
    title: "2. Information We Collect",
    content: `We collect information necessary to provide and improve our Service, including account information such as your name, email address, and authentication details provided through Google OAuth. We may also collect business information, WhatsApp Business Account details, customer communication data, usage information, device information, and technical logs.`,
  },
  {
    title: "3. WhatsApp & Customer Data",
    content: `Sparq enables businesses to automate communication through the Meta WhatsApp Business Cloud API. Businesses using Sparq may process customer information such as phone numbers, messages, orders, appointments, and conversations. Businesses remain responsible for ensuring they have appropriate permissions and comply with applicable privacy laws and Meta policies.`,
  },
  {
    title: "4. How We Use Your Information",
    content: `We use collected information to:
    
• Provide, operate, and maintain the Sparq platform.
• Enable WhatsApp automation, workflows, and integrations.
• Process subscriptions and payments.
• Improve platform performance and security.
• Provide customer support.
• Detect fraud, abuse, or unauthorized access.
• Comply with legal obligations.`,
  },
  {
    title: "5. Payment Information",
    content: `Payments for Sparq subscriptions may be processed through third-party payment providers such as Stripe or Razorpay. Sparq does not directly store complete payment card information. Payment providers handle payment data according to their own privacy policies and security practices.`,
  },
  {
    title: "6. Third-Party Services",
    content: `Sparq integrates with third-party services including Meta WhatsApp Business Cloud API, Google OAuth, analytics providers, and payment processors. These services may process information according to their own privacy policies and terms.`,
  },
  {
    title: "7. Data Ownership & Processing",
    content: `You retain ownership of the data you submit or process through Sparq. We only process your information as necessary to provide the Service, maintain platform functionality, improve reliability, and provide support. We do not sell your personal information to third parties.`,
  },
  {
    title: "8. Data Security",
    content: `We implement reasonable technical and organizational security measures designed to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no internet-based service can guarantee complete security.`,
  },
  {
    title: "9. Data Retention & Deletion",
    content: `We retain information only for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce agreements. You may request deletion of your account or personal information by contacting us.`,
  },
  {
    title: "10. Cookies & Tracking Technologies",
    content: `We may use cookies and similar technologies to maintain sessions, remember preferences, analyze usage, and improve the Sparq experience. You can control cookie settings through your browser, although disabling cookies may affect some functionality.`,
  },
  {
    title: "11. Your Rights",
    content: `Depending on applicable laws, you may have rights to access, update, correct, export, or request deletion of your personal information. You may also withdraw consent where applicable by contacting us.`,
  },
  {
    title: "12. Children's Privacy",
    content: `Sparq is intended for businesses and users who meet applicable legal age requirements. We do not knowingly collect personal information from children.`,
  },
  {
    title: "13. Changes to This Privacy Policy",
    content: `We may update this Privacy Policy periodically. Any material changes will be communicated through the Service or other appropriate channels. Continued use of Sparq after updates means you accept the revised policy.`,
  },
  {
    title: "14. Contact Us",
    content: `If you have questions about this Privacy Policy or how we handle your information, please contact us at support@sparq.app.`,
  },
];

export const values = [
  {
    icon: Zap,
    title: "Speed at Scale",
    description:
      "We believe automation should feel instant. Every feature is built to handle thousands of conversations without ever slowing down.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "Your customers' data is encrypted, and never shared. We comply with GDPR, DPDP, and Meta's data policies.",
  },
  {
    icon: Globe,
    title: "Built for India & Beyond",
    description:
      "Razorpay, INR billing, and multi-language support are first-class citizens — not afterthoughts.",
  },
  {
    icon: Users,
    title: "Customer Obsessed",
    description:
      "Our support team responds within hours, not days. We treat every business like our only customer.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Native",
    description:
      "We don't wrap third-party chatbots. We integrate directly with Meta's Cloud API so every message is reliable and on-brand.",
  },
  {
    icon: BarChart3,
    title: "Data Driven Growth",
    description:
      "Every order, appointment, and reservation feeds your analytics dashboard so you always know what's working.",
  },
];

export const featureData = [
  {
    icon: MessageSquare,
    content:
      "Connect Meta WhatsApp Cloud API directly for instant, 99.9% reliable customer messaging.",
  },
  {
    icon: Workflow,
    content:
      "Design drag-and-drop conversational bot flows that capture leads and answer FAQs 24/7.",
  },
  {
    icon: Calendar,
    content:
      "Automate appointment bookings synced in real-time with Google Calendar and Cal.com.",
  },
  {
    icon: Tag,
    content:
      "Accept payments seamlessly with Razorpay & Stripe integration directly inside WhatsApp chats.",
  },
];

export type Item = {
  id: string;
  title: string;
  icon: LucideIcon;
};

export const DATA: Item[] = [
  {
    id: "1",
    title: "New WhatsApp Lead Captured",
    icon: MessageSquare,
  },
  {
    id: "2",
    title: "Automated Flow Triggered",
    icon: Workflow,
  },
  {
    id: "3",
    title: "Appointment Booked in Calendar",
    icon: Calendar,
  },
  {
    id: "4",
    title: "Payment Link Sent via WhatsApp",
    icon: Tag,
  },
  {
    id: "5",
    title: "Order Catalog Synced",
    icon: ShoppingBag,
  },
  {
    id: "6",
    title: "Customer Contact Saved",
    icon: Contact,
  },
  {
    id: "7",
    title: "Real-time Analytics Updated",
    icon: BarChart3,
  },
];

export const headerFeatures = [
  {
    title: "Automated Flow Builder",
    description: "Design visual drag-and-drop conversational bot flows without coding.",
    href: "/flows",
    icon: Workflow,
  },
  {
    title: "WhatsApp Cloud API",
    description: "Official Meta Cloud API integration with zero messaging latency.",
    href: "/integrations",
    icon: MessageSquare,
  },
  {
    title: "Appointment Booking",
    description: "Automate calendar scheduling with Google Calendar & Cal.com.",
    href: "/calendar",
    icon: Calendar,
  },
  {
    title: "Order & Catalog Manager",
    description: "Showcase products, process cart orders, and collect payments.",
    href: "/products",
    icon: ShoppingBag,
  },
];

export const headerIntegrations = [
  {
    title: "Meta WhatsApp Cloud API",
    description: "Official Meta business account connection",
    href: "/integrations",
    icon: MessageSquare,
  },
  {
    title: "Google Calendar",
    description: "Real-time 2-way appointment synchronization",
    href: "/integrations",
    icon: Calendar,
  },
  {
    title: "Cal.com",
    description: "Open-source scheduling integration",
    href: "/integrations",
    icon: Calendar,
  },
  {
    title: "Payment Gateways",
    description: "Razorpay & Stripe automated payment links",
    href: "/integrations",
    icon: Tag,
  },
];

export const headerResources = [
  {
    title: "About Sparq",
    description: "Learn about our vision, team, and platform architecture.",
    href: "/about",
  },
  {
    title: "Pricing Plans",
    description: "Transparent monthly & annual subscription plans.",
    href: "/pricing",
  },
  {
    title: "Terms of Service",
    description: "Legal terms governing platform usage and compliance.",
    href: "/terms",
  },
  {
    title: "Privacy Policy",
    description: "Data security, encryption, and Meta policy compliance.",
    href: "/privacy-policy",
  },
];