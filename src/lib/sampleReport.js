export const SAMPLE_REPORTS = [
  {
    businessName: "Harbor City Dental",
    score: 68,
    summary: "Three issues may be costing this business customers.",
    categoryScores: [
      ["Information Accuracy", 82],
      ["Search Visibility", 67],
      ["Customer Trust", 71],
      ["Conversion Paths", 45]
    ],
    fixFirst: {
      title: "Repair the booking link.",
      body: "It directly blocks customer action and can be corrected immediately."
    },
    findings: [
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
    ]
  },
  {
    businessName: "Maple Street Cafe",
    score: 74,
    summary: "Several public details are close, but ordering friction still blocks ready customers.",
    categoryScores: [
      ["Information Accuracy", 88],
      ["Search Visibility", 72],
      ["Customer Trust", 79],
      ["Conversion Paths", 56]
    ],
    fixFirst: {
      title: "Align menu prices across public pages.",
      body: "Conflicting prices make customers hesitate before ordering or visiting."
    },
    findings: [
      {
        title: "Menu prices differ between Google and the website.",
        severity: "High",
        impact: "Customers may lose trust before placing an order.",
        source: "Google menu + website menu page",
        valueFound: "Lunch combo listed at $13 on Google and $16 on the website",
        expectedValue: "One current menu price across all public surfaces",
        confidence: "High",
        action: "Update stale menu prices and add a reviewed-on date to the website menu.",
        status: "Open"
      },
      {
        title: "Online ordering link opens a desktop-only page on mobile.",
        severity: "Critical",
        impact: "Hungry mobile customers can abandon before checkout.",
        source: "Website order button",
        valueFound: "Ordering page overflows and hides the checkout button on mobile",
        expectedValue: "Mobile-friendly ordering flow",
        confidence: "High",
        action: "Replace the ordering link with a mobile-tested destination and verify checkout from a phone.",
        status: "Open"
      },
      {
        title: "Recent food photos are missing from the business profile.",
        severity: "Medium",
        impact: "Searchers have less visual proof when comparing nearby cafes.",
        source: "Google Business Profile photos",
        valueFound: "Newest customer-facing food photo is older than 10 months",
        expectedValue: "Recent menu and storefront photos",
        confidence: "Medium",
        action: "Add current photos for best-selling items, the storefront, and dining area.",
        status: "Needs verification"
      }
    ]
  },
  {
    businessName: "North Loop Fitness",
    score: 57,
    summary: "The business is visible, but trial-class and contact paths are unclear.",
    categoryScores: [
      ["Information Accuracy", 76],
      ["Search Visibility", 61],
      ["Customer Trust", 63],
      ["Conversion Paths", 32]
    ],
    fixFirst: {
      title: "Make the trial-class path obvious.",
      body: "Interested visitors need one clear action instead of guessing how to start."
    },
    findings: [
      {
        title: "The trial-class call-to-action is buried below the fold.",
        severity: "High",
        impact: "New prospects may leave before finding how to book a first class.",
        source: "Website homepage mobile view",
        valueFound: "Trial offer appears after staff bios and a long class description",
        expectedValue: "Clear trial-class button near the top of the page",
        confidence: "High",
        action: "Move the trial-class CTA near the hero area and repeat it after schedule details.",
        status: "Open"
      },
      {
        title: "Class schedule link returns an expired embed.",
        severity: "Critical",
        impact: "Ready customers cannot confirm a time before contacting the gym.",
        source: "Website schedule page",
        valueFound: "Schedule iframe shows an expired-session message",
        expectedValue: "Current public class schedule",
        confidence: "High",
        action: "Replace the expired embed with a current schedule link and test it in a private browser window.",
        status: "Open"
      },
      {
        title: "Two core categories are missing from the business profile.",
        severity: "Medium",
        impact: "The gym may miss searches for specific class types.",
        source: "Google Business Profile categories/services",
        valueFound: "Strength training and beginner fitness classes not listed",
        expectedValue: "Core class types listed consistently",
        confidence: "Medium",
        action: "Add the missing service categories and match wording to the website schedule.",
        status: "Needs verification"
      }
    ]
  },
  {
    businessName: "Oak & Ivy Salon",
    score: 83,
    summary: "Most trust signals are strong, with a few easy cleanup opportunities.",
    categoryScores: [
      ["Information Accuracy", 92],
      ["Search Visibility", 81],
      ["Customer Trust", 88],
      ["Conversion Paths", 70]
    ],
    fixFirst: {
      title: "Update stylist service details.",
      body: "Clear service names help customers choose the right appointment without calling first."
    },
    findings: [
      {
        title: "Color service names differ between booking and Google.",
        severity: "Medium",
        impact: "Customers may book the wrong service or pause to call for clarification.",
        source: "Booking page + Google Business Profile services",
        valueFound: "Balayage listed on booking page, but not on Google services",
        expectedValue: "Matching service language across booking and Google",
        confidence: "High",
        action: "Align high-value service names across the booking page and business profile.",
        status: "Needs verification"
      },
      {
        title: "Holiday hours are not posted yet.",
        severity: "High",
        impact: "Customers may assume the salon is unavailable during peak appointment weeks.",
        source: "Google Business Profile hours",
        valueFound: "No special hours listed for the upcoming holiday week",
        expectedValue: "Confirmed special hours before holiday traffic increases",
        confidence: "Medium",
        action: "Add special holiday hours and pin a short update if appointment slots are limited.",
        status: "Open"
      },
      {
        title: "The booking page has no recent review proof nearby.",
        severity: "Medium",
        impact: "Visitors may not see trust proof at the moment they are choosing an appointment.",
        source: "Website booking page",
        valueFound: "No testimonial or review snippet near the booking form",
        expectedValue: "Recent review proof close to booking action",
        confidence: "Medium",
        action: "Add one or two short review snippets near the appointment CTA.",
        status: "Open"
      }
    ]
  }
];

export const SAMPLE_FINDINGS = SAMPLE_REPORTS[0].findings;
export const SAMPLE_CATEGORY_SCORES = SAMPLE_REPORTS[0].categoryScores;
