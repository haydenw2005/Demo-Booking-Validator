# Demo Booking Validator

A full-stack application for testing websites through AI-powered automated validation.

## Overview

Demo Booking Validator is a tool that allows you to test landing pages and demo experiences automatically. It simulates user behavior to validate that your website's critical paths work as expected. The system uses AI-powered, agentic testing to:

1. Navigate to your landing page URL
2. Find and interact with demo forms and buttons
3. Intelligently fill in required information
4. Progress through multiple steps and pages
5. Validate successful demo completion

## How It Works

The Demo Validator uses a dynamic testing approach powered by AI:

### Frontend

- Built with Next.js 14, TypeScript, and Tailwind CSS
- Provides an intuitive interface to input test URLs
- Allows customization of test profiles and test goals
- Displays detailed test results and action history
- Responsive design that works on all device sizes

### Backend

- Powered by Node.js, Express, and TypeScript
- Uses Playwright for browser automation
- Leverages OpenAI's GPT-4o model for AI-driven testing decisions
- Handles multi-window/tab navigation seamlessly
- Generates detailed reports of the test execution

### Key Features

- Customizable test profiles with personal and professional details
- Editable test goals that can be added, removed, or reordered
- Dynamic action planning based on page context
- Semantic goal advancement for adaptive testing
- Comprehensive window management for multi-tab websites
- Detailed action history with explanations

## Setup and Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key (for the backend)

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Install playwright browsers:

   ```
   npx playwright install
   ```

4. Create a `.env` file with your OpenAI API key:

   ```
   OPENAI_API_KEY=your_api_key_here
   ```

5. Start the development server:
   ```
   npm run dev
   ```
   The backend will run on http://localhost:4000

### Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The frontend will run on http://localhost:3000

## Usage

1. Open your browser and go to http://localhost:3000
2. Enter the URL of the landing page you want to test
3. Optionally customize the test profile and test goals
4. Click the "Start Test" button to start the validation
5. View the results of the test, including actions taken and screenshots

## Development

Each part of the application can be run independently:

- Backend: Uses nodemon and ts-node for hot reloading
- Frontend: Uses Next.js development server with turbopack

For more detailed information about the architecture, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).
