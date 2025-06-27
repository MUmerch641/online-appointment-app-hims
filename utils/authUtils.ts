/**
 * Utility functions for authentication
 */

/**
 * Normalizes authentication value to boolean
 * Handles cases where AsyncStorage might return "false" as string or false as boolean
 * @param isAuthenticated - The authentication value from AsyncStorage or state
 * @returns boolean - true if authenticated, false otherwise
 */
export const normalizeAuthValue = (isAuthenticated: any): boolean => {
  if (typeof isAuthenticated === 'string') {
    return isAuthenticated === 'true';
  }
  return Boolean(isAuthenticated);
};

/**
 * Checks if user is authenticated with normalized boolean logic
 * @param isAuthenticated - The authentication value to check
 * @returns boolean - true if authenticated, false otherwise
 */
export const isUserAuthenticated = (isAuthenticated: any): boolean => {
  return normalizeAuthValue(isAuthenticated);
};
