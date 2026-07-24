export const SAMPLE_FINDINGS = [
  {
    title: "Saturday hours differ across two public listings.",
    severity: "High",
    impact: "Customers may arrive after the business has closed.",
    source: "Google Business Profile + website footer",
    valueFound: "Google: closes 5:00 PM; website: closes 3:00 PM",
    expectedValue: "One confirmed Saturday closing time",
    confidence: "High",
    action: "Confirm Saturday hours and update every public listing from the same source of truth.",
    status: "Open"
  },
  {
    title: "The main booking link returns an error.",
    severity: "Critical",
    impact: "Mobile visitors cannot complete an appointment.",
    source: "Website booking button",
    valueFound: "Booking URL returns an error page",
    expectedValue: "Working appointment destination",
    confidence: "High",
    action: "Repair or replace the booking URL, then test it from a phone.",
    status: "Open"
  },
  {
    title: "Two primary services are missing from the Google Business Profile.",
    severity: "Medium",
    impact: "The business may not appear for relevant searches.",
    source: "Google Business Profile services",
    valueFound: "Emergency repairs and weekend appointments not listed",
    expectedValue: "Core services listed in the profile and website",
    confidence: "Medium",
    action: "Add the missing services and align the wording with the website.",
    status: "Needs verification"
  }
];

export const SAMPLE_CATEGORY_SCORES = [
  ["Information Accuracy", 82],
  ["Search Visibility", 67],
  ["Customer Trust", 71],
  ["Conversion Paths", 45]
];
