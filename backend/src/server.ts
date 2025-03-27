import cors from "cors";
import express from "express";
import { testDemoLink } from "./test-demo";

const app = express();
app.use(cors());
app.use(express.json());

const testProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  company: "Example Inc.",
  jobTitle: "Software Engineer",
  country: "United States",
  timezone: "America/New_York",
};

const goals = [
  'Detect "Book a Demo" (or similar) buttons/links',
  "Click through to the booking flow",
  "Fill out any required forms",
  "Complete the meeting scheduling process",
  "Verify the booking was successful (e.g., confirmation page)",
];

let currentGoal = 0;

app.post("/api/test", async (req, res) => {
  const result = await testDemoLink(req.body.url);

  res.json({ success: true, body: req.body, result });
});

app.listen(4000, () => console.log("Backend running on port 4000"));
