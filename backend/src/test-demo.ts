import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import dotenv from "dotenv";
import { Browser, BrowserContext, chromium, Frame, Page } from "playwright";
import { ACTION_SUBTASK_PROMPT } from "./constants";
import {
  ACTION_SUBTASK_SCHEMA,
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

// Gets all important elements from the page and injects data-ai-index attributes
const getPageElements = async (page: Page): Promise<ClickableElement[]> => {
  try {
    // give some leeway incase JS or CSS or whatever is still loading
    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
      page
        .waitForLoadState("domcontentloaded", { timeout: 5000 })
        .catch(() => {}),
    ]);

    console.log(`Extracting elements from: ${page.url()}`);

    // First, inject data-ai-index attributes into the DOM elements of main page
    await page.evaluate(() => {
      // Generate a unique prefix for this page
      const pageId = Math.random().toString(36).substring(2, 8);

      // Select all interactive elements
      const elements = document.querySelectorAll(
        'a, button, input, textarea, [onclick], [data-testid], [role="button"], [role="link"], [type="submit"], [type="button"]'
      );

      // Filter visible elements and inject data-ai-index attribute
      elements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        if (
          // style.display !== "none" &&
          // style.visibility !== "hidden" &&
          // style.opacity !== "0"
          true
        ) {
          // THIS INJECTION IS CRITICAL FOR THE AGENT TO WORK, AND IS THE ONLY WAY TO RELIABLY INDEX ELEMENTS
          if (!el.hasAttribute("data-ai-index")) {
            el.setAttribute("data-ai-index", `ai-${pageId}-${index}`);
            index++;
          }
        }
      });
    });

    // Get elements from main page
    const mainElements = await extractElementsFromFrame(page);

    // Get all iframes on the page
    const frameElements: ClickableElement[] = [];
    const frames = page.frames();

    // Process each iframe
    for (const frame of frames) {
      // Skip the main frame (already processed)
      if (frame === page.mainFrame()) continue;

      try {
        console.log(`Processing iframe: ${frame.url()}`);

        // Inject data-ai-index attributes into iframe elements
        await frame
          .evaluate(() => {
            // Generate a unique prefix for this iframe
            const frameId = `frame-${Math.random()
              .toString(36)
              .substring(2, 8)}`;

            // Select all interactive elements in the iframe
            const elements = document.querySelectorAll(
              'a, button, input, textarea, [onclick], [data-testid], [role="button"], [role="link"], [type="submit"], [type="button"]'
            );

            // Filter visible elements and inject data-ai-index attribute
            elements.forEach((el, index) => {
              const style = window.getComputedStyle(el);
              if (true) {
                if (!el.hasAttribute("data-ai-index")) {
                  el.setAttribute("data-ai-index", `ai-${frameId}-${index}`);
                  index++;
                }
              }
            });
          })
          .catch((error) => {
            console.error(
              `Failed to inject data-ai-index into iframe: ${error.message}`
            );
          });

        // Extract elements from the iframe
        const iframeElements = await extractElementsFromFrame(frame);
        frameElements.push(...iframeElements);
      } catch (error) {
        console.error(`Error processing iframe: ${error}`);
      }
    }

    // Combine elements from main page and iframes
    const allElements = [...mainElements, ...frameElements];
    console.log(
      `Found ${allElements.length} elements in total (${mainElements.length} from main page, ${frameElements.length} from iframes)`
    );

    return allElements;
  } catch (error) {
    console.error(`Error with page ${page.url()}: ${error}`);
    return [];
  }
};

