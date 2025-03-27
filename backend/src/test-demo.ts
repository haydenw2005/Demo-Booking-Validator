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
  `Fill out any required forms with the following profile. Not all fields have have to be used or exist SO MOVE ON IF YOU CAN'T FIND THE FIELD, etc. Also, the order does not correpsond to the order of the site's flow. ${JSON.stringify(
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
  completed: boolean;
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
  purpose?: string; // Adding purpose field to track context
};

type PageContext = {
  url: string;
  elements: ClickableElement[];
};

// Enhanced action response type with purpose
type EnhancedPageAction = PageAction & {
  purpose: string; // Adding purpose field to explain the context/reason for this action
  advanceToNextGoal?: boolean; // Flag indicating whether to advance to the next goal
  advanceReason?: string; // Explanation for why advancing to the next goal
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

// Simplify the getPageElements function to focus on essential functionality
const getPageElements = async (page: Page): Promise<ClickableElement[]> => {
  try {
    // Wait for page to be in a usable state
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
      page
        .waitForLoadState("domcontentloaded", { timeout: 5000 })
        .catch(() => {}),
    ]);

    console.log(`Extracting elements from: ${page.url()}`);

    // Use a cleaner implementation with better error handling
    const elements = await page
      .$$eval(
        'a, button, input, select, textarea, [role="button"], [role="link"], [type="submit"], [type="button"]',
        (els: Element[]) => {
          return els
            .filter((el) => {
              // Basic visibility check
              const style = window.getComputedStyle(el as HTMLElement);
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0"
              );
            })
            .map((el: Element, idx: number) => {
              const htmlEl = el as HTMLElement;

              // Get text content with fallbacks
              const text =
                htmlEl.textContent?.trim() ||
                htmlEl.getAttribute("aria-label") ||
                htmlEl.getAttribute("value") ||
                htmlEl.getAttribute("placeholder") ||
                "";

              // Get href for links
              const href =
                htmlEl.tagName === "A"
                  ? (htmlEl as HTMLAnchorElement).href || ""
                  : "";

              // Return minimal necessary data
              return {
                index: idx,
                tag: htmlEl.tagName,
                text,
                href,
                id: htmlEl.id || "",
                name: htmlEl.getAttribute("name") || "",
                type: htmlEl.getAttribute("type") || "",
              };
            });
        }
      )
      .catch((error) => {
        console.error(`Element extraction error: ${error.message}`);
        return [];
      });

    console.log(`Found ${elements.length} elements on ${page.url()}`);
    return elements;
  } catch (error) {
    console.error(`Error with page ${page.url()}: ${error}`);
    return []; // Return empty array instead of throwing
  }
};

// Streamlined version of getAllPageContexts
const getAllPageContexts = async (
  context: BrowserContext
): Promise<PageContext[]> => {
  // Get all pages in the context
  const pages = await context.pages();
  console.log(`Found ${pages.length} pages in context`);

  const contexts: PageContext[] = [];

  // Process each page
  for (const page of pages) {
    try {
      // Skip irrelevant pages
      if (page.url() === "about:blank" || !page.url().startsWith("http")) {
        continue;
      }

      // Extract elements
      const elements = await getPageElements(page);
      contexts.push({ url: page.url(), elements });
    } catch (error) {
      console.error(`Error processing page: ${error}`);
      // Still add the page to contexts, but with empty elements
      contexts.push({ url: page.url(), elements: [] });
    }
  }

  return contexts;
};

// Simplified waitForNewPage function
const waitForNewPage = async (
  clickAction: () => Promise<void>,
  context: BrowserContext
): Promise<Page | null> => {
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 10000 });
    await clickAction();
    const newPage = await newPagePromise;

    // Wait for page to load enough to be useful
    await Promise.race([
      newPage
        .waitForLoadState("domcontentloaded", { timeout: 8000 })
        .catch(() => {}),
      newPage
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => {}),
    ]);

    return newPage;
  } catch (error) {
    console.error(`Failed to detect/wait for new page: ${error}`);
    return null;
  }
};

// Add a new function to validate if a selector exists on the page
async function validateSelector(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    // Check if the selector exists on the page
    const count = await page.$$eval(selector, (elements) => elements.length);
    return count > 0;
  } catch (error) {
    // If there's an error evaluating the selector, it's invalid
    return false;
  }
}

// Helper function to get available selectors as hints
async function getAvailableSelectors(page: Page): Promise<string[]> {
  try {
    // Get common form elements and interactive elements
    const selectors = await page
      .$$eval(
        'button, input, select, textarea, a[href], [role="button"]',
        (elements) => {
          return elements.map((el) => {
            const tag = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : "";
            const type = el.getAttribute("type")
              ? `[type="${el.getAttribute("type")}"]`
              : "";
            const name = el.getAttribute("name")
              ? `[name="${el.getAttribute("name")}"]`
              : "";
            const textContent = el.textContent?.trim();
            const placeholder = el.getAttribute("placeholder");

            // Build a description of the element
            let desc = "";
            if (id) desc += id;
            else if (name) desc += `${tag}${name}`;
            else if (type) desc += `${tag}${type}`;
            else desc += tag;

            if (textContent)
              desc += ` with text "${textContent.substring(0, 20)}${
                textContent.length > 20 ? "..." : ""
              }"`;
            if (placeholder) desc += ` with placeholder "${placeholder}"`;

            return desc;
          });
        }
      )
      .catch(() => []);

    return selectors.slice(0, 10); // Limit to 10 suggestions to avoid overwhelming
  } catch (error) {
    return [];
  }
}

