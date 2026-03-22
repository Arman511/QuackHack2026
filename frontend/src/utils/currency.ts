export const penceToPounds = (amountInPence: number): number => {
  return Math.round(amountInPence) / 100;
};

export const formatPounds = (amountInPounds: number): string => {
  return amountInPounds.toFixed(2);
};
