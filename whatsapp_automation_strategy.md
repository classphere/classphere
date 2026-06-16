# ExamPrep: Free WhatsApp Automation Strategy (B2B)

## 1. Executive Summary & Business Logic

Indian parents expect immediate WhatsApp notifications for test results and attendance. However, paying for the Official Meta WhatsApp API (₹0.11 to ₹0.30 per message) ruins profit margins for SaaS platforms serving low-cost coaching institutes.

**The Solution:** We will build a BYON (Bring Your Own Number) WhatsApp Web Automation module. 
Instead of ExamPrep paying for a centralized API, the Institute Director logs into our dashboard, scans a WhatsApp Web QR code using the coaching center's official phone, and our server sends messages automatically *through their device*.

**Why this wins B2B deals:**
1. **Zero Marginal Cost:** Free for us, free for the institute.
2. **High Trust:** Parents receive messages from the institute's official phone number (which they already have saved), not a random cloud API number.
3. **Risk Delegation:** If WhatsApp blocks the number for spamming, the institute's number gets banned, not ExamPrep's core domain/infrastructure.

---

## 2. Technical Architecture

We will run a dedicated microservice for WhatsApp messaging to ensure it doesn't block the main API event loop.

### Core Stack
*   **Library:** `whatsapp-web.js` (or `baileys`)
*   **Runtime:** Node.js Microservice
*   **State Storage:** Redis (for queuing messages) & MongoDB (for saving WhatsApp Session Tokens so they don't have to scan the QR code every day).

### The UI Flow (Institute Dashboard)
1. **Settings > Integrations > WhatsApp**
2. Director clicks "Connect Phone".
3. Frontend requests a QR Code from our Node microservice.
4. Microservice spins up a headless Chromium instance, gets the QR code, and streams it to the frontend via WebSockets.
5. Director scans the QR code with their phone.
6. Server captures the session auth token, encrypts it, and saves it to the DB. Status changes to "Connected: +91 98765 43210".

### The Messaging Flow (Triggered upon Admin Publish)
1. The Admin reviews the batch analysis and clicks "Publish Results".
2. The main API pushes a job to Redis for each student: `send_result_whatsapp(student_id, attempt_id)`.
3. The WhatsApp microservice picks up the job.
4. It formats the message: *"Dear Parent, Rahul scored 120/300 in NEET Mock 4. Weakest topic: Thermodynamics. View full AI report here: [Link]"*
5. The headless WhatsApp client sends the message.

---

## 3. Anti-Ban Safety Mechanisms (CRITICAL)

WhatsApp aggressively bans numbers that exhibit "bot-like" behavior. Since the institute relies on this phone number, we must implement strict safety guards in our code:

### A. Rate Limiting (The "Human" Delay)
WhatsApp monitors outbound velocity. We use BullMQ's native rate limiter to throttle the queue:
*   **Rate Limiting:** Enforce a strict queue limit of 1 message every 5 seconds. A batch of 500 students will process completely and safely in under an hour.
*   **Batching:** (Optional) Pause the queue for 5 minutes after every 100 messages, then resume.

### B. "Typing..." Simulation
Use the library's built-in presence features to simulate human interaction.
```typescript
await chat.sendStateTyping();
await new Promise(resolve => setTimeout(resolve, 2000)); // Type for 2 seconds
await client.sendMessage(phone, message);
```

### C. The "Save This Number" Mandate
The #1 reason for WhatsApp bans is when recipients click "Report Spam".
*   In the B2B onboarding, we explicitly instruct the institute: *"You MUST have parents save your phone number in their contacts before adding them to the platform."*
*   WhatsApp almost never bans a sender if the recipient has the number saved.

### D. Message Spintax (Variations)
Sending the exact same string of text 500 times triggers spam filters. Introduce slight variations (Spintax) to the template:
*   *Variation 1:* "Dear Parent, [Name]'s result for..."
*   *Variation 2:* "Hello! The result for [Name] is ready..."
*   *Variation 3:* "Hi, [Name] has completed the test..."
Randomly select a greeting for each message.

---

## 4. Required Implementation Steps

1. **Create the Microservice:** Initialize a new package/app in the monorepo (`apps/whatsapp-worker`).
2. **Puppeteer Dependency:** Ensure the deployment environment (Docker/VPS) has the necessary Chromium dependencies installed to run `whatsapp-web.js`.
3. **Queue Setup:** Implement BullMQ / Redis for reliable message queuing.
4. **Auth Persistence:** Implement logic to store the WhatsApp `clientId` and session data to avoid requiring a daily QR scan.
