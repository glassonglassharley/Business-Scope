// Pure prospect scoring. No API calls, no database — everything derives from
// inputs already observed (businesses row, scan snapshots, contact_channels
// rows), which is what makes TRUNCATE + full recompute lossless.
//
// Unavailable-signal policy: every signal is measured (number) or unmeasured
// (null). Unmeasured signals are EXCLUDED and sibling weights renormalize
// over what was measured — they never score as zero. The row's completeness
// value (0-100, measured share of total signal weight) is how you tell a real
// low score from an under-observed one. The one deliberate exception:
// reachability. An unmeasured reachability multiplier would rank unverified
// businesses, so prospect_score stays null until reachability is confirmed
// (which normal discovery always does) — the signals payload says why.

import { prospectScoringConfig } from "./prospectingConfig.mjs";

/**
 * @param {{
 *   business: { name: string, businessStatus: string|null, rating: number|null,
 *               reviewCount: number|null, websiteUrl: string|null, claimed?: boolean|null },
 *   latestScan: { presenceScore: number|null, reviewCount: number|null, latestReviewAt: string|null,
 *                 scannedAt: string, signals?: object,
 *                 categoryScores?: Record<string, number|null> }|null,
 *   previousScan: { reviewCount: number|null, scannedAt: string }|null,
 *   channels: Array<{ channelType: string, status: string, lastActivityAt: string|null }>,
 *   contactsConfirmedAbsent: boolean,
 *   isChain: boolean,
 *   now?: Date
 * }} input
 */
export function computeProspectScore(input) {
  const config = prospectScoringConfig;
  const now = input.now || new Date();

  const weakness = scoreWeakness(input.latestScan, config);
  const viability = scoreViability(input.business, config);
  const momentum = scoreMomentum(input, config, now);
  const reachability = scoreReachability(input.channels, input.contactsConfirmedAbsent, config);
  const disqualifyReasons = collectDisqualifiers(input, reachability, config, weakness);

  const components = [
    { key: "weakness", weight: config.componentWeights.weakness, result: weakness },
    { key: "viability", weight: config.componentWeights.viability, result: viability },
    { key: "momentum", weight: config.componentWeights.momentum, result: momentum }
  ];
  const measured = components.filter((component) => component.result.score !== null);
  const measuredWeight = measured.reduce((sum, component) => sum + component.weight, 0);
  const base = measuredWeight > 0
    ? measured.reduce((sum, component) => sum + component.result.score * (component.weight / measuredWeight), 0)
    : null;

  // Completeness: measured share of all signal weight. Components contribute
  // 85 points (proportional to how much of each was measured), a confirmed
  // reachability the remaining 15.
  const measuredShare = components.reduce((sum, component) => sum + component.weight * component.result.completeness, 0)
    / components.reduce((sum, component) => sum + component.weight, 0);
  const completeness = round2(measuredShare * 85 + (reachability.factor !== null ? 15 : 0));

  const prospectScore = base !== null && reachability.factor !== null
    ? round2(base * reachability.factor)
    : null;

  return {
    weakness: weakness.score,
    viability: viability.score,
    momentum: momentum.score,
    reachabilityFactor: reachability.factor,
    prospectScore,
    disqualified: disqualifyReasons.length > 0,
    disqualifyReasons,
    completeness,
    weightsVersion: config.weightsVersion,
    signals: {
      weakness: weakness.detail,
      viability: viability.detail,
      momentum: momentum.detail,
      reachability: reachability.detail
    }
  };
}

// --------------------------------------------------------------------------

/**
 * Weakness re-weights the SAME per-category measurements the public presence
 * score is built from, using the private weighting in config: the website
 * carries most of the weight because a broken website is what the offer
 * fixes. The public presence_score is never modified — only re-weighted here.
 * Falls back to inverting the blended public score when a scan predates
 * category capture.
 */
