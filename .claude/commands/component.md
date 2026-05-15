---
description: Create a UI component or screen feature using TDD (test-driven development)
allowed-tools: Read, Write, Edit, Glob, Bash(npm test:*), Bash(npx jest:*)
argument-hint: [Brief description]
---

## User Input

The user has provided information about the component or feature to make: **$ARGUMENTS**

## Do This First:

From the input above, determine a PascalCase component name or a kebab-case feature slug
(e.g., "a card showing user stats" → `UserStatsCard`, "end conversation dialog" → `end-conversation-dialog`).

---

## Stack

This is a **React Native + Expo** project. Tests use:
- **Jest** via `jest-expo` preset (`jest.config.js`)
- **`@testing-library/react-native`** — same `render`/`screen`/`fireEvent` API as web Testing Library
- Run tests with: `npm test` or `npm test -- --testPathPattern=<name> --forceExit`
- Test files live in `student-app/__tests__/screens/` or `student-app/__tests__/components/`

---

### 1. Write Tests First

Create `__tests__/screens/[feature-slug].test.tsx` (or `__tests__/components/[ComponentName].test.tsx`).

**Wrapper pattern** — screens need QueryClientProvider + PaperProvider:

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as PaperProvider } from 'react-native-paper'
import MyScreen from '../../app/my-screen/[id]'

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <MyScreen />
      </PaperProvider>
    </QueryClientProvider>
  )
}
```

**Mocks to include for screens** (add only what the screen imports):

```tsx
// expo-router
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'test-id' }),
  useRouter: () => ({ replace: jest.fn() }),
}))

// Supabase — chain methods return `this`, terminal methods return Promises
jest.mock('../../lib/supabase', () => {
  const makeChain = () => {
    const c: Record<string, any> = {}
    ;['select', 'update', 'insert', 'eq'].forEach(m => { c[m] = jest.fn(() => c) })
    c['order']      = jest.fn(() => Promise.resolve({ data: [], error: null }))
    c['single']     = jest.fn(() => Promise.resolve({ data: null, error: null }))
    c['maybeSingle']= jest.fn(() => Promise.resolve({ data: null, error: null }))
    return c
  }
  return { supabase: { from: jest.fn(() => makeChain()) } }
})

// Auth store
jest.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ studentId: 'test-student-id' }),
}))
```

**Key patterns:**
- Use `await screen.findByText(...)` (not `getByText`) when the screen has a loading state — it waits for the element to appear
- Use `jest.spyOn(Alert, 'alert').mockImplementation(() => {})` to capture `Alert.alert` calls
- Write 2–4 focused tests per feature

**Minimal test example:**

```tsx
describe('MyScreen — some feature', () => {
  beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}))
  afterEach(() => jest.clearAllMocks())

  it('renders the submit button', async () => {
    renderScreen()
    expect(await screen.findByText('Submit')).toBeTruthy()
  })
})
```

### 2. Run Tests (expect failure)

```bash
npm test -- --testPathPattern=<feature-slug> --forceExit
```

### 3. Create or Update the Component / Screen

Implement only what is needed to make the tests pass.

### 4. Run Tests (expect pass)

```bash
npm test -- --testPathPattern=<feature-slug> --forceExit
```

Iterate until all tests pass.

---

## Rules

- Keep tests minimal — 2–4 assertions per test
- Only proceed to the next step when the current step passes
- `findByText` / `findBy*` for async UI; `getByText` / `getBy*` for synchronous UI already rendered
- Add mocks only for dependencies the component under test actually imports
