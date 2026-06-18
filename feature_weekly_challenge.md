# Feature Proposal: Weekly Gamified Challenge (Effort Leaderboard)

**Status:** Architecture Blueprint
**Objective:** Drive daily active usage (DAU) and volume of practice by creating a visible, weekly competitive loop based on *effort* rather than *accuracy*.

---

## 1. The Core Concept
While standard leaderboards rank students by their test scores and percentiles, this can sometimes discourage lower-performing students. 

The **Weekly Challenge** is an *Effort Leaderboard*. It ranks students strictly by the **Volume of Questions Solved** throughout the week, regardless of whether they were in a mock test, a booster test, or the pattern recognition trainer. 

This triggers a different psychological loop: *"I might not be the smartest in my batch yet, but I can definitely out-work them."*

## 2. Feature Specifications

### 2.1 The Rules
*   **Metric:** Total number of questions submitted (must spend at least >10 seconds on a question for it to count, to prevent spamming random clicks).
*   **Scope:** Batch-level and Institute-level visibility.
*   **Reset:** The leaderboard resets every Sunday at 11:59 PM.
*   **Reward:** The top 3 students get a special "Weekly Champion" badge that stays on their permanent profile.

### 2.2 The UI/UX (Student Dashboard Integration)
*   **The Widget:** A live, scrolling widget on the right side of the student dashboard.
*   **Visuals:** 
    *   `#1 Rahul - 450 Qs` 🔥
    *   `#2 Sneha - 412 Qs`
    *   `...`
    *   `#14 You - 120 Qs (30 Qs behind #13)`
*   **The Hook:** By showing exactly how many questions they need to solve to overtake the person directly above them, it creates micro-goals.

### 2.3 Backend Implementation (Redis)
This is extremely cheap and easy to build using our existing Redis infrastructure.
*   We use a Redis **Sorted Set**: `ZINCRBY weekly_challenge:{batch_id} 1 {student_id}`
*   Every time a student submits an answer, we increment their score by 1 in Redis.
*   Fetching the leaderboard is a lightning-fast `ZREVRANGE` command.
*   A cron job automatically deletes the Redis key every Sunday at midnight, organically resetting the board.

---

## 3. Why This Works (The "Strava for EdTech" Effect)
By making competition highly visible, you are tapping into peer pressure as a positive reinforcement tool. If a student logs in and sees their friend solved 100 questions today while they solved 0, the anxiety of falling behind will force them to start a practice session. 

This feature perfectly complements the "Booster Tests" and "Pattern Trainer" by giving students a reason to keep clicking "Start Next Test".
