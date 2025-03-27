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
import { CheckCircle, TestTubeDiagonal, XCircle } from "lucide-react";
import { Step, Subtask, TestResult } from "../app/types";
import { Badge } from "./test-badge";

// Progress circle component for showing completion percentages
function ProgressCircle({
  percentage,
  size = 80,
  label,
  count,
  total,
}: {
  percentage: number;
  size?: number;
  label: string;
  count: number;
  total: number;
}) {
  // Calculate SVG parameters
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={percentage === 100 ? "#10b981" : "#3b82f6"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">
          {count} of {total} completed
        </p>
      </div>
    </div>
  );
}

// Loading animation component
function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-48 h-48">
        {/* Outer spinning circle */}
        <div className="absolute inset-0 animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            {/* Dashed circle with gradient */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray="21,10"
            />
            {/* Small circles around the perimeter */}
            {/* {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const x = 50 + 40 * Math.cos((angle * Math.PI) / 180);
              const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={i % 2 === 0 ? "#3b82f6" : "#10b981"}
                  className={`animate-pulse`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              );
            })} */}
          </svg>
        </div>

        {/* Inner content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-md">
            <div className="text-lg font-bold text-indigo-600 animate-pulse">
              Testing
            </div>
            <div className="flex space-x-1 mt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-6 text-indigo-700 font-medium animate-pulse">
        Running automated tests...
      </p>
      <p className="text-sm text-gray-500 mt-2 max-w-md text-center">
        The AI agent is navigating the website, looking for demo booking
        options, and attempting to complete the booking flow.
      </p>
    </div>
  );
}

// Get Started component
function GetStartedDisplay() {
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-24 h-24 mb-6 group">
        {/* Background circle with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full transition-all duration-300 group-hover:from-indigo-100 group-hover:to-indigo-200"></div>

        {/* Inner spinning container for the icon - spins continuously but speeds up on hover */}
        <div className="absolute inset-0 flex items-center justify-center animate-spin-slow group-hover:animate-spin transition-all duration-300">
          <TestTubeDiagonal className="h-12 w-12 text-indigo-600" />
        </div>

        {/* Outer ring that always spins in opposite direction and becomes more visible on hover */}
        <div className="absolute inset-[-4px] border-2 border-indigo-300 border-dashed rounded-full opacity-40 group-hover:opacity-100 transition-all duration-300 animate-spin-slow-reverse"></div>
      </div>
      <h3 className="text-lg font-medium text-gray-800">
        Run some tests to get started
      </h3>
      <p className="mt-2 text-sm text-gray-500 max-w-md text-center">
        Enter a website URL, configure your test profile and goals, then click
        the &quot;Start Test&quot; button above.
      </p>
    </div>
  );
}

export default function TestResultsDisplay({
  results,
  isLoading = false,
  showInitialState = false,
}: {
  results: TestResult;
  isLoading?: boolean;
  showInitialState?: boolean;
}) {
  // Show "get started" screen if explicitly requested
  if (showInitialState) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <GetStartedDisplay />
        </CardContent>
      </Card>
    );
  }

  // Show loading animation if isLoading is true
  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <LoadingAnimation />
        </CardContent>
      </Card>
    );
  }

  console.log(results);

  const steps = results.details?.result;

  // Calculate completion metrics
  const completedSteps = steps?.filter((step) => step.completed).length || 0;
  const totalSteps = steps?.length || 0;
  const stepsPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Calculate subtask completion
  let completedSubtasks = 0;
  let totalSubtasks = 0;

  steps?.forEach((step) => {
    step.subtasks.forEach((subtask) => {
      totalSubtasks++;
      if (subtask.success === "true") {
        completedSubtasks++;
      }
    });
  });

  const subtasksPercentage =
    totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

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
        {/* Progress Summary Section */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-base font-medium text-gray-700 mb-4">
            Progress Summary
          </h3>
          <div className="flex justify-around items-center">
            <ProgressCircle
              percentage={stepsPercentage}
              label="Steps"
              count={completedSteps}
              total={totalSteps}
            />
            <ProgressCircle
              percentage={subtasksPercentage}
              label="Subtasks"
              count={completedSubtasks}
              total={totalSubtasks}
            />
          </div>
        </div>

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
