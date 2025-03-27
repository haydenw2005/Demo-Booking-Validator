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
