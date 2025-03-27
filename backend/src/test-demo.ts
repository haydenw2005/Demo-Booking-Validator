import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import dotenv from "dotenv";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { z } from "zod";
dotenv.config();

// Validate OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

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
  // "Click through to the booking flow",
  `Fill out any required forms with the following profile: ${JSON.stringify(
    testProfile
  )}`,
  "Complete the meeting scheduling process",
  "Verify the booking was successful (e.g., confirmation page)",
];

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
  description: string;
  error?: string;
  success: "true" | "false" | "not attempted";
};

type Step = {
  description: string;
  error?: string;
  success: "true" | "false" | "not attempted";
  subtasks: SubTask[];
};

type PageAction = {
  action: "click" | "fill" | "select" | "wait";
  selector: string;
  value?: string;
  success: boolean;
  error?: string;
  isGoalComplete: boolean;
  pageUrl: string;
  explanation: string;
};

// Add new types for tracking context
type ActionHistory = {
  success: boolean;
  timestamp: number;
  pageUrl: string;
  explanation: string;
};

type PageContext = {
  url: string;
  elements: ClickableElement[];
};

const breakDownGoalWithLLM = async (
  goal: string,
  elements: ClickableElement[]
): Promise<SubTask[]> => {
  try {
    const result = await generateObject({
      model: openai("gpt-4o-2024-08-06", {
        structuredOutputs: true,
      }),
      schemaName: "goal_breakdown",
      schemaDescription: "Break down a high-level goal into steps and subtasks",
      schema: z
        .object({
          subtasks: z.array(
            z
              .object({
                description: z.string(),
                success: z.boolean(),
                error: z.string(),
              })
              .required()
          ),
          success: z.boolean(),
          error: z.string(),
        })
        .required(),
      prompt: `Break down this goal into actioanable subtasks: "${goal}". 
      For each subtasks: Have it correspond 1 to 1 with an action on the page (clicking a link, filling out a form, etc) NOTHING ELSE!
      Assume you have actions to all page elements later. You will be using playwright to do this.
      Make the breakdown as specific and actionable as possible. This will be your instructions for the test. This for you.
      USE AS LITTLE STEPS AS POSSIBLE.
      AVAILABLE ELEMENTS: ${JSON.stringify(elements)}`,
    });

    const breakdown = result.object as unknown as { subtasks: SubTask[] };
    return breakdown.subtasks;
  } catch (error) {
    console.error("Error breaking down goal:", error);
    throw error;
  }
};

const executePageAction = async (
  page: any,
  action: PageAction
): Promise<void> => {
  try {
    switch (action.action) {
      case "click":
        await page.click(action.selector);
        break;
      case "fill":
        if (!action.value) throw new Error("Value required for fill action");
        await page.fill(action.selector, action.value);
        break;
      case "select":
        if (!action.value) throw new Error("Value required for select action");
        await page.selectOption(action.selector, action.value);
        break;
      case "wait":
        await new Promise((resolve) => setTimeout(resolve, 1000)); //page.waitForSelector(action.selector);
        break;
    }
    action.success = true;
  } catch (error) {
    action.success = false;
    action.error =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw error;
  }
};

const getPageElements = async (page: any): Promise<ClickableElement[]> => {
  try {
    const elements = await page.$$eval(
      'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"]',
      (els: any) =>
        els.map((el: Element) => {
          return {
            tag: el.tagName,
            text: el.textContent?.trim() || "",
            id: el.id || "",
            class: el.className || "",
            type: el.getAttribute("type") || "",
            name: el.getAttribute("name") || "",
            value: el.getAttribute("value") || "",
            placeholder: el.getAttribute("placeholder") || "",
            href: el.getAttribute("href") || "",
            role: el.getAttribute("role") || "",
            "aria-label": el.getAttribute("aria-label") || "",
            "data-testid": el.getAttribute("data-testid") || "",
            "data-disabled": el.getAttribute("data-disabled") || "",
          };
        })
    );

    return elements;
  } catch (error) {
    console.error("Error getting page elements:", error);
    throw error;
  }
};

