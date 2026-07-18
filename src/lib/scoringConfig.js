export const scoringConfig = {
  baseCategories: {
    gbp: {
      label: "Google Business Profile completeness",
      max: 25
    },
    accuracy: {
      label: "Business info accuracy",
      max: 15
    },
    reviews: {
      label: "Reviews",
      max: 20
    },
    website: {
      label: "Website quality",
      max: 18
    },
    localVisibility: {
      label: "Local near me visibility",
      max: 12
    },
    contact: {
      label: "Contact and response readiness",
      max: 10
    }
  },
  foodCategories: {
    gbp: {
      label: "Google Business Profile completeness",
      max: 20
    },
    accuracy: {
      label: "Business info accuracy",
      max: 15
    },
    reviews: {
      label: "Reviews",
      max: 15
    },
    website: {
      label: "Website quality",
      max: 12
    },
    ordering: {
      label: "Menu and ordering presence",
      max: 18
    },
    localVisibility: {
      label: "Local near me visibility",
      max: 10
    },
    contact: {
      label: "Contact and response readiness",
      max: 10
    }
  },
  bands: {
    critical: {
      min: 0,
      max: 40
    },
    needsWork: {
      min: 41,
      max: 70
    },
    strong: {
      min: 71,
      max: 100
    }
  }
};

export function getScoringCategories(prospect) {
  return prospect?.industry === "Restaurant / Food Service"
    ? scoringConfig.foodCategories
    : scoringConfig.baseCategories;
}
