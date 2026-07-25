export const CHECK_GROUPS = [
  {
    title: "Business Details",
    impact: "Wrong or conflicting basics make customers doubt you before they even call.",
    items: ["Business name", "Address", "Phone number", "Business hours", "Website", "Service area", "Major public listings"],
    examples: [
      "Conflicting phone numbers across listings",
      "Hours that don't match the website",
      "Missing or incorrect service area"
    ]
  },
  {
    title: "Customer Trust",
    impact: "Weak trust signals make people choose a competitor even when you're the better option.",
    items: ["Review recency", "Review responses", "Photos", "Profile depth", "Description quality", "Category selection", "Conflicting information"],
    examples: [
      "No recent reviews",
      "Outdated or low-quality photos",
      "Thin or generic business description"
    ]
  },
  {
    title: "Customer Actions",
    impact: "Broken or missing action paths stop ready-to-buy customers at the final step.",
    items: ["Call buttons", "Directions", "Booking links", "Ordering links", "Quote forms", "Menu links", "Mobile usability", "Dead or redirected links"],
    examples: [
      "Booking link returns an error",
      "Click-to-call goes to the wrong number",
      "Dead menu or quote form links"
    ]
  }
];
