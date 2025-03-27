import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { Step, Subtask, TestResult } from "../app/types";
import { Badge } from "./test-badge";

export default function TestResultsDisplay({
  results,
}: {
  results: TestResult;
}) {
  console.log(results);
  const steps = results.details?.result;
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
        <CardDescription>
          Execution summary with{" "}
          {steps?.filter((step) => step.completed).length} of {steps?.length}{" "}
          steps completed successfully
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-4">
          {steps?.map((step, index) => (
            <StepItem key={index} step={step} index={index} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function StepItem({ step, index }: { step: Step; index: number }) {
  return (
    <AccordionItem
      value={`step-${index}`}
      className="border rounded-lg overflow-hidden"
    >
      <div
        className={`flex items-center p-4 ${
          step.completed ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <StatusIcon success={step.completed} />
        <div className="ml-3 flex-1">
          <h3 className="font-medium text-sm">
            Step {index + 1}:{" "}
            {step.description.length > 100
              ? `${step.description.slice(0, 100)}...`
              : step.description}
          </h3>
        </div>
        <Badge
          variant={step.completed ? "success" : "destructive"}
          className="ml-2"
        >
          {step.completed ? "Completed" : "Failed"}
        </Badge>
        <AccordionTrigger className="ml-2" />
      </div>
      <AccordionContent className="px-0">
        <div className="border-t pt-2 pb-1 px-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Subtasks
          </h4>
          <div className="space-y-2">
            {step.subtasks.map((subtask, subtaskIndex) => (
              <SubtaskItem key={subtaskIndex} subtask={subtask} />
            ))}
          </div>
          {step.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <strong>Error:</strong> {step.error}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SubtaskItem({ subtask }: { subtask: Subtask }) {
  const success = subtask.success === "true";

  return (
    <div
      className={`p-3 rounded-md ${
        success ? "bg-green-50" : "bg-red-50"
      } flex items-start`}
    >
      <StatusIcon success={success} className="mt-0.5" />
      <div className="ml-3 flex-1">
        <p className="text-sm">{subtask.description}</p>
        {subtask.error && (
          <p className="text-xs text-red-600 mt-1">{subtask.error}</p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({
  success,
  className = "",
}: {
  success: boolean;
  className?: string;
}) {
  return success ? (
    <CheckCircle className={`h-5 w-5 text-green-600 ${className}`} />
  ) : (
    <XCircle className={`h-5 w-5 text-red-600 ${className}`} />
  );
}
