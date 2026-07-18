/**
 * Maps a public 1-5 star rating into a 0-100 customer-trust score.
 * Local-business ratings are compressed near the top: 4.0+ is already a good
 * trust signal, while 4.0-5.0 separates good from exceptional.
 */
export function scoreReviewRating(rating) {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  if (rating <= 3) return 0;

  const score = rating <= 4
    ? ((rating - 3) / 1) * 75
    : 75 + ((rating - 4) / 1) * 25;
  return Math.round(clampScore(score));
}

export function ratingNeedsAttention(rating, reviewCount = 0) {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return false;

  // Ratings at 3.7+ are normal-good for many established local businesses. If
  // review volume is thin, the review-count issue handles weak proof separately.
  if (rating >= 3.7) return false;

  // Below 3.7, flag the rating when there is enough review volume to trust the
  // signal, or when the rating is low enough that even a small sample is risky.
  return reviewCount >= 50 || rating < 3.5;
}

function clampScore(value) {
  return Math.min(100, Math.max(0, value));
}
