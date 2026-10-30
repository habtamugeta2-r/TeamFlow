import { defineErrorMap } from "../../http/service-error.js";

/**
 * Maps every `AuthServiceError` code to an HTTP [status, message] tuple.
 * Controllers apply this map when executing service operations.
 */
export const authErrors = defineErrorMap({
  EMAIL_IN_USE: [409, "An account with this email already exists."],
  INVALID_CREDENTIALS: [401, "Invalid email or password."],
});

/** Union of valid auth error codes. */
export type AuthErrorCode = keyof typeof authErrors;
