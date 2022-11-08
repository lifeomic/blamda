export const withTiming = async <T>(
  fn: () => Promise<T>,
): Promise<{ seconds: number; result: T }> => {
  const start = Date.now();

  const result = await fn();

  const end = Date.now();

  return {
    result,
    seconds: (end - start) / 1000,
  };
};