// Enhanced executePageAction with selector validation
const enhancedExecutePageAction = async (
  page: Page,
  action: PageAction,
  context: BrowserContext
): Promise<{
  success: boolean;
  newPage?: Page;
  selectorExists: boolean;
  availableSelectors?: string[];
}> => {
  try {
    // First validate if the selector exists
    // const selectorExists = await validateSelector(page, action.selector);

    // if (!selectorExists) {
    //   // If selector doesn't exist, get available selectors as hints
    //   const availableSelectors = await getAvailableSelectors(page);
    //   console.log(`Selector "${action.selector}" does not exist on the page`);
    //   console.log(`Available selectors: ${availableSelectors.join(", ")}`);

    //   action.success = false;
    //   action.error = `Selector "${
    //     action.selector
    //   }" does not exist on the page. Available elements include: ${availableSelectors.join(
    //     ", "
    //   )}`;

    //   return {
    //     success: false,
    //     selectorExists: false,
    //     availableSelectors,
    //   };
    // }

    switch (action.action) {
      case "click":
        // Check if this might open a new tab
        const targetInfo = await page
          .evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el instanceof HTMLAnchorElement) {
              return { href: el.href, target: el.target };
            }
            return null;
          }, action.selector)
          .catch(() => null);

        // Handle potential new tab/window opening
        if (targetInfo && targetInfo.target === "_blank") {
          const newPage = await waitForNewPage(
            () => page.click(action.selector),
            context
          );
          return {
            success: true,
            newPage: newPage || undefined,
            selectorExists: true,
          };
        } else {
          // For regular clicks, still listen for potential new pages
          const pagePromise = context
            .waitForEvent("page", { timeout: 5000 })
            .catch(() => null);
          await page.click(action.selector);
          const potentialNewPage = await pagePromise;

          if (potentialNewPage) {
            return {
              success: true,
              newPage: potentialNewPage,
              selectorExists: true,
            };
          }
        }
        break;

      case "fill":
        if (!action.value) throw new Error("Value required for fill action");
        await page.click(action.selector).catch(() => {}); // Try to focus first
        await page.fill(action.selector, action.value);
        break;

      case "select":
        if (!action.value) throw new Error("Value required for select action");
        await page.selectOption(action.selector, action.value);
        break;

      case "wait":
        await new Promise((resolve) => setTimeout(resolve, 1500));
        break;
    }

    action.success = true;
    return { success: true, selectorExists: true };
  } catch (error) {
    action.success = false;
    action.error =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, selectorExists: true }; // Selector exists but action failed for other reasons
  }
};

