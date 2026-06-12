# ExamPrep System Architecture (Production Scale)

This document outlines the high-level architecture and system design required for the ExamPrep platform to handle **100,000+ concurrent students**, particularly during high-traffic events like scheduled Mock Tests.

---

## 1. High-Level Architecture Overview

To achieve rapid iteration and simplified deployment initially, the system will be built as a **Modular Monolith**. It is designed with clean boundaries so that it can be seamlessly broken out into a **Microservices Architecture** later when scale demands it (e.g., reaching 100,000+ concurrent students).

### Core Flow
1. **Client Request**: A student accesses the Next.js frontend. Static assets are served instantly via a CDN.
2. **Load Balancer**: API requests hit a single Load Balancer / Nginx reverse proxy.
3. **Monolithic Backend**: The Load Balancer routes the request to a single Dockerized backend application which contains all isolated modules (e.g., Test Engine, User Service).
4. **Data Layer**: The monolithic service interacts with high-speed caches (Redis) and databases (PostgreSQL/MongoDB).
5. **Async Workers**: Heavy processing (like calculating global leaderboards) is still offloaded to BullMQ workers to prevent blocking the main server thread.

---

## 2. Component Breakdown

### A. Frontend Layer
* **Framework**: Next.js (React)
* **Hosting**: Vercel or AWS S3 + CloudFront (CDN)
* **Strategy**: Static Site Generation (SSG) for marketing pages and Server-Side Rendering (SSR) / Client-Side fetching for dynamic dashboards to minimize server load.

### B. API Gateway & Load Balancing
* **Ingress**: Nginx Ingress Controller (within Kubernetes) or AWS Application Load Balancer (ALB).
* **Role**: Rate limiting, SSL termination, routing API requests to the correct internal microservices, and preventing DDoS attacks (via Cloudflare or AWS WAF).

### C. Monolithic Backend (Future Microservices)
Written in Node.js (Express/NestJS) or Go, containerized using **Docker** as a single deployment unit. It contains distinct, loosely-coupled modules:
* **Auth & User Module**: Handles login, JWT generation, and profile management.
* **Test Engine Module**: The most critical module. Handles fetching questions and submitting answers.
* **Analytics & Leaderboard Module**: Calculates percentiles, weak topics, and generates rankings.
* **Doubts & Chat Module**: Uses WebSockets (Socket.io) for real-time teacher-student interaction.

*Note: When load reaches critical thresholds, these modules will be extracted into independent Microservices orchestrated by Kubernetes.*

### D. Message Queue & Background Jobs
* **BullMQ + Redis**: Used for asynchronous task processing.
  * *Why?* When 10,000 students submit a test at the exact same second, we cannot calculate their analytics synchronously. The Test Engine validates the submission and immediately pushes a job to BullMQ. 
  * Background worker nodes consume these jobs, calculate the scores/analytics, and update the database without blocking the API.

### E. Database & Caching Layer
* **Primary SQL (PostgreSQL)**: Stores structured, relational data (Users, Transactions, Subscriptions, Batch info).
* **Document NoSQL (MongoDB)**: Stores unstructured/semi-structured data (Question Bank, massive JSON objects of student test attempts and responses).
* **In-Memory Cache (Redis)**: 
  * Caches active test questions (to prevent hitting the DB when 50,000 students request the same mock test).
  * Stores session tokens and rate-limiting counters.
  * Powers BullMQ.

---

## 3. Infrastructure & DevOps

### Docker & Containerization
Every service (Frontend, API Gateway, Microservices, Workers) is packaged into its own isolated Docker container. This ensures that the code runs identically on a developer's local machine, staging, and production environments.

### Kubernetes (K8s) Orchestration
Kubernetes is the backbone of our scaling strategy.
* **Horizontal Pod Autoscaling (HPA)**: When CPU/Memory utilization spikes (e.g., 5 minutes before a mega-mock test begins), K8s automatically spins up dozens of new "Test Engine" pods to handle the load.
* **Self-Healing**: If a backend Node crashes due to an out-of-memory error, K8s automatically restarts the pod on a healthy server.
* **Rolling Updates**: Allows us to deploy new code with zero downtime.

