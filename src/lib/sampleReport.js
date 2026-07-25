/**
 * Fictional illustrative audits for the /sample-report page. Shaped to match
 * the real Google Places business-health breakdown (see PLACES_CATEGORY_CONFIG
 * in src/lib/scoring.js) so the sample speaks the same category names, metric
 * labels, and states as a real post-scan report — never invented labels.
 *
 * Three examples covering the full score range (Strong / Needs Work /
 * Critical) so a visitor sees a different, still-honest report on each
 * visit rather than the same fixed business every time. Each shows the
 * FULL report, no paywall — every category StreetSignal checks (Data
 * Accuracy & Consistency, Discovery / Google Profile Strength, Online
 * Presence including Yelp, Content Freshness, Customer Signals, AI
 * Readiness, and Technical Health).
 */

export const SAMPLE_REPORTS = [
  {
    business: {
      businessName: "Oak & Ivy Salon",
      industry: "Other Local Business",
      city: "a fictional example business"
    },
    scoreTotal: 76,
    availableWeight: 94,
    categories: [
      {
        key: "dataAccuracy",
        label: "Data Accuracy & Consistency",
        status: "measured",
        score: 100,
        metrics: [
          { id: "address", label: "Address present", score: 100, note: "Customers can confirm the location." },
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
          { id: "category", label: "Category set", score: 100, note: "Category and service types are set clearly." },
          { id: "claimed", label: "Claimed / verified", score: 0, note: "The listing did not appear claimed or verified from the available data." },
          { id: "photos", label: "Photos available", score: 40, note: "Newest photos are over eight months old, so the profile can look dated." }
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
          { id: "pageDate", label: "Updated date signal", score: null, note: "No clear page update date was found; this stays neutral." },
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
          { id: "rating", label: "Average rating", score: 92, note: "A strong rating helps customers trust the business before they call." },
          { id: "reviews", label: "Review count", score: 84, note: "Review volume is solid, with room to grow." }
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
          { id: "performance", label: "Mobile performance", score: 22, note: "The mobile homepage loads slowly enough that visitors may leave before it finishes." },
          { id: "description", label: "Meta description", score: 0, note: "Missing a meta description, so search results show weaker preview text." },
          { id: "https", label: "Served over HTTPS", score: 100, note: "Customers land on a secure HTTPS version of the site." },
          { id: "viewport", label: "Mobile viewport", score: 100, note: "Mobile viewport markup helps the site render properly on phones." }
        ]
      }
    ],
    // Titles and suggestedFix copy reuse the exact strings scoring.js produces
    // for these metric ids (see suggestedFixForPlacesMetric), so the sample's
    // fix language matches a real report's word for word.
    prioritizedIssues: [
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
    ]
  },
  {
    business: {
      businessName: "Coastal Plumbing Co.",
      industry: "Other Local Business",
      city: "a fictional example business"
    },
    scoreTotal: 55,
    availableWeight: 91,
    categories: [
      {
        key: "dataAccuracy",
        label: "Data Accuracy & Consistency",
        status: "measured",
        score: 67,
        metrics: [
          { id: "address", label: "Address present", score: 100, note: "Customers can confirm the location." },
          { id: "phone", label: "Phone present", score: 100, note: "Customers can call directly from the listing." },
          { id: "hours", label: "Hours present", score: 0, note: "Business hours are missing from the listing, so customers cannot tell when to call." }
        ]
      },
      {
        key: "discoveryStrength",
        label: "Discovery / Google Profile Strength",
        status: "measured",
        score: 60,
        metrics: [
          { id: "website", label: "Website linked", score: 100, note: "A website link gives customers somewhere to verify details." },
          { id: "category", label: "Category set", score: 0, note: "No clear primary category was set, which can keep the business out of relevant searches." },
          { id: "claimed", label: "Claimed / verified", score: 100, note: "The listing appears claimed and verified." },
          { id: "photos", label: "Photos available", score: 40, note: "Newest photos are over a year old, so the profile can look dated." }
        ]
      },
      {
        key: "onlinePresence",
        label: "Online Presence",
        status: "measured",
        score: 83,
        metrics: [
          { id: "websitePhone", label: "Website phone appears consistent", score: 100, note: "The phone number customers see on Google also appears on the website." },
          { id: "websiteAddress", label: "Website address appears consistent", score: 0, note: "The address on the website conflicts with the Google listing." },
          { id: "yelpPresence", label: "Yelp listing found", score: 100, note: "A confident Yelp listing was found, giving customers another familiar place to verify the business." },
          { id: "yelpName", label: "Yelp name matches Google", score: 100, note: "The Yelp business name matches the Google listing closely enough to trust." },
          { id: "yelpAddress", label: "Yelp address matches Google", score: 100, note: "The Yelp address matches the Google listing closely enough to trust." },
          { id: "yelpPhone", label: "Yelp phone matches Google", score: 100, note: "The Yelp phone number matches the Google listing." }
        ]
      },
      {
        key: "contentFreshness",
        label: "Content Freshness",
        status: "measured",
        score: 33,
        metrics: [
          { id: "copyrightYear", label: "Copyright year", score: 40, note: "The homepage copyright year is two years old, which can read as inactive." },
          { id: "photoVolume", label: "Google photo volume", score: 60, note: "Google has a modest number of photos; a few more would help the profile feel active." },
          { id: "hoursSpecificity", label: "Hours specificity", score: 0, note: "No weekly schedule was found in Google Business Profile." },
          { id: "pageDate", label: "Updated date signal", score: null, note: "No clear page update date was found; this stays neutral." },
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
        score: 52,
        metrics: [
          { id: "rating", label: "Average rating", score: 58, note: "The rating is below what most customers expect before calling a service business." },
          { id: "reviews", label: "Review count", score: 45, note: "Review volume is thin, which can make the business feel unproven." }
        ]
      },
      {
        key: "aiVisibility",
        label: "AI Readiness",
        status: "measured",
        score: 25,
        metrics: [
          { id: "hasJsonLd", label: "Structured data present", score: 0, note: "No machine-readable structured data (JSON-LD) was found on the homepage." },
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
        score: 64,
        metrics: [
          { id: "performance", label: "Mobile performance", score: 55, note: "Mobile load speed is inconsistent and could turn away impatient visitors." },
          { id: "description", label: "Meta description", score: 0, note: "Missing a meta description, so search results show weaker preview text." },
          { id: "https", label: "Served over HTTPS", score: 100, note: "Customers land on a secure HTTPS version of the site." },
          { id: "viewport", label: "Mobile viewport", score: 100, note: "Mobile viewport markup helps the site render properly on phones." }
        ]
      }
    ],
    prioritizedIssues: [
      {
        id: "dataAccuracy-hours",
        category: "dataAccuracy",
        title: "Hours present needs attention",
        impact: "High",
        suggestedFix: "Add complete business hours, including special hours when needed."
      },
      {
        id: "discoveryStrength-category",
        category: "discoveryStrength",
        title: "Category set needs attention",
        impact: "High",
        suggestedFix: "Set the most accurate primary category and supporting business types."
      },
      {
        id: "onlinePresence-websiteAddress",
        category: "onlinePresence",
        title: "Website address appears consistent needs attention",
        impact: "High",
        suggestedFix: "Put the same address or service-area language from Google on the website homepage or contact path."
      },
      {
        id: "aiVisibility-localBusinessType",
        category: "aiVisibility",
        title: "Local business schema type needs attention",
        impact: "High",
        suggestedFix: "Set the structured data's @type to LocalBusiness or a matching subtype so AI tools recognize this as a local business."
      },
      {
        id: "technicalHealth-description",
        category: "technicalHealth",
        title: "Meta description needs attention",
        impact: "High",
        suggestedFix: "Add a plain meta description that explains what customers can do next."
      }
    ]
  },
  {
    business: {
      businessName: "Sunrise Nail Studio",
      industry: "Other Local Business",
      city: "a fictional example business"
    },
    scoreTotal: 27,
    availableWeight: 68,
    categories: [
      {
        key: "dataAccuracy",
        label: "Data Accuracy & Consistency",
        status: "measured",
        score: 67,
        metrics: [
          { id: "address", label: "Address present", score: 100, note: "Customers can confirm the location." },
          { id: "phone", label: "Phone present", score: 100, note: "Customers can call directly from the listing." },
          { id: "hours", label: "Hours present", score: 0, note: "Business hours are missing from the listing, so customers cannot tell when to visit." }
        ]
      },
      {
        key: "discoveryStrength",
        label: "Discovery / Google Profile Strength",
        status: "measured",
        score: 40,
        metrics: [
          { id: "website", label: "Website linked", score: 0, note: "No website was found linked to the Google listing." },
          { id: "category", label: "Category set", score: 100, note: "Category and service types are set clearly." },
          { id: "claimed", label: "Claimed / verified", score: 0, note: "The listing did not appear claimed or verified from the available data." },
          { id: "photos", label: "Photos available", score: 60, note: "Photos are several months old but still give customers a fair sense of the space." }
        ]
      },
      {
        key: "onlinePresence",
        label: "Online Presence",
        status: "measured",
        score: 0,
        metrics: [
          { id: "websitePhone", label: "Website phone appears consistent", score: 0, note: "No website was found, so the phone number could not be compared." },
          { id: "websiteAddress", label: "Website address appears consistent", score: 0, note: "No website was found, so the address could not be compared." },
          { id: "yelpPresence", label: "Yelp listing found", score: 0, note: "No confident Yelp listing was found." },
          { id: "yelpName", label: "Yelp name matches Google", score: null, note: "No Yelp listing was found to compare against Google." },
          { id: "yelpAddress", label: "Yelp address matches Google", score: null, note: "No Yelp listing was found to compare against Google." },
          { id: "yelpPhone", label: "Yelp phone matches Google", score: null, note: "No Yelp listing was found to compare against Google." }
        ]
      },
      {
        key: "contentFreshness",
        label: "Content Freshness",
        status: "measured",
        score: 14,
        metrics: [
          { id: "copyrightYear", label: "Copyright year", score: 0, note: "No website was found, so no copyright year could be verified." },
          { id: "photoVolume", label: "Google photo volume", score: 55, note: "Google has a modest number of photos; a few more would help the profile feel active." },
          { id: "hoursSpecificity", label: "Hours specificity", score: 0, note: "No weekly schedule was found in Google Business Profile." },
          { id: "pageDate", label: "Updated date signal", score: 0, note: "No website was found, so no update date could be verified." },
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
        score: 68,
        metrics: [
          { id: "rating", label: "Average rating", score: 85, note: "A strong rating helps customers trust the business before they visit, even without a website." },
          { id: "reviews", label: "Review count", score: 50, note: "Review volume is modest, with room to grow." }
        ]
      },
      {
        key: "aiVisibility",
        label: "AI Readiness",
        status: "measured",
        score: 0,
        metrics: [
          { id: "hasJsonLd", label: "Structured data present", score: 0, note: "No website was found, so structured data could not be checked." },
          { id: "openGraphPresent", label: "Open Graph tags present", score: 0, note: "No website was found, so Open Graph tags could not be checked." },
          { id: "localBusinessType", label: "Local business schema type", score: 0, note: "No website was found, so a schema type could not be confirmed." },
          { id: "napInSchema", label: "Name, phone, and address in schema", score: 0, note: "No website was found, so machine-readable business details could not be checked." },
          { id: "napMatchesGoogle", label: "Schema details match Google", score: null, note: "No website was found, so there is nothing to compare against the Google listing." }
        ]
      },
      {
        key: "technicalHealth",
        label: "Technical Health",
        status: "measured",
        score: 0,
        metrics: [
          { id: "performance", label: "Mobile performance", score: 0, note: "No website was found, so mobile performance could not be measured." },
          { id: "description", label: "Meta description", score: 0, note: "No website was found, so a meta description could not be checked." },
          { id: "https", label: "Served over HTTPS", score: 0, note: "No website was found, so HTTPS could not be verified." },
          { id: "viewport", label: "Mobile viewport", score: 0, note: "No website was found, so mobile viewport markup could not be checked." }
        ]
      }
    ],
    prioritizedIssues: [
      {
        id: "discoveryStrength-website",
        category: "discoveryStrength",
        title: "Website linked needs attention",
        impact: "High",
        suggestedFix: "Link the best current website or ordering page from the Google listing."
      },
      {
        id: "dataAccuracy-hours",
        category: "dataAccuracy",
        title: "Hours present needs attention",
        impact: "High",
        suggestedFix: "Add complete business hours, including special hours when needed."
      },
      {
        id: "discoveryStrength-claimed",
        category: "discoveryStrength",
        title: "Claimed / verified needs attention",
        impact: "High",
        suggestedFix: "Verify whether the Google listing is claimed in Google Business Profile."
      },
      {
        id: "aiVisibility-localBusinessType",
        category: "aiVisibility",
        title: "Local business schema type needs attention",
        impact: "High",
        suggestedFix: "Set the structured data's @type to LocalBusiness or a matching subtype so AI tools recognize this as a local business."
      },
      {
        id: "onlinePresence-yelpPresence",
        category: "onlinePresence",
        title: "Yelp listing found needs attention",
        impact: "Medium",
        suggestedFix: "Claim or clean up the Yelp listing only if Yelp matters for this market."
      }
    ]
  }
];
