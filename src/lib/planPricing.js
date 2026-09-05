import { formatCurrency } from '@/lib/stats';

// Bounds of a registration plan. Falls back to legacy single price field.
export const getPlanBounds = (plan) => ({
  min: Number(plan?.price_min ?? plan?.price ?? 0) || 0,
  max: Number(plan?.price_max ?? plan?.price ?? 0) || 0,
});

export const isFreePlan = (plan) => {
  const { min, max } = getPlanBounds(plan);
  return min === 0 && max === 0;
};

// Human display: رایگان / single price / از X تا Y
export const formatPlanRange = (plan) => {
  const { min, max } = getPlanBounds(plan);
  if (min === 0 && max === 0) return 'رایگان';
  if (min === max) return formatCurrency(min);
  return `از ${formatCurrency(min)} تا ${formatCurrency(max)}`;
};

// Paid status derived from the invoice amount vs. the lower bound
export const isAmountPaid = (amount, plan) => {
  const { min } = getPlanBounds(plan);
  return (Number(amount) || 0) >= min;
};

// Amount above the upper bound — to be moved into donation
export const getAmountOverflow = (amount, plan) => {
  const { max } = getPlanBounds(plan);
  const amt = Number(amount) || 0;
  return amt > max ? amt - max : 0;
};