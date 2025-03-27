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
- `page.tsx`: Main landing page with URL input form
- `layout.tsx`: Root layout with global styles and metadata

### UI Flow

1. User lands on the home page
2. User enters a landing page URL in the form
3. Form submission triggers the validation process
4. Results will be displayed (to be implemented)

### Styling

- Using Tailwind CSS for utility-first styling
- Modern, clean design with consistent spacing
- Responsive layout that works on all device sizes
- Inter font from Google Fonts for typography
