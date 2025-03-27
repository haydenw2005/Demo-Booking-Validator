"use client";
import React, { useState } from "react";
import Header from "./components/Header";

interface TestResult {
  status: "success" | "error";
  message: string;
  statusCode?: number;
  details?: any;
}

export default function Home() {
  const [url, setUrl] = useState("https://www.revyl.ai/");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:4000/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setResult({
        status: response.ok ? "success" : "error",
        statusCode: response.status,
        message: data.message || "Test completed",
        details: data,
      });
    } catch (error) {
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Test Demo Booking Flow
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700"
                >
                  Landing Page URL
                </label>
                <div className="mt-1">
                  <input
                    type="url"
                    name="url"
                    id="url"
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 h-8 text-gray-900"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter the URL of the landing page you want to test
                </p>
              </div>
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
            {result && (
              <div
                className={`mt-6 p-4 rounded-md ${
                  result.status === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {result.status === "success" ? (
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3
                      className={`text-sm font-medium ${
                        result.status === "success"
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {result.status === "success" ? "Success" : "Error"}
                    </h3>
                    <div className="mt-2 text-sm text-gray-700">
                      <p>{result.message}</p>
                      {result.statusCode && (
                        <p className="mt-1">Status Code: {result.statusCode}</p>
                      )}
                      {result.details && (
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-[300px] overflow-y-auto w-full ">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