function scoreWeakness(latestScan, config) {
  if (!latestScan) {
    return { score: null, completeness: 0, detail: { status: "unmeasured", reason: "No deep scan yet." } };
  }

  const categoryScores = latestScan.categoryScores || {};
  const weights = config.weakness.categoryWeights;
  const measured = Object.entries(weights).filter(([key]) => typeof categoryScores[key] === "number");
  const measuredWeight = measured.reduce((sum, [, weight]) => sum + weight, 0);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  if (!measured.length) {
    if (typeof latestScan.presenceScore !== "number") {
      return { score: null, completeness: 0, detail: { status: "unmeasured", reason: "Scan recorded no category scores or presence score." } };
    }
    return {
      score: round2(100 - latestScan.presenceScore),
      completeness: 0.5,
      detail: { status: "measured", basis: "public_presence_score_fallback", presenceScore: latestScan.presenceScore }
    };
  }

  // Weights renormalize over measured categories, so an unbuilt scanner is
  // excluded rather than counted as a zero — same rule as everywhere else.
  const health = measured.reduce((sum, [key, weight]) => sum + categoryScores[key] * (weight / measuredWeight), 0);
  return {
    score: round2(100 - health),
    completeness: measuredWeight / totalWeight,
    detail: {
      status: "measured",
      basis: "private_category_weighting",
      categoryScores: Object.fromEntries(measured.map(([key]) => [key, categoryScores[key]])),
      publicPresenceScore: latestScan.presenceScore ?? null
    }
  };
}

function scoreViability(business, config) {
  const { weights, reviewCountTarget, ratingBands, openScores } = config.viability;
  const signals = {
    reviewCount: typeof business.reviewCount === "number"
      ? { score: Math.min(business.reviewCount / reviewCountTarget, 1) * 100, value: business.reviewCount }
      : null,
    rating: typeof business.rating === "number"
      ? { score: ratingBands.find((band) => business.rating >= band.min)?.score ?? 0, value: business.rating }
      : null,
    open: business.businessStatus
      ? { score: openScores[business.businessStatus] ?? 0, value: business.businessStatus }
      : null,
    // Legacy Places API never exposes claimed status; stays unmeasured until
    // a source provides it.
    claimed: typeof business.claimed === "boolean"
      ? { score: business.claimed ? 100 : 0, value: business.claimed }
      : null
  };
  return weightedComposite(signals, weights);
}

function scoreMomentum(input, config, now) {
  const { weights, velocityBands, reviewRecencyBands, socialScores, minVelocityDays } = config.momentum;
  const { latestScan, previousScan, channels, business } = input;

  // Review velocity from consecutive snapshots; recency of latest review as
  // the fallback on a first scan, or when two snapshots are too close together
  // for a delta to mean anything.
  let reviewVelocity = null;
  const snapshotGapDays = previousScan ? daysBetween(previousScan.scannedAt, latestScan.scannedAt) : 0;
  const gapIsMeaningful = snapshotGapDays >= (minVelocityDays ?? 7);
  if (typeof latestScan?.reviewCount === "number" && typeof previousScan?.reviewCount === "number" && gapIsMeaningful) {
    const days = Math.max(1, snapshotGapDays);
    const perMonth = ((latestScan.reviewCount - previousScan.reviewCount) / days) * 30;
    reviewVelocity = {
      score: velocityBands.find((band) => perMonth >= band.min)?.score ?? velocityBands.at(-1).score,
      value: round2(perMonth),
      basis: "velocity_between_scans"
    };
  } else if (latestScan?.latestReviewAt) {
    const days = daysBetween(latestScan.latestReviewAt, now);
    reviewVelocity = {
      score: reviewRecencyBands.find((band) => days <= band.maxDays).score,
      value: Math.round(days),
      basis: "latest_review_recency_fallback"
    };
  }

  // Owner review responses: no current source exposes them; stays unmeasured
  // until one does.
  const ownerResponds = typeof latestScan?.signals?.ownerResponseRate === "number"
    ? { score: latestScan.signals.ownerResponseRate * 100, value: latestScan.signals.ownerResponseRate }
    : null;

  // Social while site weak: only measurable once a deep scan looked for
  // social links (or confirmed there is no website to look at).
  let socialWhileSiteWeak = null;
  const socialChannels = channels.filter((channel) => channel.channelType === "social");
  const siteWeak = !business.websiteUrl || latestScan?.signals?.websiteBroken === true;
  const socialObserved = socialChannels.length > 0 || latestScan != null;
  if (socialObserved) {
    const hasActive = socialChannels.some((channel) => channel.status === "active");
    const value = hasActive && siteWeak ? "activeWhileSiteWeak"
      : hasActive ? "activeSiteFine"
      : socialChannels.length ? "dormantOnly"
      : "none";
    socialWhileSiteWeak = { score: socialScores[value], value };
  }

  return weightedComposite({ reviewVelocity, ownerResponds, socialWhileSiteWeak }, weights);
}