// Streamlined testDemoLink function
export const testDemoLink = async (url: string): Promise<Step[]> => {
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 300, // Slightly faster while still stable
  });

  const context: BrowserContext = await browser.newContext({
    javaScriptEnabled: true,
    acceptDownloads: true,
    bypassCSP: true,
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
  });

  // Set up page event handling
  context.on("page", async (page) => {
    console.log(`New page detected: ${page.url()}`);

    // Wait for the page to be ready
    await Promise.race([
      page
        .waitForLoadState("domcontentloaded", { timeout: 10000 })
        .catch(() => {}),
      page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {}),
    ]);

    // Set up event listeners
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`Page navigated to: ${page.url()}`);
      }
    });

    page.on("close", () => console.log(`Page closed: ${page.url()}`));
  });

  const page: Page = await context.newPage();
  let testStructure: Step[] = [];
  const actionHistory: ActionHistory[] = [];

  try {
    // Navigate to the initial URL
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Process goals sequentially
    for (let goalIndex = 0; goalIndex < goals.length; goalIndex++) {
      const goal = goals[goalIndex];
      console.log(`\n=== Starting Goal ${goalIndex + 1}: ${goal} ===\n`);

      try {
        // Initialize the step
        testStructure.push({
          description: goal,
          success: "not attempted",
          subtasks: [],
          completed: false,
        });

        const currentStep = testStructure[testStructure.length - 1];
        let maxActions = 15;
        let selectorFeedback:
          | { invalidSelector: string; availableSelectors: string[] }
          | undefined = undefined;

        // Action loop for current goal
        while (!currentStep.completed && maxActions > 0) {
          try {
            // Log current pages
            const allPages = await context.pages();
            console.log(`\nOpen pages (${allPages.length}):`);
            allPages.forEach((p) => console.log(`- ${p.url()}`));

            // Determine next action with potential selector feedback
            const { action, subtask } = await determineNextActionAndSubtask(
              context,
              goal,
              actionHistory,
              goals,
              goalIndex,
              selectorFeedback
            );

            // Reset selector feedback
            selectorFeedback = undefined;

            console.log(`Next action: ${action.action} on ${action.selector}`);
            console.log(`Subtask: ${subtask.description}`);
            currentStep.subtasks.push(subtask);

            // Check if goal is complete
            if (action.advanceToNextGoal || action.isGoalComplete) {
              currentStep.completed = true;
              currentStep.success = "true";
              subtask.success = "true";
              console.log(
                action.advanceToNextGoal
                  ? `Advanced to next goal: ${
                      action.advanceReason || "Goal satisfied"
                    }`
                  : "Goal marked as complete."
              );
              break;
            }

            // Find the correct page to execute the action on
            let targetPage = await findTargetPage(context, action.pageUrl);

            if (!targetPage) {
              console.log(`No matching page found, using most recent page`);
              const pages = await context.pages();
              targetPage = pages[pages.length - 1] || page;
            }

            // Execute the action with selector validation
            console.log(`Executing on page: ${targetPage.url()}`);
            const { success, newPage, selectorExists, availableSelectors } =
              await enhancedExecutePageAction(targetPage, action, context);

            // If selector doesn't exist, prepare feedback for the next iteration
            if (!selectorExists && availableSelectors) {
              console.log(
                `SELECTOR VALIDATION FAILED: "${action.selector}" does not exist`
              );
              selectorFeedback = {
                invalidSelector: action.selector,
                availableSelectors: availableSelectors,
              };

              // Continue to next iteration without recording this failed action
              console.log(
                "Requesting new action with available selector hints"
              );
              continue;
            }

            // Record the action
            actionHistory.push({
              explanation: action.explanation,
              success: action.success,
              timestamp: Date.now(),
              pageUrl: action.pageUrl,
              purpose: action.purpose,
            });

            // Update subtask status
            if (success) {
              subtask.success = "true";
            } else {
              subtask.success = "false";
              subtask.error = action.error;
              console.log(`Action failed: ${action.error}`);
            }

            // Short pause between actions
            await new Promise((resolve) => setTimeout(resolve, 800));
            maxActions--;
          } catch (error) {
            const currentSubtask =
              currentStep.subtasks[currentStep.subtasks.length - 1];
            if (currentSubtask) {
              currentSubtask.success = "false";
              currentSubtask.error =
                error instanceof Error ? error.message : "Unknown error";
            }
            console.error("Error processing subtask:", error);
            maxActions--;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // Handle failure to complete goal
        if (!currentStep.completed) {
          currentStep.success = "false";
          currentStep.error = "Failed to complete goal within maximum attempts";
        }
      } catch (error) {
        const currentStep = testStructure[testStructure.length - 1];
        if (currentStep) {
          currentStep.success = "false";
          currentStep.error =
            error instanceof Error ? error.message : "Unknown error";
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

// Helper function to find the target page
async function findTargetPage(
  context: BrowserContext,
  targetUrl: string
): Promise<Page | undefined> {
  const pages = await context.pages();

  // Try exact match first
  let targetPage = pages.find((p) => p.url() === targetUrl);
  if (targetPage) return targetPage;

  // Try matching by pathname
  try {
    const urlObj = new URL(targetUrl);
    const targetPath = urlObj.pathname;

    targetPage = pages.find((p) => {
      try {
        return new URL(p.url()).pathname.includes(targetPath);
      } catch {
        return false;
      }
    });

    if (targetPage) {
      console.log(`Found page by pathname match: ${targetPage.url()}`);
      return targetPage;
    }
  } catch {
    // If URL parsing fails, continue to domain matching
  }

  // Try matching by domain
  try {
    const urlObj = new URL(targetUrl);
    const targetDomain = urlObj.hostname;

    targetPage = pages.find((p) => {
      try {
        return new URL(p.url()).hostname === targetDomain;
      } catch {
        return false;
      }
    });

    if (targetPage) {
      console.log(`Found page by domain match: ${targetPage.url()}`);
      return targetPage;
    }
  } catch {
    // If all matching attempts fail
    return undefined;
  }
}

// Modify the determineNextActionAndSubtask function to use the feedback from previous attempts
const determineNextActionAndSubtask = async (
  context: BrowserContext,
  currentGoal: string,
  actionHistory: ActionHistory[],
  allGoals: string[],
  currentGoalIndex: number,
  selectorFeedback?: { invalidSelector: string; availableSelectors: string[] }
): Promise<{ action: EnhancedPageAction; subtask: SubTask }> => {
  // Get context from all open pages
  const pageContexts = await getAllPageContexts(context);

  // Determine if there's a next goal
  const nextGoal =
    currentGoalIndex < allGoals.length - 1
      ? allGoals[currentGoalIndex + 1]
      : null;

  // Add feedback about hallucinated selectors if available
  const feedbackMessage = selectorFeedback
    ? `IMPORTANT: Your previous attempt used selector "${
        selectorFeedback.invalidSelector
      }" which does not exist on the page. 
       Please choose only from the actual elements present on the page. 
       Some available elements include: ${selectorFeedback.availableSelectors.join(
         ", "
       )}`
    : "";

  const result = await generateObject({
    model: openai("gpt-4o-2024-08-06", {
      structuredOutputs: true,
    }),
    schemaName: "dynamic_action_and_subtask",
    schemaDescription:
      "Dynamically determine the next subtask and action based on the current ELEMENT STATE and GOAL",
    schema: z
      .object({
        subtask: z
          .object({
            description: z
              .string()
              .describe("Clear description of this subtask"),
            success: z.boolean(),
            error: z.string(),
          })
          .required(),
        action: z
          .object({
            action: z.enum(["click", "fill", "select", "wait"]),
            selector: z
              .string()
              .describe(
                "The selector to use for the action, taken from the element JSON"
              ),
            value: z.string().optional(),
            explanation: z.string(),
            pageUrl: z.string(),
            isGoalComplete: z
              .boolean()
              .describe(
                "Whether the current goal is complete, based on the current state."
              ),
            advanceToNextGoal: z
              .boolean()
              .describe(
                "Whether to advance to the next goal based on semantic understanding of the current state"
              ),
            advanceReason: z
              .string()
              .describe(
                "Explanation for why we should advance to the next goal"
              )
              .optional(),
            purpose: z
              .string()
              .describe(
                "Brief description of the purpose for taking this action and how it contributes to the overall goal"
              ),
          })
          .strict()
          .required(),
      })
      .required(),
    prompt: `Based on the current goal "${currentGoal}", determine the next logical subtask and specific action to take.
    
    Available pages and their elements:
    ${JSON.stringify(pageContexts)}
    
    Previous actions taken (ACTION HISTORY):
    ${JSON.stringify(actionHistory)}
    
    Current goal: "${currentGoal}" (${currentGoalIndex + 1} of ${
      allGoals.length
    })
    ${nextGoal ? `Next goal: "${nextGoal}"` : "This is the final goal"}
    
    ${feedbackMessage}
    
    Consider:
    1. Don't repeat previous actions unless necessary. Check to see if action history already has this action, and was successful.
    2. Choose the most appropriate next subtask that progresses toward completing the current goal.
    3. Use the most specific selector possible for the action. DO NOT MAKE UP A SELECTOR - ONLY USE THE ONES THAT EXIST ON THE PAGE.
    4. Consider all open pages when planning the action
    5. Indicate if you believe the goal is now complete based on the action history and current state
    6. IMPORTANT: You can decide to advance to the next goal if you determine that the current goal is semantically complete
       based on the actions taken so far. This is different from isGoalComplete - it's about your assessment of the situation.
    7. IMPORTANT: The flow of the site DOES NOT CORREPSOND TO THE GOAL STRUCTURE. BASED ON THE CURRENT STATE, DETERMINE THE NEXT ACTION ACCORDINGLY.
    8. IMPORTANT: Only use selectors that are actually present in the available pages and elements. Do not hallucinate selectors.
    
    Return both a specific subtask and an action that will help complete this task. The action should be precise and executable.
    Include a "purpose" field that explains why this action is being taken and how it contributes to the overall goal.
    
    For the 'value' field, only include it if the action is 'fill' or 'select' - leave it undefined otherwise.
    
    Set 'advanceToNextGoal' to true if you believe that enough actions have been taken to satisfy the current goal and we
    should move on to the next goal. Provide an 'advanceReason' explaining why you believe we should advance.`,
  });

  // Transform result to the expected format
  const generatedResult = result.object as unknown as {
    subtask: {
      description: string;
      success: boolean;
      error: string;
    };
    action: EnhancedPageAction;
  };

  // Convert boolean success to string enum
  const subtask: SubTask = {
    description: generatedResult.subtask.description,
    success: "not attempted",
    error: generatedResult.subtask.error,
  };

  return {
    action: generatedResult.action,
    subtask: subtask,
  };
};
