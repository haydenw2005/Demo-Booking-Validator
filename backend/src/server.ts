import cors from "cors";
import express from "express";
import { beginAgentLoop } from "./test-demo";
const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/test", async (req, res) => {
  try {
    const { url, testProfile, goals } = req.body;

    if (!testProfile || Object.keys(testProfile).length === 0) {
      throw new Error("Test profile cannot be empty");
    }
    if (!goals || goals.length === 0) {
      throw new Error("Test goals cannot be empty");
    }

    const profileToUse = testProfile;
    const goalsToUse = goals;

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
