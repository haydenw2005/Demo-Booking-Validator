import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import dotenv from "dotenv";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { z } from "zod";
import {
  ActionHistory,
  ClickableElement,
  EnhancedPageAction,
  PageAction,
  PageContext,
  Step,
  SubTask,
} from "./types";
dotenv.config();

// Validate OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// Add a function to get only the most recent page context
const getMostRecentPageContext = async (
  context: BrowserContext
): Promise<PageContext> => {
  // Get all pages in the context
  const pages = await context.pages();
  console.log(`Found ${pages.length} pages in context, using most recent one`);

  // Get the most recent page
  const mostRecentPage = pages[pages.length - 1];

  // Extract elements from the most recent page
  const elements = await getPageElements(mostRecentPage);

  return { url: mostRecentPage.url(), elements };
};

// Refactored getPageElements to inject data-ai-index attributes
const getPageElements = async (page: Page): Promise<ClickableElement[]> => {
  try {
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
      page
        .waitForLoadState("domcontentloaded", { timeout: 5000 })
        .catch(() => {}),
    ]);

    console.log(`Extracting elements from: ${page.url()}`);

    // First, inject data-ai-index attributes into the DOM elements
    await page.evaluate(() => {
      // Generate a unique prefix for this page
      const pageId = Math.random().toString(36).substring(2, 8);

      // Select all interactive elements
      const elements = document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [role="link"], [type="submit"], [type="button"]'
      );

      // Filter visible elements and inject data-ai-index attribute
      let index = 0;
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        ) {
          // Only set the attribute if it doesn't already exist
          if (!el.hasAttribute("data-ai-index")) {
            el.setAttribute("data-ai-index", `ai-${pageId}-${index}`);
            index++;
          }
        }
      });

      return index; // Return the number of elements processed
    });

    // Now extract the elements with their data-ai-index attributes
    const elements = await page
      .$$eval(
        'a, button, input, select, textarea, [role="button"], [role="link"], [type="submit"], [type="button"]',
        (els: Element[]) => {
          return els
            .filter((el) => {
              const style = window.getComputedStyle(el as HTMLElement);
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0"
              );
            })
            .map((el: Element, idx: number) => {
              const htmlEl = el as HTMLElement;
              const text =
                htmlEl.textContent?.trim() ||
                htmlEl.getAttribute("aria-label") ||
                htmlEl.getAttribute("value") ||
                htmlEl.getAttribute("placeholder") ||
                "";

              const href =
                htmlEl.tagName === "A"
                  ? (htmlEl as HTMLAnchorElement).href || ""
                  : "";

              // Get the stable data-ai-index attribute (maintain the format that was set above)
              const dataAiIndex = htmlEl.getAttribute("data-ai-index") || "";

              return {
                index: idx,
                tag: htmlEl.tagName,
                text,
                href,
                id: htmlEl.id || "",
                name: htmlEl.getAttribute("name") || "",
                type: htmlEl.getAttribute("type") || "",
                dataAiIndex, // Include the data-ai-index in the returned data
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
    return [];
  }
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

// Refactored enhancedExecutePageAction to use data-ai-index for element selection
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
    // Update the action's pageUrl to match the current page
    action.pageUrl = page.url();

    // Check if we need to convert the selector to a data-ai-index selector
    let selector = action.selector;

    // Case 1: If selector is a number (index), convert to data-ai-index
    if (!isNaN(Number(action.selector))) {
      console.log(`Using index ${action.selector} for element selection.`);
      // Get all elements and find the one with matching index
      const elements = await getPageElements(page);
      const targetElement = elements.find(
        (el) => el.index === Number(action.selector)
      );

      if (!targetElement) {
        console.log(`Element with index ${action.selector} not found.`);
        action.success = false;
        action.error = `Element with index ${action.selector} not found.`;
        return { success: false, selectorExists: false };
      }

      console.log(
        `Target element found: ${targetElement.tag} with text "${targetElement.text}"`
      );
      // Use the data-ai-index attribute for selection
      selector = `[data-ai-index="${targetElement.dataAiIndex}"]`;
    }
    // Case 2: If selector starts with "ai-", assume it's already a data-ai-index
    else if (
      typeof action.selector === "string" &&
      action.selector.startsWith("ai-")
    ) {
      selector = `[data-ai-index="${action.selector}"]`;
    }

    // Validate the selector exists on the page
    const selectorExists = await validateSelector(page, selector);

    if (!selectorExists) {
      // If selector doesn't exist, get available selectors as hints
      const availableElements = await getAvailableElements(page);
      console.log(`Selector "${selector}" does not exist on the page`);

      // Create formatted strings for each element
      const formattedElements = availableElements.map(
        (el) =>
          `${el.tag} with text "${el.text}" (index: ${el.index}, data-ai-index: ${el.dataAiIndex})`
      );

      action.success = false;
      action.error = `Selector "${selector}" does not exist on the page. Please use an element with a valid data-ai-index.`;

      return {
        success: false,
        selectorExists: false,
        availableSelectors: formattedElements,
      };
    }

    // Use the validated selector for actions
    action.selector = selector;

    switch (action.action) {
      case "click":
        const targetInfo = await page
          .evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el instanceof HTMLAnchorElement) {
              return { href: el.href, target: el.target };
            }
            return null;
          }, action.selector)
          .catch(() => null);

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
    return { success: false, selectorExists: true };
  }
};

