// Which UI an account uses: the classic UI (the main UI, the default for everyone) or the experimental new UI
// ("next", opt-in Beta). One switch for the whole portal, never per page (planning/new-ui-migration-plan.md).
// Pure and dependency free, shared by the classic header, the login redirect, the API route and the new UI.

/** Account types the new UI exists for. Grows phase by phase; the switch only shows for these. */
export const NEW_UI_ROLES = ["Management"];

export const UI_PREFERENCES = ["classic", "next"];

export function newUiAvailableFor(userType) {
  return NEW_UI_ROLES.includes(userType);
}

/** True only when the account chose the new UI AND it exists for its type. Anything else is classic. */
export function prefersNewUi(user) {
  return Boolean(user) && user.UiPreference === "next" && newUiAvailableFor(user.UserType);
}

/** Where the new UI starts for an account type. */
export function newUiHome() {
  return "/v2";
}

/** Returns an error message, or null when the preference may be saved for this account type. */
export function validateUiPreference(userType, preference) {
  if (!UI_PREFERENCES.includes(preference)) return 'preference must be "classic" or "next".';
  if (preference === "next" && !newUiAvailableFor(userType)) return "The new UI is not available for this account type yet.";
  return null;
}
