# Project Architecture

This project is a full-stack TypeScript application split into two main parts: frontend and backend.

## Backend (Port 4000)

The backend is built with Node.js and Express, using TypeScript. It follows a modular architecture:

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── routes/        # Route definitions
│   └── index.ts       # Main application entry point
└── tsconfig.json      # TypeScript configuration
```

## Frontend (Port 3000)

The frontend is built with Next.js 13+ (App Router), TypeScript, and Tailwind CSS:

```
frontend/
├── app/
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Main page
│   └── globals.css    # Global styles
├── components/        # React components
├── tsconfig.json     # TypeScript configuration
└── tailwind.config.js # Tailwind configuration
```

## Communication

The frontend and backend communicate via HTTP:

- Backend exposes a `/test` POST endpoint that accepts JSON with a URL
- Frontend sends POST requests to `http://localhost:4000/test`
- CORS is enabled on the backend to allow requests from the frontend

## Development

Each part of the application can be run independently:

- Backend: `npm run dev` (uses nodemon and ts-node)
- Frontend: `npm run dev` (uses Next.js development server)

The applications are intentionally kept separate (not a monorepo) for simplicity and independence.

# Demo Validator Architecture

## Frontend Architecture

### Technology Stack

- Next.js 14 with TypeScript
- Tailwind CSS for styling
- React for UI components

### Component Structure

- `Header.tsx`: Main navigation header with links to Home and History
- `page.tsx`: Main landing page with URL input form and test configuration
- `layout.tsx`: Root layout with global styles and metadata
- `ApiTestResultDisplay.tsx`: Component to display test results

### UI Flow

1. User lands on the home page
2. User enters a landing page URL in the form
3. User can optionally customize test profile and test goals via accordions
4. Form submission triggers the validation process with the custom or default configuration
5. Results are displayed after test completion

### User Customization Features

- **Test Profile Customization**: Users can edit and all fields of the test profile including:
  - Name, email, phone number
  - Company, job title
  - Country, timezone
  - Description
- **Test Goals Customization**: Users can:
  - Edit existing test goals
  - Remove test goals
  - Add new test goals
  - Reorganzie goals
- The customized data is sent to the backend and used for the actual test execution
- Default values are provided if users choose not to customize

### Styling

- Using Tailwind CSS for utility-first styling
- Modern, clean design with consistent spacing
- Responsive layout that works on all device sizes
- Inter font from Google Fonts for typography
- Collapsible accordions for space-efficient form design

## Backend Testing Architecture

### Customizable Testing Parameters

The demo validator now accepts customizable parameters from the frontend:

1. **Custom Test Profile**: The system accepts a user-defined profile with:
   - Personal details (name, email, phone)
   - Professional information (company, job title)
   - Location data (country, timezone)
   - Description text
2. **Custom Test Goals**: Users can define their own set of testing goals:

   - Add, remove, or edit test goals
   - Change the order of goals
   - Customize goal descriptions

3. **Parameter Handling**:
   - The backend API accepts these parameters in the request body
   - If parameters are missing, the system falls back to default values
   - Logging of received parameters for debugging purposes
   - Error handling for malformed parameters

### Dynamic Test Execution Flow

The demo validator now uses a fully dynamic testing approach:

1. **Test Goals**: A list of high-level goals is defined (find demo button, fill forms, etc.)
2. **Dynamic Action Planning**: For each goal:

   - Instead of pre-defining subtasks, the system determines the next appropriate subtask and action on-the-fly
   - This decision is based on the current state, available page elements, and action history
   - OpenAI's GPT-4o model is used to make these decisions

3. **Action Execution Loop**:

   - For each goal, the system enters a loop where it:
     - Determines the next subtask and action to take
     - Executes the action using Playwright
     - Records the result in the action history
     - Continues until the goal is complete or a maximum number of attempts is reached

4. **Semantic Goal Advancement**:

   - The AI can determine when to advance to the next goal based on semantic understanding of progress
   - Rather than rigidly following predefined completion criteria, the system can interpret when a goal has been satisfied
   - Each advancement decision includes a reason explaining why the current goal can be considered complete
   - This makes the testing more adaptive to different website implementations

5. **Advanced Multi-Window Management**:

   - The system uses Playwright's event-based approach to detect and track all browser windows
   - Special handling for new tabs opened via `target="_blank"` links using `waitForEvent('page')` pattern
   - Pre-click evaluation of link elements to anticipate new tab openings
   - Proper synchronization of page loading states across multiple windows
   - Continuous monitoring of the browser context to detect page changes
   - Detection and handling of navigation events within existing pages

6. **Active Page Verification**:

   - Periodic refreshing of the page list to ensure all tabs are accounted for
   - Smart fallback to the most recently active page when target page cannot be found
   - Before/after action page inventory to track changes in the browser state
   - Detailed logging of page URLs throughout the test execution process

7. **Robust Page Analysis**:

   - Pages are checked for readiness before analysis
   - DOM state verification ensures pages are in a suitable state for interaction
   - Timeouts and error handling ensure the process continues even when encountering problematic pages
   - Empty page contexts are created even when elements can't be extracted, maintaining awareness of all windows
   - Detailed logging provides visibility into the state of all pages throughout the test

8. **Action History with Context**: Each action stores:

   - The page URL
   - What action was taken
   - Whether it was successful
   - An explanation of what happened
   - A purpose describing why the action was taken and how it relates to the goal

### Benefits of Dynamic Testing

- **Adaptability**: Adapts to different website structures and flows without hard-coded paths
- **Resilience**: Can recover from unexpected states or errors by re-evaluating the next best action
- **Context Awareness**: Maintains understanding of the overall goal while executing specific actions
- **Semantic Goal Completion**: Can intelligently determine when a goal has been sufficiently completed
- **Comprehensive Window Support**: Robustly handles websites that open new tabs, windows or popups
- **Anticipatory Behavior**: Predicts when actions might open new tabs and prepares accordingly
- **Synchronization**: Coordinates actions across multiple browser tabs
- **Fault Tolerance**: Continues functioning even when encountering problematic or unexpected page states
- **Self-Documentation**: Records the purpose of each action, making the test flow understandable

This architecture represents a shift from scripted testing to autonomous, goal-oriented testing that can handle the variability of modern web applications.
