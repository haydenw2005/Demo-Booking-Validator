import cors from "cors";
import express from "express";
import { beginAgentLoop } from "./test-demo";
const app = express();
app.use(cors());
app.use(express.json());

// Default values if not provided by the frontend
const defaultTestProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  company: "Example Inc.",
  jobTitle: "Software Engineer",
  country: "United States",
  timezone: "America/New_York",
};

const defaultGoals = [
  'Detect "Book a Demo" (or similar) buttons/links',
  "Click through to the booking flow",
  "Fill out any required forms",
  "Complete the meeting scheduling process",
  "Verify the booking was successful (e.g., confirmation page)",
];

app.post("/api/test", async (req, res) => {
  try {
    const { url, testProfile, goals } = req.body;

    // Use provided values or fall back to defaults
    const profileToUse = testProfile || defaultTestProfile;
    const goalsToUse = goals || defaultGoals;

    console.log("Running test with:", {
      url,
      profile: profileToUse,
      goals: goalsToUse,
    });

    const result = await beginAgentLoop(url, profileToUse, goalsToUse);

    res.json({ success: true, result });
  } catch (error) {
    console.error("Test error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(4000, () => console.log("Backend running on port 4000"));
