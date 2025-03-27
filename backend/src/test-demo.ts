import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import dotenv from "dotenv";
import { chromium } from "playwright";
import { z } from "zod";
dotenv.config();

// Validate OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

type ClickableElement = {
  index: number;
  tag: string;
  text: string;
  href: string;
};

type ActionResponse = {
  id_click: string;
  id_found: boolean;
  error?: string | undefined;
};

type SubTask = {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
  parentGoal: string;
  expectedOutcome?: string;
  potentialChallenges?: string[];
};

type TestProgress = {
  currentGoal: number;
  totalGoals: number;
  subtasks: SubTask[];
  errors: string[];
  isComplete: boolean;
};

const breakDownGoalWithLLM = async (
  goal: string,
  index: number
): Promise<SubTask[]> => {
  const result = await generateObject({
    model: openai("gpt-4o-2024-08-06", {
      structuredOutputs: true,
    }),
    schemaName: "goal_breakdown",
    schemaDescription:
      "Break down a high-level goal into granular, actionable steps",
    schema: z
      .object({
        steps: z.array(
          z.object({
            description: z.string(),
            expectedOutcome: z.string(),
            potentialChallenges: z.array(z.string()),
          })
        ),
      })
      .required(),
    prompt: `Break down this goal into granular, actionable steps: "${goal}". 
    For each step, provide:
    1. A clear, specific description of what needs to be done
    2. The expected outcome of the step
    3. Potential challenges or edge cases to consider
    
    Make the steps as specific and actionable as possible.`,
  });

  const breakdown = result as unknown as {
    steps: Array<{
      description: string;
      expectedOutcome: string;
      potentialChallenges: string[];
    }>;
  };

  return breakdown.steps.map((step, i) => ({
    id: `${index}-${i + 1}`,
    description: step.description,
    status: "pending",
    parentGoal: goal,
    expectedOutcome: step.expectedOutcome,
    potentialChallenges: step.potentialChallenges,
  }));
};

const chooseAction = async (
  elements: ClickableElement[]
): Promise<ActionResponse> => {
  const result = await generateObject({
    model: openai("gpt-4o-2024-08-06", {
      structuredOutputs: true,
    }),
    schemaName: "click",
    schemaDescription:
      "A clickable element on the page, used to complete the current prompt task",
    schema: z
      .object({
        id_click: z.string(),
        id_found: z.boolean(),
        error: z.string().optional(),
      })
      .required(),
    prompt: `Choose the most appropriate clickable element to complete the following task: ${elements}`,
  });

  return result as unknown as ActionResponse;
};

const testProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  company: "Example Inc.",
  jobTitle: "Software Engineer",
  country: "United States",
  timezone: "America/New_York",
};

const goals = [
  'Detect "Book a Demo" (or similar) buttons/links',
  "Click through to the booking flow",
  `Fill out any required forms with the following profile: ${JSON.stringify(
    testProfile
  )}`,
  "Complete the meeting scheduling process",
  "Verify the booking was successful (e.g., confirmation page)",
];

export const testDemoLink = async (url: string): Promise<TestProgress> => {
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Initialize progress with empty subtasks
  const progress: TestProgress = {
    currentGoal: 0,
    totalGoals: goals.length,
    subtasks: [],
    errors: [],
    isComplete: false,
  };

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    while (progress.currentGoal < goals.length) {
      // Break down the current goal into subtasks
      const currentGoalSubtasks = await breakDownGoalWithLLM(
        goals[progress.currentGoal],
        progress.currentGoal
      );
      progress.subtasks.push(...currentGoalSubtasks);

      for (const subtask of currentGoalSubtasks) {
        try {
          subtask.status = "in_progress";
          const clickableElements = await page.$$eval(
            'a,button,input[type="submit"]',
            (elements) =>
              elements.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                text:
                  (el as HTMLElement).innerText ||
                  (el as HTMLElement).getAttribute("aria-label") ||
                  "",
                href: (el as HTMLAnchorElement).getAttribute("href") || "",
              }))
          );

          const actionResponse = await chooseAction(clickableElements);

          if (actionResponse.id_found) {
            await page.click(actionResponse.id_click);
            subtask.status = "completed";
          } else {
            throw new Error(
              actionResponse.error || "Failed to find clickable element"
            );
          }
        } catch (error) {
          subtask.status = "failed";
          subtask.error =
            error instanceof Error ? error.message : "Unknown error occurred";
          progress.errors.push(subtask.error);
          throw error; // Re-throw to stop the process
        }
      }

      progress.currentGoal++;
    }

    progress.isComplete = true;
  } catch (error) {
    // Error is already handled in the subtask loop
  } finally {
    await browser.close();
  }

  return progress;
};
