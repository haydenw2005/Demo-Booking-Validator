"use client";
import EditableGoals from "@/components/editable-goals";
import EditableProfile from "@/components/editable-profile";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import Header from "../components/header";
import TestResultsDisplay from "../components/test-results-display";
import { TestResult } from "./types";

// Import or define TestProfile type
interface TestProfile {
  [key: string]: string;
}

export default function Home() {
  const [url, setUrl] = useState("https://www.revyl.ai/");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // Default test profile
  const [testProfile, setTestProfile] = useState<TestProfile>({
    name: "John Doe",
    email: "johndoe@gmail.com",
    phone: "2063037777",
    company: "Example Inc.",
    jobTitle: "Software Engineer",
    additionalInfo:
      "this is a test profile for my AI agent demo booking test agent",
  });

  // Default goals
  const [goals, setGoals] = useState([
    'Detect and click "Book a Demo" (or similar) buttons/links',
    `Click through to the booking flow, Select the data and time to book`,
    "Fill out any required forms",
    "Complete the meeting scheduling process",
    "Verify the booking was successful (e.g., confirmation page)",
  ]);

  // Handle test profile changes
  const handleProfileChange = (updatedProfile: typeof testProfile) => {
    setTestProfile(updatedProfile);
  };

  // Handle goals changes
  const handleGoalsChange = (updatedGoals: string[]) => {
    setGoals(updatedGoals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    // Update the second goal with the current test profile

    try {
      const response = await fetch("http://localhost:4000/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          testProfile,
          goals,
        }),
      });

      const data = await response.json();
      setResult({
        status: response.ok ? "success" : "error",
        statusCode: response.status,
        message: data.message || "Test completed",
        details: data,
      });
    } catch (error: unknown) {
      console.error(error);
      setResult({
        status: "error",
        message: "Failed to connect to the server",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-3xl mx-auto">
          <div className="bg-white shadow sm:rounded-lg p-6 ">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Test Demo Booking Flow
            </h2>
            <form onSubmit={handleSubmit} className="space-yt-6 space-y-3">
              <div>
                <label
                  htmlFor="url"
                  className="text-md font-medium text-gray-700 ml-2"
                >
                  Landing Page URL
                </label>
                <div className="mt-1">
                  <Input
                    type="url"
                    name="url"
                    id="url"
                    required
                    className="w-full transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 h-11"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Test Configuration Accordions */}
              <EditableProfile
                initialProfile={testProfile}
                onProfileChange={handleProfileChange}
              />
              <EditableGoals
                initialGoals={goals}
                onGoalsChange={handleGoalsChange}
              />

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    isLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? "Testing..." : "Start Test"}
                </button>
              </div>
            </form>
            {/* Result Display */}
          </div>
        </div>
        <div className="mt-6">
          {/* Conditional rendering based on application state */}
          {isLoading ? (
            <TestResultsDisplay
              results={{ status: "loading", message: "Running tests..." }}
              isLoading={true}
            />
          ) : result ? (
            <TestResultsDisplay results={result} isLoading={false} />
          ) : (
            <TestResultsDisplay
              results={{ status: "loading", message: "" }}
              isLoading={false}
              showInitialState={true}
            />
          )}
        </div>
      </main>
    </div>
  );
}
