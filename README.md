# Sparq

> Turn your WhatsApp Business account into a revenue machine.

Sparq is a WhatsApp automation platform built on the **Meta WhatsApp Cloud API** that helps businesses automate bookings, orders, payments, customer support, and follow-ups. Instead of manually handling every customer conversation, Sparq enables businesses to build intelligent workflows that operate 24/7.

Trusted by businesses across India & Southeast Asia, Sparq combines a modern web dashboard with a scalable backend architecture capable of processing millions of WhatsApp events reliably.

---

##  Features

-  Official WhatsApp Cloud API integration
-  Visual workflow automation
-  Appointment booking with Google Calendar & Cal.com
-  Stripe & Razorpay payment integration
-  WooCommerce integration
-  Analytics dashboard
-  Automated reminders & follow-ups
-  Multi-language conversations
- Secure & scalable architecture

---

# Monorepo Structure

This project uses **Turborepo** to manage multiple applications and shared packages.

```
sparq/
│
├── apps/
│   ├── api/          # Backend REST API
│   ├── worker/       # Background workers & queue processors
│   └── web/          # Next.js frontend
│
├── packages/
│   ├── database/
│   ├── shared/
│
├── turbo.json
├── package.json
└── README.md
```

---

# Applications

## 🌐 Web

The customer dashboard built with **Next.js**.

Features:

- Authentication
- Dashboard
- Workflow Builder
- Analytics
- Billing
- Integrations

---

## 🚀 API

Backend responsible for:

- Authentication
- User Management
- Workspace Management
- Workflow CRUD
- Webhook Handling
- WhatsApp Cloud API
- Calendar Integration
- Payment Integration
- Queue Scheduling
- Analytics
- Notifications

---

## ⚙️ Worker

Background processing service responsible for:

- Sending WhatsApp messages
- Executing automation workflows
- Delayed messages
- Retry handling
- Payment callbacks
- Appointment reminders

The worker is completely isolated from the API, allowing horizontal scaling under heavy workloads.

---

# Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Node.js
- Express
- TypeScript

## Queue System

- BullMQ
- Redis

## Database

- PostgreSQL
- Prisma ORM

## Integrations

- Meta WhatsApp Cloud API
- Google Calendar
- Cal.com
- Stripe
- Razorpay
- WooCommerce

---

# Architecture

```
                    Business Owner
                           │
                           ▼
                  Next.js Dashboard
                           │
                           ▼
                        API Server
                           │
          Stores Workflows, Settings & Bots
                           │
                           ▼
                      PostgreSQL


────────────────────────────────────────────────────────────


                      Customer
                           │
                           ▼
                    WhatsApp Message
                           │
                           ▼
                Meta WhatsApp Cloud API
                           │
                           ▼
                 WhatsApp Webhook Server
                           │
                           ▼
                    BullMQ Queue (Redis)
                           │
                           ▼
                   Background Worker
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Intent Detection   User Validation   Workflow Engine
        │                  │                  │
        ▼                  ▼                  ▼
   Greeting?         Existing User?     Booking Flow?
   Appointment?      New User?          Order Flow?
   Payment?
                           │
                           ▼
          Missing Required Information?
                           │
                 Yes ───────────────► Send WhatsApp Flow
                           │
                           ▼
                Structured Form Response
                           │
                           ▼
                  Save User Information
                           │
                           ▼
                  Generate Payment Link
                           │
                           ▼
                Stripe / Razorpay Payment
                           │
                           ▼
                Payment Webhook Received
                           │
                           ▼
                Generate Booking / Order
                           │
                           ▼
             Send Receipt & Confirmation
                           │
                           ▼
                  WhatsApp Cloud API
                           │
                           ▼
                       Customer
```

---

# Installation

Clone the repository.

```bash
git clone https://github.com/princeimao/sparq.git

cd sparq
```

Install dependencies.

```bash
npm install
```

---

# Running Development

Start everything:

```bash
npm run dev
```

# Building

```bash
npm run build
```

---

# Running Production

```bash
npm run start
```

---

# Scripts

| Command | Description |
|----------|-------------|
| `npm run dev` | Start all apps |
| `npm run build` | Build the monorepo |
| `npm run lint` | Run ESLint |
| `npm run check-type` | Type check |

---

# Scalability

Sparq is designed to scale horizontally.

You can independently scale:

- API servers
- Worker instances
- Redis
- PostgreSQL
- Next.js frontend

Multiple workers can consume the same BullMQ queues simultaneously, enabling high-throughput message processing.

---

# Security

- JWT Authentication
- Password hashing
- Webhook verification
- Meta signature validation
- Secure payment integrations
- Environment-based secrets

---

# Contributing

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "feat: add awesome feature"
```

4. Push

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

---

# License

This project is licensed under the MIT License.

---

## Built with ❤️ using

- Next.js
- TypeScript
- Turborepo
- BullMQ
- Redis
- PostgreSQL
- Prisma
- WhatsApp Cloud API