function scoreReachability(channels, contactsConfirmedAbsent, config) {
  const tiers = config.reachabilityTiers;
  if (!channels.length) {
    if (contactsConfirmedAbsent) {
      return { factor: tiers.none, detail: { status: "measured", basis: "confirmed_no_contact_method" } };
    }
    // Never assume reachable: no confirmed channels and no confirmed absence
    // means unmeasured, and prospect_score stays null.
    return { factor: null, detail: { status: "unmeasured", reason: "No contact check on file yet." } };
  }

  const usable = channels.filter((channel) => channel.status !== "invalid");
  if (!usable.length) {
    return { factor: tiers.none, detail: { status: "measured", basis: "all_channels_invalid" } };
  }

  const tierOf = (channel) => {
    if (channel.channelType === "phone") return { tier: "phone", factor: tiers.phone };
    if (channel.channelType === "email") return { tier: "email", factor: tiers.email };
    if (channel.channelType === "form") return { tier: "form", factor: tiers.form };
    // Social: 'active' must be verified (hand-set or measured); 'dormant' and
    // 'unknown' both score at the dormant tier — conservative by design.
    return channel.status === "active"
      ? { tier: "social_active", factor: tiers.social_active }
      : { tier: "social_dormant", factor: tiers.social_dormant };
  };
  const best = usable.map(tierOf).sort((a, b) => b.factor - a.factor)[0];
  return {
    factor: best.factor,
    detail: { status: "measured", basis: best.tier, channelsOnFile: usable.length }
  };
}

function collectDisqualifiers(input, reachability, config, weakness) {
  const reasons = [];
  if (input.business.businessStatus === "CLOSED_PERMANENTLY") reasons.push("permanently_closed");
  if (input.isChain) reasons.push("chain_or_franchise");

  // Too little wrong to pitch. Only applied when weakness was actually
  // measured — an unscanned business is unknown, not strong.
  if (typeof weakness.score === "number" && weakness.score < config.disqualifiers.weaknessFloor) {
    reasons.push("below_weakness_floor");
  }

  // Both must hold: a strong blended score AND a genuinely strong website.
  // Either alone leaves something to sell.
  const presence = input.latestScan?.presenceScore;
  const technicalHealth = input.latestScan?.categoryScores?.technicalHealth;
  if (typeof presence === "number" && presence >= config.disqualifiers.strongPresenceScore
    && typeof technicalHealth === "number" && technicalHealth >= config.disqualifiers.strongTechnicalHealth) {
    reasons.push("strong_presence");
  }

  if (reachability.factor === 0) reasons.push("no_contact_method");
  return reasons;
}

// --------------------------------------------------------------------------

/**
 * Weighted average over measured signals only; weights renormalize so
 * unmeasured signals are excluded rather than counted as zero. completeness
 * is the measured share of total weight.
 */
function weightedComposite(signals, weights) {
  const entries = Object.entries(weights);
  const measured = entries.filter(([key]) => signals[key] !== null);
  const measuredWeight = measured.reduce((sum, [, weight]) => sum + weight, 0);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  const detail = Object.fromEntries(entries.map(([key]) => [
    key,
    signals[key] === null ? { status: "unmeasured" } : { status: "measured", ...signals[key], score: round2(signals[key].score) }
  ]));

  if (!measured.length) return { score: null, completeness: 0, detail };
  const score = measured.reduce((sum, [key, weight]) => sum + signals[key].score * (weight / measuredWeight), 0);
  return { score: round2(score), completeness: measuredWeight / totalWeight, detail };
}

function daysBetween(from, to) {
  return Math.abs(new Date(to) - new Date(from)) / 86_400_000;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
