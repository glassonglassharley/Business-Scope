export function generateGaps(prospect, score) {
  const gaps = [];
  const isFoodBusiness = prospect.industry === "Restaurant / Food Service";

  if (!prospect.accuracy.hoursAccurate) {
    gaps.push({
      id: "hours-accuracy",
      priority: 98,
      title: "Wrong or inconsistent hours can cost customers who were ready to buy",
      body:
        "If Google, the website, and other listings disagree, customers hesitate or show up at the wrong time. Accurate hours are one of the simplest ways to protect calls, visits, and orders."
    });
  }

  if (!prospect.accuracy.phoneAccurate) {
    gaps.push({
      id: "phone-accuracy",
      priority: 97,
      title: "A bad or inconsistent phone number breaks the sale at the finish line",
      body:
        "When someone is ready to call, even a tiny mismatch creates doubt. Consistent phone information across Google, the website, and listings makes the business feel reachable and real."
    });
  }

  if (!prospect.accuracy.servicesAccurate) {
    gaps.push({
      id: "services-accuracy",
      priority: 91,
      title: isFoodBusiness
        ? "Menu confusion makes customers question whether ordering is worth it"
        : "Unclear service information makes good customers self-select out",
      body: isFoodBusiness
        ? "Customers want to know what is available, what it costs, and how to order. Stale menu details create friction exactly when appetite should turn into revenue."
        : "If the services, offers, or service area are unclear, customers often assume you do not handle their need and keep searching."
    });
  }

  if (prospect.website.status === "none") {
    gaps.push({
      id: "no-website",
      priority: 90,
      title: isFoodBusiness
        ? "No working website means diners cannot confirm the menu before ordering"
        : "No website means customers have nowhere to confirm you are the right choice",
      body: isFoodBusiness
        ? "People often check the menu, hours, photos, and ordering options before deciding where to eat. Without a credible site, they drift to restaurants that make the decision easier."
        : "People who do not want to call immediately usually compare options first. Without a website, those visitors move on to competitors who show services, photos, reviews, and a fast quote path."
    });
  }

  if (prospect.website.status === "exists-but-outdated") {
    gaps.push({
      id: "outdated-site",
      priority: 80,
      title: "An outdated website can make a good business look risky",
      body:
        "Customers judge speed, trust, and professionalism before they ever meet you. A dated site can quietly push high-intent visitors toward a competitor that feels more current."
    });
  }

  if (!prospect.website.mobileFriendly) {
    gaps.push({
      id: "mobile",
      priority: 78,
      title: "Mobile visitors may be bouncing before they contact you",
      body:
        "Most local searches happen on a phone. If the site is hard to read or tap, you are likely losing ready buyers who wanted a quick answer."
    });
  }

  if (isFoodBusiness && !prospect.ordering.deliveryItemsHavePhotos) {
    gaps.push({
      id: "delivery-photos",
      priority: 88,
      title: "Delivery app items without photos are easier to skip",
      body:
        "On Uber Eats and similar apps, food photos do a lot of the selling. Items without photos usually feel less trustworthy and can lose orders to competitors with better-looking menus."
    });
  }

  if (isFoodBusiness && !prospect.ordering.onlineOrderingWorks) {
    gaps.push({
      id: "ordering-flow",
      priority: 87,
      title: "A confusing online ordering flow loses hungry customers fast",
      body:
        "When someone is ready to order, every extra step creates drop-off. A clean ordering path can turn more menu views into paid tickets."
    });
  }

  if (!prospect.contact.quoteForm) {
    gaps.push({
      id: "quote-form",
      priority: 86,
      title: isFoodBusiness
        ? "No catering or inquiry form means larger orders may disappear"
        : "No quote form means visitors who do not call just leave",
      body: isFoodBusiness
        ? "People planning events, office lunches, or group orders may not call immediately. A simple inquiry path captures valuable orders that are easy to miss."
        : "A quote form captures people who are shopping after hours, at work, or not ready for a call. You could be losing 5-15 high-intent leads a month to competitors who make that step easy."
    });
  }

  if (!prospect.googleBusinessProfile.claimed) {
    gaps.push({
      id: "gbp-unclaimed",
      priority: 92,
      title: "An unclaimed Google profile leaves your storefront unmanaged",
      body:
        "Your Google profile is often the first impression. If it is not claimed, customers may see incomplete information and Google has fewer signals to trust the business."
    });
  }

  if (!prospect.localVisibility.mapsTopThree) {
    gaps.push({
      id: "maps-top-three",
      priority: 84,
      title: "Missing the Maps top 3 hides you from the hottest local searches",
      body:
        "The top map results get the most calls and visits because customers can compare, trust, and tap quickly. Being outside that pack often means paying for attention you could earn organically."
    });
  }

  if (prospect.reviews.count < 10) {
    gaps.push({
      id: "review-count",
      priority: 72,
      title: "Too few reviews makes the business look unproven",
      body:
        "Even with good service, a low review count creates hesitation. More recent reviews help customers feel safer choosing you over a similar competitor."
    });
  }

  if (prospect.reviews.averageRating < 4.2) {
    gaps.push({
      id: "rating",
      priority: 88,
      title: "A weak rating can stop the sale before anyone calls or orders",
      body:
        "Customers use star ratings as a shortcut for risk. Raising the visible rating and review quality can change how many searchers are willing to choose you."
    });
  }

  if (score.categories.find((category) => category.key === "gbp")?.points < 16) {
    gaps.push({
      id: "gbp-basics",
      priority: 70,
      title: "An incomplete Google profile gives customers fewer reasons to choose you",
      body:
        "Hours, photos, descriptions, and categories help people understand what you offer and whether you are open now. Missing details create friction at the exact moment they are deciding."
    });
  }

  return gaps
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map(({ priority, ...gap }) => gap);
}