// Helper function to get available elements with their data-ai-index values
async function getAvailableElements(page: Page): Promise<ClickableElement[]> {
  try {
    return await getPageElements(page);
  } catch (error) {
    console.error("Error getting available elements:", error);
    return [];
  }
}

// Modify the testDemoLink function signature
export const testDemoLink = async (
  url: string,
  testProfile: any,
  providedGoals: string[]
): Promise<Step[]> => {
  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 300, // Slightly faster while still stable
  });

  // Use provided goals if available, otherwise use the default goals
  const goals = providedGoals;

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

        // Get the current active page (will be updated if new tabs are opened)
        let activePage = (await context.pages())[0];

        // Action loop for current goal
        while (!currentStep.completed && maxActions > 0) {
          try {
            // Get the most recent page
            const pages = await context.pages();
            activePage = pages[pages.length - 1];

            console.log(`\nActive page: ${activePage.url()}`);

            // Determine next action with potential selector feedback
            const { action, subtask } = await determineNextActionAndSubtask(
              context,
              goal,
              actionHistory,
              goals,
              goalIndex,
              testProfile,
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

            // Execute the action on the active page
            console.log(`Executing on active page: ${activePage.url()}`);
            const { success, newPage, selectorExists, availableSelectors } =
              await enhancedExecutePageAction(activePage, action, context);

            // If a new page was opened, update the active page
            if (newPage) {
              console.log(`New page opened: ${newPage.url()}`);
              activePage = newPage;
              // Focus on the new page
              await newPage.bringToFront();
            }

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
              pageUrl: activePage.url(), // Use the current active page URL
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
    console.log("Browser closed. Tests completed.");
  }

  return testStructure;
};

// Update determineNextActionAndSubtask function to use the most recent page context instead of all page contexts
const determineNextActionAndSubtask = async (
  context: BrowserContext,
  currentGoal: string,
  actionHistory: ActionHistory[],
  allGoals: string[],
  currentGoalIndex: number,
  profileToUse: any,
  selectorFeedback?: { invalidSelector: string; availableSelectors: string[] }
): Promise<{ action: EnhancedPageAction; subtask: SubTask }> => {
  // Get context from only the most recent page instead of all open pages
  const pageContext = await getMostRecentPageContext(context);

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
    model: openai("gpt-4o", {
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
                "The selector to use for the action. Use either the index of the element or its data-ai-index value."
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
    
    Current page and its elements:
    ${JSON.stringify(pageContext)}
    
    Previous actions taken (ACTION HISTORY):
    ${JSON.stringify(actionHistory)}

    USER PROFILE:
    ${JSON.stringify(profileToUse)}
    
    Current goal: "${currentGoal}" (${currentGoalIndex + 1} of ${
      allGoals.length
    })
    ${nextGoal ? `Next goal: "${nextGoal}"` : "This is the final goal"}
    
    ${feedbackMessage}
    
    Consider:
    1. Don't repeat previous actions unless necessary. Check to see if action history already has this action, and was successful. If not, make a change.
    2. Choose the most appropriate next subtask that progresses toward completing the current goal.
    3. IMPORTANT: For the selector, use the numerical index (e.g. "0", "1", "2") or the data-ai-index value (e.g. "ai-0", "ai-1").
       These are the most reliable ways to identify elements.
    4. Consider only the current page when planning the action.
    5. Indicate if you believe the goal is now complete based on the action history and current state.
    6. IMPORTANT: You can decide to advance to the next goal if you determine that the current goal is semantically complete
       based on the actions taken so far. This is different from isGoalComplete - it's about your assessment of the situation.
    7. IMPORTANT: Only use selectors that are actually present in the current page. Do not hallucinate selectors.
    
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
