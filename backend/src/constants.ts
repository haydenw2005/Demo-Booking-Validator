export const TEST_STRUCUTRE = [
  {
    description: 'Detect "Book a Demo" (or similar) buttons/links',
    error: undefined,
    success: "not attempted",
    subtasks: [
      {
        description: "Navigate to the target webpage using Playwright.",
        success: false,
        error: "",
      },
      {
        description:
          "Use Playwright to identify all buttons and links on the page.",
        success: false,
        error: "",
      },
      {
        description:
          "Filter the identified elements to find those containing the text 'Book a Demo' or similar phrases.",
        success: false,
        error: "",
      },
      {
        description:
          "Click on each filtered button or link to verify it leads to a demo booking page or form.",
        success: false,
        error: "",
      },
    ],
  },
  {
    description: "Click through to the booking flow",
    error: undefined,
    success: "not attempted",
    subtasks: [
      {
        description: "Navigate to the homepage URL.",
        success: true,
        error: "",
      },
      {
        description:
          "Locate and click on the 'Book Now' button on the homepage.",
        success: true,
        error: "",
      },
      {
        description: "Wait for the booking page to load completely.",
        success: true,
        error: "",
      },
      {
        description:
          "Identify and click on the 'Select Dates' field to open the calendar.",
        success: true,
        error: "",
      },
      {
        description: "Choose the desired check-in date from the calendar.",
        success: true,
        error: "",
      },
      {
        description: "Select the desired check-out date from the calendar.",
        success: true,
        error: "",
      },
      {
        description: "Click on the 'Confirm Dates' button to proceed.",
        success: true,
        error: "",
      },
      {
        description:
          "Locate and click on the 'Select Room' button to view available rooms.",
        success: true,
        error: "",
      },
      {
        description:
          "Choose a room type by clicking on the 'Select' button next to the desired room.",
        success: true,
        error: "",
      },
      {
        description: "Click on the 'Proceed to Checkout' button to continue.",
        success: true,
        error: "",
      },
    ],
  },
  {
    description:
      'Fill out any required forms with the following profile: {"name":"John Doe","email":"john.doe@example.com","phone":"+1234567890","company":"Example Inc.","jobTitle":"Software Engineer","country":"United States","timezone":"America/New_York"}',
    error: undefined,
    success: "not attempted",
    subtasks: [
      {
        description: "Navigate to the webpage containing the required forms.",
        success: false,
        error: "Page not found or URL incorrect.",
      },
      {
        description: "Locate the 'Name' input field and enter 'John Doe'.",
        success: false,
        error: "Input field not found or not interactable.",
      },
      {
        description:
          "Locate the 'Email' input field and enter 'john.doe@example.com'.",
        success: false,
        error: "Input field not found or not interactable.",
      },
      {
        description: "Locate the 'Phone' input field and enter '+1234567890'.",
        success: false,
        error: "Input field not found or not interactable.",
      },
      {
        description:
          "Locate the 'Company' input field and enter 'Example Inc.'.",
        success: false,
        error: "Input field not found or not interactable.",
      },
      {
        description:
          "Locate the 'Job Title' input field and enter 'Software Engineer'.",
        success: false,
        error: "Input field not found or not interactable.",
      },
      {
        description:
          "Locate the 'Country' dropdown and select 'United States'.",
        success: false,
        error: "Dropdown not found or not interactable.",
      },
      {
        description:
          "Locate the 'Timezone' dropdown and select 'America/New_York'.",
        success: false,
        error: "Dropdown not found or not interactable.",
      },
      {
        description: "Locate and click the 'Submit' button to send the form.",
        success: false,
        error: "Button not found or not interactable.",
      },
    ],
  },
  {
    description: "Complete the meeting scheduling process",
    error: undefined,
    success: "not attempted",
    subtasks: [
      {
        description: "Navigate to the meeting scheduling page.",
        success: true,
        error: "",
      },
      {
        description: "Click on the 'Schedule a Meeting' button.",
        success: true,
        error: "",
      },
      {
        description:
          "Fill out the 'Meeting Title' input field with the desired title.",
        success: true,
        error: "",
      },
      {
        description: "Select the date from the 'Date Picker' for the meeting.",
        success: true,
        error: "",
      },
      {
        description:
          "Choose the start time from the 'Start Time' dropdown menu.",
        success: true,
        error: "",
      },
      {
        description: "Choose the end time from the 'End Time' dropdown menu.",
        success: true,
        error: "",
      },
      {
        description:
          "Enter the meeting location in the 'Location' input field.",
        success: true,
        error: "",
      },
      {
        description:
          "Add participants by entering their email addresses in the 'Participants' input field.",
        success: true,
        error: "",
      },
      {
        description:
          "Click on the 'Add Agenda' button to open the agenda input field.",
        success: true,
        error: "",
      },
      {
        description:
          "Fill out the 'Agenda' input field with the meeting agenda details.",
        success: true,
        error: "",
      },
      {
        description: "Click on the 'Save' button to save the meeting details.",
        success: true,
        error: "",
      },
      {
        description:
          "Click on the 'Send Invitations' button to notify participants.",
        success: true,
        error: "",
      },
    ],
  },
  {
    description: "Verify the booking was successful (e.g., confirmation page)",
    error: undefined,
    success: "not attempted",
    subtasks: [
      {
        description: "Navigate to the booking confirmation page URL.",
        success: false,
        error: "",
      },
      {
        description: "Wait for the confirmation page to load completely.",
        success: false,
        error: "",
      },
      {
        description:
          "Check for the presence of a confirmation message element on the page.",
        success: false,
        error: "",
      },
      {
        description:
          "Verify the booking reference number is displayed on the page.",
        success: false,
        error: "",
      },
      {
        description:
          "Ensure the booking details (e.g., date, time, location) are correctly displayed.",
        success: false,
        error: "",
      },
      {
        description:
          "Look for a 'Print Confirmation' or 'Download PDF' button to confirm additional options are available.",
        success: false,
        error: "",
      },
    ],
  },
];
