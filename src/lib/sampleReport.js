/**
 * Fictional illustrative audit for the /sample-report page. Shaped to match
 * the real Google Places business-health breakdown (see PLACES_CATEGORY_CONFIG
 * in src/lib/scoring.js) so the sample speaks the same category names, metric
 * labels, and states as a real post-scan report — never invented labels.
 *
 * Only the categories a free (not-yet-unlocked) real report shows are
 * included here: Data Accuracy & Consistency, Discovery / Google Profile
 * Strength, Online Presence (free metrics only), Customer Signals, and
 * Technical Health. Content Freshness and AI Visibility stay behind the
 * same single locked-scan row a real free report uses — this sample does
 * not fabricate their scores since a real free report never reveals them.
 */

export const SAMPLE_BUSINESS = {
  businessName: "Oak & Ivy Salon",
  industry: "Other Local Business",
  city: "a fictional example business"
};

export const SAMPLE_SCORE_TOTAL = 79;
export const SAMPLE_AVAILABLE_WEIGHT = 84;

export const SAMPLE_CATEGORIES = [
  {
    key: "dataAccuracy",
    label: "Data Accuracy & Consistency",
    status: "measured",
    score: 100,
    metrics: [
      { id: "address", label: "Address present", score: 100, note: "Customers can confirm the location before visiting." },
      { id: "phone", label: "Phone present", score: 100, note: "Customers can call directly from the listing." },
      { id: "hours", label: "Hours present", score: 100, note: "Customers can tell when the salon is open." }
    ]
  },
  {
    key: "discoveryStrength",
    label: "Discovery / Google Profile Strength",
    status: "measured",
    score: 60,
    metrics: [
      { id: "website", label: "Website linked", score: 100, note: "A website link gives customers somewhere to verify details." },
      { id: "category", label: "Category set", score: 100, note: "Google category and service types are set clearly." },
      { id: "claimed", label: "Claimed / verified", score: 0, note: "The listing did not appear claimed or verified from the available data." },
      { id: "photos", label: "Photos available", score: 40, note: "Newest customer-facing photos are more than eight months old, so the profile can look less current than it is." }
    ]
  },
  {
    key: "onlinePresence",
    label: "Online Presence",
    status: "measured",
    score: 100,
    metrics: [
      { id: "websitePhone", label: "Website phone appears consistent", score: 100, note: "The phone number customers see on Google also appears on the website." },
      { id: "websiteAddress", label: "Website address appears consistent", score: 100, note: "The address on Google also appears on the website." }
    ]
  },
  {
    key: "customerSignals",
    label: "Customer Signals",
    status: "measured",
    score: 88,
    metrics: [
      { id: "rating", label: "Average rating", score: 92, note: "A strong average rating helps customers trust the business before they call." },
      { id: "reviews", label: "Review count", score: 84, note: "Review volume is solid, with room to build further proof." }
    ]
  },
  {
    key: "technicalHealth",
    label: "Technical Health",
    status: "measured",
    score: 57,
    metrics: [
      { id: "performance", label: "Mobile performance", score: 22, note: "The mobile homepage loads slowly enough that impatient visitors may leave before it finishes." },
      { id: "description", label: "Meta description", score: 0, note: "The homepage is missing a meta description, so search results show weaker preview text." },
      { id: "https", label: "Served over HTTPS", score: 100, note: "Customers land on a secure HTTPS version of the site." },
      { id: "viewport", label: "Mobile viewport", score: 100, note: "Mobile viewport markup helps the site render properly on phones." }
    ]
  }
];

// Titles and suggestedFix copy reuse the exact strings scoring.js produces
// for these metric ids (see suggestedFixForPlacesMetric), so the sample's
// fix language matches a real report's word for word.
export const SAMPLE_PRIORITIZED_ISSUES = [
  {
    id: "technicalHealth-description",
    category: "technicalHealth",
    title: "Meta description needs attention",
    impact: "High",
    suggestedFix: "Add a plain meta description that explains what customers can do next."
  },
  {
    id: "technicalHealth-performance",
    category: "technicalHealth",
    title: "Mobile performance needs attention",
    impact: "High",
    suggestedFix: "Improve the mobile homepage speed by reducing heavy assets and slow scripts."
  },
  {
    id: "discoveryStrength-claimed",
    category: "discoveryStrength",
    title: "Claimed / verified needs attention",
    impact: "High",
    suggestedFix: "Verify whether the Google listing is claimed in Google Business Profile."
  },
  {
    id: "discoveryStrength-photos",
    category: "discoveryStrength",
    title: "Photos available needs attention",
    impact: "High",
    suggestedFix: "Add recent real photos of the work, location, team, products, or menu items."
  }
];
