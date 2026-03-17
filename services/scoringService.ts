interface ScoringInput {
  name:          string;
  phone:         string;
  email:         string;
  source:        string;
  campaign_name: string;
}

export function calculateScore(input: ScoringInput): number {
  let score = 0;

  if (input.name)                              score += 20;
  if (input.phone)                             score += 30;
  if (input.email)                             score += 20;
  if (input.source === "meta_ads")             score += 10;
  if (input.campaign_name.toLowerCase().includes("promo")) score += 20;

  return Math.min(score, 100);
}
