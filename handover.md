# Classphere - Developer Handover Notes

## 🟢 What Work Is Done

### 1. Student Onboarding & Auth Fixes
- **Single Student Creation**: Added a new UI form on the `/institute/students` page allowing admins to create a single student by inputting Name, Phone, DOB, and Batch.
- **Shadow Email Generation**: Fixed a critical 500 error during student creation. The backend now properly generates the student's shadow email (`phone_dob@institute_slug.classphere.com`) before insertion.
- **Foreign Key Constraint Fix**: Updated the student creation and CSV import flows to explicitly create the user in Supabase Auth via `supabaseAdmin.auth.admin.createUser` *before* inserting them into `public.users`. This resolves the `users_id_fkey` constraint violation.
- **Login Auto-Resolver**: Updated the global login page logic (`/login`). If an institute hasn't set up a custom subdomain yet (i.e. `subdomain_slug` is `null`), the system now gracefully falls back to `"unknown"`, preventing an "Invalid Credentials" block. 
- **Database Cleanup**: Ran a manual cleanup script (`fix-user.js`) to correct malformed shadow emails in the database caused by the earlier bug.

### 2. Test Engine Auth (`401 Unauthorized`)
- **API Client Refactor**: Fixed a major bug where students were getting a `401 Unauthorized` API error when trying to load or submit a test on `/test/[id]`. The page was using standard `fetch()` which was missing the `x-session-token` header. 
- Refactored the test page to use the centralized `apiClient.get` and `apiClient.post` wrappers. This guarantees that both the Bearer token and the `x-session-token` (required for one-device login enforcement) are sent on every request.

### 3. UI Cleanup & Legacy Code Removal
- **PYQ Routes**: Removed the outdated `/pyqs` fetching logic and demo fallbacks from the test engine.
- Stripped out all lingering "Back to PYQs" buttons from error states and the test results page (now correctly pointing back to the Dashboard).

### 4. Build Environment
- Fixed the `Module not found: Can't resolve './lib/svg.js'` build error related to ESM packages (`rehype-raw`, etc.).
- Cleaned up orphaned Node processes that were blocking port 3000.

---

## 🟡 What Is Remaining / Needs Attention

1. **Subdomain Slugs for Institutes**
   - Currently, the `institutes` table has `null` for `subdomain_slug` across the board. The system currently falls back to `unknown` for shadow emails. 
   - **Action item**: Create a flow to assign and enforce unique `subdomain_slug` values for each institute so that tenant isolation and URLs work correctly.

2. **Markdown Table Rendering**
   - Since we removed certain ESM packages to fix the frontend build, we need to ensure that our custom `MarkdownRenderer` can still safely parse and render HTML tables (especially for complex Physics/Chemistry questions). 
   - **Action item**: Verify table rendering on questions and add a lightweight, compatible markdown-table parser if necessary.

3. **Cleanup Temporary Scripts**
   - The `apps/api/fix-user.js` script was created as a quick patch for the database. It can be safely deleted now.

4. **Review Test Submit Edge Cases**
   - The test submission now correctly uses `apiClient.post`. Ensure that slow network connections or double-clicks on the "Submit" button don't trigger duplicate submissions. (Consider adding a strict loading overlay).