// Add new function to get all open pages
const getAllPageContexts = async (
  context: BrowserContext
): Promise<PageContext[]> => {
  const pages = await context.pages();
  const contexts: PageContext[] = [];

  for (const page of pages) {
    try {
      const url = page.url();
      const elements = await getPageElements(page);
      contexts.push({ url, elements });
    } catch (error) {
      console.error(`Error getting context for page ${page.url()}:`, error);
    }
  }

  return contexts;
};

// Modify determineNextAction to consider history and multiple pages
const determineNextAction = async (
  context: BrowserContext,
  currentStep: Step,
  currentSubtask: SubTask,
  actionHistory: ActionHistory[]
): Promise<PageAction> => {
  // Get context from all open pages
  const pageContexts = await getAllPageContexts(context);

  const result = await generateObject({
    model: openai("gpt-4o-2024-08-06", {
      structuredOutputs: true,
    }),
    schemaName: "page_action",
    schemaDescription: "Determine the next action to take on the page",
    schema: z
      .object({
        action: z.enum(["click", "fill", "select", "wait"]),
        selector: z.string(),
        value: z.string().optional(),
        explanation: z.string(),
        pageUrl: z.string(),
        isGoalComplete: z
          .boolean()
          .describe(
            "Whether the goal is complete, based off of action history."
          ),
      })
      .required(),
    prompt: `Given the current page contexts and the task "${
      currentSubtask.description
    }", determine the next action to take.
    
    Available pages and their elements:
    ${JSON.stringify(pageContexts)}
    
    Previous actions taken (ACTION HISTORY):
    ${JSON.stringify(actionHistory)}
    
    Current step: ${currentStep.description}
    Current subtask: ${currentSubtask.description}
    
    Consider:
    1. Don't repeat previous actions. Check to see if action history already has this action, and was successful.
    2. Use the most specific selector possible
    3. Consider all open pages when planning the action
    
    Return a specific action that will help complete this task. The action should be precise and executable.`,
  });

  return result.object as unknown as PageAction;
};

export const testDemoLink = async (url: string): Promise<Step[]> => {
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 250,
  });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();
  let testStructure: Step[] = [];
  const actionHistory: ActionHistory[] = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Process goals sequentially
    for (const goal of goals) {
      try {
        const pageContexts = await getAllPageContexts(context);
        const subtasks = await breakDownGoalWithLLM(
          goal,
          pageContexts[0].elements
        );
        testStructure.push({
          description: goal,
          error: undefined,
          success: "not attempted" as const,
          subtasks,
        });

        const step = testStructure[testStructure.length - 1];
        let goalCompleted = false;

        for (const subtask of step.subtasks) {
          try {
            const action = await determineNextAction(
              context,
              step,
              subtask,
              actionHistory
            );

            // Check if goal is already complete
            // if (action.isGoalComplete) {
            //   goalCompleted = true;
            //   subtask.success = "true";
            //   break;
            // }

            // Find the correct page to execute the action on
            const targetPage =
              (await context.pages()).find(
                (p: Page) => p.url() === action.pageUrl
              ) || page;
            await executePageAction(targetPage, action);

            // Record the action
            actionHistory.push({
              explanation: action.explanation,
              success: action.success,
              timestamp: Date.now(),
              pageUrl: action.pageUrl,
            });

            if (action.success) {
              subtask.success = "true";
            } else {
              subtask.success = "false";
              subtask.error = action.error;
            }
          } catch (error) {
            subtask.success = "false";
            subtask.error =
              error instanceof Error ? error.message : "Unknown error occurred";
            throw error;
          }
        }

        step.success = goalCompleted ? "true" : "false";
        if (goalCompleted) break; // Move to next goal if current one is complete
      } catch (error) {
        const currentStep = testStructure[testStructure.length - 1];
        if (currentStep) {
          currentStep.success = "false";
          currentStep.error =
            error instanceof Error ? error.message : "Unknown error occurred";
        }
        console.error("Error processing goal:", error);
      }
    }
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await browser.close();
  }

  return testStructure;
};
