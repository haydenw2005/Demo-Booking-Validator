import { z } from "zod";

export const ACTION_SUBTASK_SCHEMA = z
  .object({
    subtask: z
      .object({
        description: z.string().describe("Clear description of this subtask"),
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
          .describe("Explanation for why we should advance to the next goal")
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
  .required();

export type ClickableElement = {
  index: number;
  tag: string;
  text: string;
  href: string;
  dataAiIndex: string;
};

export type SubTask = {
  description: string;
  error?: string;
  success: "true" | "false" | "not attempted";
};

export type Step = {
  description: string;
  error?: string;
  success: "true" | "false" | "not attempted";
  subtasks: SubTask[];
  completed: boolean;
};

export type PageAction = {
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
export type ActionHistory = {
  success: boolean;
  timestamp: number;
  pageUrl: string;
  explanation: string;
  purpose?: string; // Adding purpose field to track context
};

export type PageContext = {
  url: string;
  elements: ClickableElement[];
};

// Enhanced action response type with purpose
export type EnhancedPageAction = PageAction & {
  purpose: string; // Adding purpose field to explain the context/reason for this action
  advanceToNextGoal?: boolean; // Flag indicating whether to advance to the next goal
  advanceReason?: string; // Explanation for why advancing to the next goal
};
