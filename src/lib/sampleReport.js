/**
 * Fictional illustrative audit for the /sample-report page. Shaped to match
 * the real Google Places business-health breakdown (see PLACES_CATEGORY_CONFIG
 * in src/lib/scoring.js) so the sample speaks the same category names, metric
 * labels, and states as a real post-scan report — never invented labels.
 *
 * Shows the FULL report, no paywall — every category StreetSignal checks
 * (Data Accuracy & Consistency, Discovery / Google Profile Strength, Online
 * Presence including Yelp, Content Freshness, Customer Signals, AI
 * Readiness, and Technical Health) is illustrated here, matching what a
 * business actually receives on the real report end to end.
 */

export const SAMPLE_BUSINESS = {
  businessName: "Oak & Ivy Salon",
  industry: "Other Local Business",
  city: "a fictional example business"
};

export const SAMPLE_SCORE_TOTAL = 76;
export const SAMPLE_AVAILABLE_WEIGHT = 94;

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
    score: 83,
    metrics: [
      { id: "websitePhone", label: "Website phone appears consistent", score: 100, note: "The phone number customers see on Google also appears on the website." },
      { id: "websiteAddress", label: "Website address appears consistent", score: 100, note: "The address on Google also appears on the website." },
      { id: "yelpPresence", label: "Yelp listing found", score: 100, note: "A confident Yelp listing was found, giving customers another familiar place to verify the business." },
      { id: "yelpName", label: "Yelp name matches Google", score: 100, note: "The Yelp business name matches the Google listing closely enough to trust." },
      { id: "yelpAddress", label: "Yelp address matches Google", score: 100, note: "The Yelp address matches the Google listing closely enough to trust." },
      { id: "yelpPhone", label: "Yelp phone matches Google", score: 0, note: "The Yelp phone number conflicts with Google." }
    ]
  },
  {
    key: "contentFreshness",
    label: "Content Freshness",
    status: "measured",
    score: 82,
    metrics: [
      { id: "copyrightYear", label: "Copyright year", score: 60, note: "The homepage copyright year is a little dated, but not a major concern by itself." },
      { id: "photoVolume", label: "Google photo volume", score: 85, note: "Google has enough photos to make the business feel active and real." },
      { id: "hoursSpecificity", label: "Hours specificity", score: 100, note: "Google shows a specific weekly schedule, which helps customers know when to act." },
      { id: "pageDate", label: "Updated date signal", score: null, note: "No clear page update date was found; this stays neutral because many current sites do not show one." },
      { id: "photoRecency", label: "Google photo recency", score: null, note: "Google Places did not provide photo dates, so photo recency is pending rather than guessed." },
      { id: "posts", label: "Google posts or updates", score: null, note: "Google post/update activity is pending because this scan does not fetch that data yet." },
      { id: "qaActivity", label: "Q&A activity", score: null, note: "Q&A activity is pending because this scan does not fetch that data yet." },
      { id: "reviewRecency", label: "Review recency", score: null, note: "Review recency is pending because Google Places did not provide review dates in this scan." }
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
    key: "aiVisibility",
    label: "AI Readiness",
    status: "measured",
    score: 50,
    metrics: [
      { id: "hasJsonLd", label: "Structured data present", score: 100, note: "The homepage publishes machine-readable structured data (JSON-LD), which AI tools and search engines use to identify the business with confidence." },
      { id: "openGraphPresent", label: "Open Graph tags present", score: 100, note: "Open Graph tags help AI tools, social platforms, and search engines summarize the page correctly." },
      { id: "localBusinessType", label: "Local business schema type", score: 0, note: "No LocalBusiness-family schema type was found, so AI tools may not confidently recognize this as a local business." },
      { id: "napInSchema", label: "Name, phone, and address in schema", score: 0, note: "The business name, phone, and address were not found in machine-readable form, only at best as plain page text." },
      { id: "napMatchesGoogle", label: "Schema details match Google", score: null, note: "No name, phone, or address was found in the structured data to compare against the Google listing." }
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
    id: "aiVisibility-localBusinessType",
    category: "aiVisibility",
    title: "Local business schema type needs attention",
    impact: "High",
    suggestedFix: "Set the structured data's @type to LocalBusiness or a matching subtype so AI tools recognize this as a local business."
  },
  {
    id: "discoveryStrength-claimed",
    category: "discoveryStrength",
    title: "Claimed / verified needs attention",
    impact: "High",
    suggestedFix: "Verify whether the Google listing is claimed in Google Business Profile."
  },
  {
    id: "onlinePresence-yelpPhone",
    category: "onlinePresence",
    title: "Yelp phone matches Google needs attention",
    impact: "High",
    suggestedFix: "Update Yelp so the phone number matches the Google listing."
  }
];