---

## 4. Solving the "Mega-Test" Problem (100k Concurrent Users)

**The Scenario**: 100,000 students log in at 9:55 AM for a 10:00 AM All-India Mock Test.

**How the Architecture Handles It:**
1. **Pre-fetching via CDN**: The frontend app is already cached on the CDN.
2. **K8s Pre-scaling**: We schedule K8s to scale up the API Gateway and Test Engine pods at 9:30 AM in anticipation of the load.
3. **Redis Caching**: The 90 questions for the Mock Test are loaded into Redis. When 100,000 students click "Start Test", the DB is bypassed entirely; the questions are served instantly from Redis memory.
4. **Debounced Saves**: As students select answers (A, B, C, D), the frontend locally caches the answers and sends bulk updates to the backend every 30 seconds to reduce network requests.
5. **Async Submission (BullMQ)**: At 1:00 PM, 100,000 students hit "Submit" simultaneously. The API accepts the payload, instantly drops it into a BullMQ Redis queue, and returns a `200 OK`. The student sees "Test Submitted. Results will be available in 5 minutes." 
6. **Worker Processing**: Hundreds of background worker pods pull submissions from BullMQ, grade them against the answer key, and save the final analytics to MongoDB.

---

## 5. Observability & Monitoring
To manage a system of this size, we need deep visibility:
* **Prometheus + Grafana**: For monitoring server health, K8s pod CPU/Memory, and active HTTP requests.
* **Datadog / ELK Stack**: Centralized logging to trace bugs across microservices.
* **Sentry**: For real-time error tracking in the frontend and backend.


Cost 


1. Domain Name: $0
Benefit: The pack gives you a free .me, .tech, or .live domain name for 1 year (via Namecheap or Name.com).
Cost: $0.
2. Frontend Hosting (Next.js): $0
Benefit: You don't even need the student pack for this. You can deploy the Next.js frontend directly to Vercel on their generous free Hobby tier. It includes global CDN caching and SSL out of the box.
Cost: $0.
3. Backend Infrastructure & Kubernetes: $0
Benefit: The student pack gives you $200 in DigitalOcean credits (valid for 1 year) or $100 in Microsoft Azure credits.
Strategy: You can use DigitalOcean to host your backend. Their Managed Kubernetes (DOKS) starts at $12/month, or you can just run Docker containers on basic Droplets ($4-$6/month). Your $200 credit easily covers the server costs for the entire first year.
Cost: $0 for 12 months.
4. Databases (MongoDB & PostgreSQL): $0
MongoDB: Use MongoDB Atlas. They offer a forever-free "M0" cluster (512MB storage, shared RAM). It's more than enough for thousands of mock test submissions during early launch.
PostgreSQL: You can use Supabase (generous free tier) or spin up a Postgres instance on your free DigitalOcean droplets.
Cost: $0.
5. Caching & Message Queues (Redis + BullMQ): $0
Benefit: You can use Upstash or Redis Cloud for a serverless Redis database with a generous forever-free tier.
Cost: $0.
6. Transaction Emails (SendGrid / Mailgun): $0
Benefit: The student pack gives you heavily upgraded free limits for services like SendGrid or Mailgun to send out OTPs, password resets, and test performance reports.
Cost: $0.
7. AI / LLM APIs (Gemini / Groq / OpenAI): $0 (Initially)
Strategy: Instead of paying upfront for GPT-4, use APIs with generous free developer tiers. The Google Gemini API offers a highly capable free tier (up to 15 requests per minute). Alternatively, Groq offers blazing-fast free inference for open-source models like Llama 3, which is perfect for AI doubt-resolution bots.
Cost: $0 during launch (Pay-as-you-go only when usage exceeds free tiers).