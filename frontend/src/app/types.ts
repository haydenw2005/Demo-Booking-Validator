export interface TestResult {
  status: "success" | "error" | "loading";
  message: string;
  statusCode?: number;
  details?: { result: Step[] };
}

export interface Subtask {
  description: string;
  success: string;
  error: string;
}

export interface Step {
  description: string;
  success: string;
  subtasks: Subtask[];
  completed: boolean;
  error?: string;
}

export interface Subtask {
  description: string;
  success: string;
  error: string;
}
