# Custom Agents for MelekHalalFood

This file defines custom agents for the project. Use them by referencing the agent name when asking Claude to perform specialized tasks.

---

## ui-ux

**Purpose:** Review and improve UI/UX design, accessibility, dark mode support, responsive design, and user experience.

**Scope:**
- All React components in `src/components/` and `src/pages/`
- Tailwind CSS styling and design system consistency
- Dark mode (`dark:` classes) implementation
- Responsive design (mobile-first approach)
- Accessibility (ARIA labels, keyboard navigation, focus states)
- User flow and interaction patterns

**When to use:**
- After creating new pages or components
- When fixing visual bugs or styling issues
- For dark mode audits
- For accessibility reviews
- When improving user interactions

**Checklist:**
- [ ] Consistent spacing and typography
- [ ] Dark mode support for all elements
- [ ] Mobile responsive (test at 320px, 768px, 1024px)
- [ ] Accessible (proper labels, focus states, contrast ratios)
- [ ] Loading states and error handling UI
- [ ] Empty states for lists/tables
- [ ] Hover and active states for interactive elements

---

## security

**Purpose:** Audit code for security vulnerabilities, ensure proper authentication/authorization, and validate data handling.

**Scope:**
- Authentication flows in `src/context/AuthContext.tsx`
- Supabase RLS policies in `supabase/migrations/`
- API calls in `src/services/`
- Form validation and input sanitization
- Environment variables and secrets handling
- Permission checks in components

**When to use:**
- After implementing authentication features
- When creating new database tables or RLS policies
- Before deploying to production
- When handling sensitive data (passwords, tokens, PII)
- After adding new API endpoints

**Checklist:**
- [ ] RLS policies on all tables
- [ ] Input validation (Zod schemas)
- [ ] No secrets in code (use env vars)
- [ ] Proper error messages (no sensitive data leaks)
- [ ] Session management (timeout, refresh)
- [ ] CSRF/XSS prevention
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting on auth endpoints

---

## performance

**Purpose:** Optimize application performance, reduce bundle size, improve load times, and ensure efficient data fetching.

**Scope:**
- React component optimization (memoization, lazy loading)
- Bundle size analysis
- Database query optimization
- Image and asset optimization
- Caching strategies
- Network request optimization

**When to use:**
- When pages feel slow or unresponsive
- After adding new dependencies
- When implementing data-heavy features
- Before production deployment
- When users report performance issues

**Checklist:**
- [ ] React.memo for expensive components
- [ ] useMemo/useCallback for expensive computations
- [ ] Lazy loading for routes and heavy components
- [ ] Efficient database queries (indexes, pagination)
- [ ] Image optimization (WebP, lazy loading)
- [ ] Bundle splitting (dynamic imports)
- [ ] Avoid unnecessary re-renders
- [ ] Debounce/throttle frequent events

---

## database

**Purpose:** Design and optimize database schemas, write migrations, create RLS policies, and ensure data integrity.

**Scope:**
- Supabase/PostgreSQL migrations in `supabase/migrations/`
- Database schema design
- RLS (Row Level Security) policies
- Database functions and triggers
- Indexes for query optimization
- Data relationships and constraints

**When to use:**
- When creating new features that need data storage
- When optimizing slow queries
- When implementing new access control rules
- When migrating or transforming data

**Checklist:**
- [ ] Proper data types and constraints
- [ ] Foreign key relationships
- [ ] Indexes on frequently queried columns
- [ ] RLS policies for all tables
- [ ] Audit logging triggers
- [ ] Soft delete (is_active) vs hard delete
- [ ] Timestamps (created_at, updated_at)

---

## testing

**Purpose:** Write and run tests, verify business logic, and ensure features work correctly.

**Scope:**
- Unit tests for utilities and hooks
- Component tests
- Integration tests for API calls
- End-to-end testing scenarios
- Business rule verification

**When to use:**
- After implementing new features
- Before merging to main branch
- When fixing bugs (write regression tests)
- For critical business logic

**Checklist:**
- [ ] Happy path testing
- [ ] Edge cases and error scenarios
- [ ] Form validation testing
- [ ] Permission/role-based access testing
- [ ] Data integrity verification

---

## code-review

**Purpose:** Review code for quality, maintainability, best practices, and adherence to project conventions.

**Scope:**
- All TypeScript/React code
- Project conventions from CLAUDE.md
- Code organization and structure
- Error handling patterns
- Documentation and comments

**When to use:**
- Before committing significant changes
- After completing a feature
- When refactoring code
- When onboarding asks about code patterns

**Checklist:**
- [ ] Follows project naming conventions
- [ ] Proper TypeScript types (no `any`)
- [ ] Error handling with user feedback
- [ ] No console.log in production code
- [ ] DRY (Don't Repeat Yourself)
- [ ] Single responsibility principle
- [ ] Proper imports and exports

---

## docs

**Purpose:** Create and maintain documentation, code comments, and README files.

**Scope:**
- README.md and project documentation
- Code comments for complex logic
- API documentation
- Component documentation
- User guides

**When to use:**
- After implementing new features
- When code logic is complex
- When creating public APIs
- For onboarding new developers

---

## i18n

**Purpose:** Handle internationalization, localization, and Dutch/EU locale requirements.

**Scope:**
- Date formatting (Dutch: DD-MM-YYYY)
- Currency formatting (Euro: €1.234,56)
- Number formatting (Dutch locale)
- Text translations (if needed)
- Legal compliance for Dutch/EU

**When to use:**
- When displaying dates, currency, or numbers
- When adding user-facing text
- For invoice/document generation
- When ensuring EU compliance

**Checklist:**
- [ ] Dates: `nl-NL` locale, DD-MM-YYYY format
- [ ] Currency: Euro (€), Dutch formatting
- [ ] Numbers: Dutch decimal/thousand separators
- [ ] Timezone: Europe/Amsterdam
