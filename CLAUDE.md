### 🔄 Project Awareness & Context
- **Always read `TASK.md`** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- **Check current progress in `TASK.md`** - look for checked [x] items to see what's completed and unchecked [ ] items for next tasks.
- **Follow the 8-phase structure** outlined in TASK.md:
  - Phase 1: Environment Setup & Project Initialization
  - Phase 2: Supabase Backend Setup
  - Phase 3: React Native Frontend Development
  - Phase 4: n8n Workflow Integration
  - Phase 5: Integration & Testing
  - Phase 6: Enterprise Security & Compliance
  - Phase 7: EAS Build & App Store Deployment
  - Phase 8: DevOps & Monitoring
- **Use consistent naming conventions** as described in TASK.md (React Native + Expo, Supabase, n8n stack).
- **Mark completed tasks immediately** by changing [ ] to [x] in TASK.md after finishing any task.

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
  For React Native CRM app this looks like:
    - `src/screens/` - Screen components (LoginScreen, DashboardScreen, etc.)
    - `src/components/` - Reusable UI components
    - `src/services/` - API calls and business logic
    - `src/hooks/` - Custom React hooks
    - `src/types/` - TypeScript type definitions
    - `src/utils/` - Helper functions and utilities
- **Use clear, consistent imports** with absolute paths from src/.
- **Use Expo SecureStore** for sensitive data and environment variables.

### 🧪 Testing & Reliability
- **Always create Jest unit tests for new features** (components, hooks, services, etc).
- **After updating any logic**, check whether existing unit tests need to be updated. If so, do it.
- **Tests should live in a `__tests__` folder** or alongside components with `.test.tsx` extension.
  - Include at least:
    - 1 test for expected rendering/behavior
    - 1 edge case (empty data, network errors)
    - 1 user interaction test
- **Use React Native Testing Library** for component testing and **Jest** for unit testing.
- **Test Supabase integration** with mock data and **n8n workflows** with test webhooks.

### ✅ Task Completion
- **Mark completed tasks in `TASK.md`** immediately after finishing them.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a “Discovered During Work” section.

### 📎 Style & Conventions
- **Use TypeScript/JavaScript** as the primary language for React Native development.
- **Follow React Native and Expo best practices** with consistent component structure.
- **Use TypeScript** for type safety and better development experience.
- **Use Supabase client** for database operations and authentication.
- **Use n8n workflows** for backend automation and integrations.
- Write **JSDoc comments for complex functions**:
  ```typescript
  /**
   * Brief summary of the function
   * @param param1 - Description of parameter
   * @returns Description of return value
   */
  const example = (param1: string): Promise<void> => {
    // Implementation
  };
  ```

### 📚 Documentation & Explainability
- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add an inline `# Reason:` comment** explaining the why, not just the what.

### 🧠 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified React Native/Expo packages.
- **Always confirm file paths and component names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `TASK.md`.
- **Follow the CRM project phases** - always check current progress in TASK.md before starting new work.
- **Use Expo/EAS best practices** - leverage cloud builds and avoid unnecessary local toolchain setup.