// Helper function to extract elements from a frame (main page or iframe)
const extractElementsFromFrame = async (
  frame: Page | Frame
): Promise<ClickableElement[]> => {
  try {
    const elements = await frame
      .$$eval(
        'a, button, input, textarea, [onclick], [data-testid], [role="button"], [role="link"], [type="submit"], [type="button"]',
        (els: Element[]) => {
          return els
            .filter((el) => {
              const style = window.getComputedStyle(el as HTMLElement);
              return (
                // style.display !== "none" &&
                // style.visibility !== "hidden" &&
                // style.opacity !== "0"
                true
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

              // Identify if element is from an iframe
              const frameIdentifier: "iframe" | "main" = dataAiIndex.includes(
                "frame-"
              )
                ? "iframe"
                : "main";

              // Return the element with its data-ai-index attribute, alongside other fields important for the agent to know
              // the purpose of the element
              return {
                index: idx,
                tag: htmlEl.tagName,
                text,
                href,
                id: htmlEl.id || "",
                name: htmlEl.getAttribute("name") || "",
                type: htmlEl.getAttribute("type") || "",
                time: htmlEl.getAttribute("data-time") || "",
                dataAiIndex, // Include the data-ai-index in the returned data
                frameType: frameIdentifier, // Indicate if element is from iframe or main page
              };
            });
        }
      )
      .catch((error) => {
        console.error(`Element extraction error in frame: ${error.message}`);
        return [];
      });

    return elements;
  } catch (error) {
    console.error(`Error extracting elements from frame: ${error}`);
    return [];
  }
};

// Helper function that handles opening new browser tabs/windows by waiting for page creation and load
// Returns the new page object after executing the click action and waiting for load states
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

// Validates if a selector exists on the page
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

// Executes a page action on the current page, using the action defined by the agent
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
    let targetFrame: Page | Frame = page;

    // Case 1: If selector is a number (index), convert to data-ai-index
    // Not actually sure if this is still needed, but keeping it here for now
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

      // Check if the element is in an iframe
      if (targetElement.frameType === "iframe") {
        console.log(
          "Target element is in an iframe, locating the correct frame"
        );
        // Extract the frame id from the dataAiIndex (format: ai-frame-xxx-n)
        const frameIdMatch = targetElement.dataAiIndex.match(
          /ai-(frame-[a-z0-9]+)-\d+/
        );
        if (frameIdMatch && frameIdMatch[1]) {
          const framePrefix = frameIdMatch[1];
          // Find the frame that has elements with this prefix
          const frames = page.frames();
          for (const frame of frames) {
            if (frame === page.mainFrame()) continue;
            // Check if this frame contains our target element
            const hasElement = await frame
              .evaluate((dataAiIndex) => {
                return !!document.querySelector(
                  `[data-ai-index="${dataAiIndex}"]`
                );
              }, targetElement.dataAiIndex)
              .catch(() => false);

            if (hasElement) {
              targetFrame = frame;
              console.log(`Found target element in frame: ${frame.url()}`);
              break;
            }
          }
        }
      }
    }
    // Case 2: If selector starts with "ai-", assume it's already a data-ai-index, and not lets use it as a selector
    else if (
      typeof action.selector === "string" &&
      action.selector.startsWith("ai-")
    ) {
      selector = `[data-ai-index="${action.selector}"]`;

      // Check if this selector might be in an iframe
      if (action.selector.includes("frame-")) {
        console.log("Selector might be in an iframe, checking all frames");
        const frames = page.frames();
        for (const frame of frames) {
          if (frame === page.mainFrame()) continue;

          // Check if this frame contains our target element
          const hasElement = await frame
            .evaluate((selector) => {
              return !!document.querySelector(selector);
            }, selector)
            .catch(() => false);

          if (hasElement) {
            targetFrame = frame;
            console.log(`Found target element in frame: ${frame.url()}`);
            break;
          }
        }
      }
    }

    // Validate the selector exists on the target frame
    const selectorExists = await validateSelectorInFrame(targetFrame, selector);

    // critical part of the evaluation loop!!!! Will get passed back to the agent to help reduce hallucination and understand mistake
    if (!selectorExists) {
      // If selector doesn't exist, get available selectors as hints
      const availableElements = await getPageElements(page);
      console.log(
        `Selector "${selector}" does not exist on the page or any iframe`
      );

      // Create formatted strings for each element
      const formattedElements = availableElements.map(
        (el) =>
          `${el.tag} with text "${el.text}" (index: ${
            el.index
          }, data-ai-index: ${el.dataAiIndex}, frame: ${
            el.frameType || "main"
          })`
      );

      action.success = false;
      action.error = `Selector "${selector}" does not exist on the page or any iframe. Please use an element with a valid data-ai-index.`;

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
        // Check if we're dealing with an iframe element that might open a link
        if (targetFrame !== page) {
          // For iframe elements, we handle clicks differently
          console.log(`Clicking element in iframe: ${selector}`);
          const targetInfo = await (targetFrame as Frame)
            .evaluate((selector) => {
              const el = document.querySelector(selector);
              if (el instanceof HTMLAnchorElement) {
                return { href: el.href, target: el.target };
              }
              return null;
            }, selector)
            .catch(() => null);

          // Click the element in the iframe
          await (targetFrame as Frame).click(selector);

          // If it's an anchor with target="_blank", it might open in a new tab
          // But since it's in an iframe, we need to wait for a possible new page
          if (targetInfo && targetInfo.href) {
            const newPage = await context
              .waitForEvent("page", { timeout: 5000 })
              .catch(() => null);
            if (newPage) {
              await newPage
                .waitForLoadState("domcontentloaded")
                .catch(() => {});
              return { success: true, newPage, selectorExists: true };
            }
          }

          // If no new page was opened, we still clicked successfully
          return { success: true, selectorExists: true };
        }

        // For main page elements, use the original logic
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
        }

        // if not anchor tag, wait until page settles before moving ons
        else {
          const pagePromise = context
            .waitForEvent("page", { timeout: 5000 })
            .catch(() => null);

          // Use the targetFrame for clicking
          await targetFrame.click(action.selector);
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

      // case for inputs, textareas, etc.
      case "fill":
        if (!action.value) throw new Error("Value required for fill action");
        await targetFrame.click(action.selector).catch(() => {}); // Try to focus first
        await targetFrame.fill(action.selector, action.value);
        break;

      // case for dropdowns
      case "select":
        if (!action.value) throw new Error("Value required for select action");
        await targetFrame.selectOption(action.selector, action.value);
        break;

      // case for waiting, maybe an action is simply to check if something exists, etc.
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

// Validates if a selector exists on a given frame
async function validateSelectorInFrame(
  frame: Page | Frame,
  selector: string
): Promise<boolean> {
  try {
    // Check if the selector exists on the frame
    const count = await frame.$$eval(selector, (elements) => elements.length);
    return count > 0;
  } catch (error) {
    // If there's an error evaluating the selector, it's invalid
    return false;
  }
}

// This is THE critical agent function. It determines the next action and subtask.
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

  // Determine if there's another goal to complete, important for deciding if we should advance to next goal.
  const nextGoal =
    currentGoalIndex < allGoals.length - 1
      ? allGoals[currentGoalIndex + 1]
      : null;

  // Add feedback about hallucinated selectors if available!!! So knows not to make same mistake again, etc. reduce hallucination.
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
    schema: ACTION_SUBTASK_SCHEMA,
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
    
    ${ACTION_SUBTASK_PROMPT}`,
  });

  // Transform result to the expected format
  const generatedResult = result.object as {
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

// PRIMARY AGENT LOOP
export const beginAgentLoop = async (
  url: string,
  testProfile: any,
  providedGoals: string[]
): Promise<Step[]> => {
  const goals = providedGoals;

  // Launch browser
  const browser: Browser = await chromium.launch({
    headless: false,
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 3000 });
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

        // Action/subtask chaining loop for current goal
        while (!currentStep.completed && maxActions > 0) {
          try {
            // Get the most recent page
            const pages = await context.pages();
            activePage = pages[pages.length - 1];

            console.log(`\nActive page: ${activePage.url()}`);

            // Determine next action and subtask with potential selector feedback and page context
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

            // Check if goal is complete based off of llm response
            if (action.isGoalComplete) {
              currentStep.completed = true;
              currentStep.success = "true";
              //subtask.success = "true";
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

            // Record the action, used as context for next action and all future actions
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
