import test from "node:test";
import assert from "node:assert/strict";
import { NEW_UI_ROLES, newUiAvailableFor, prefersNewUi, newUiHome, validateUiPreference } from "./uiPreference.js";

test("classic is the default: nothing prefers the new UI unless it was chosen", () => {
  assert.equal(prefersNewUi(null), false);
  assert.equal(prefersNewUi({ UserType: "Management" }), false);
  assert.equal(prefersNewUi({ UserType: "Management", UiPreference: "classic" }), false);
  assert.equal(prefersNewUi({ UserType: "Management", UiPreference: "next" }), true);
});

test("a stored preference is ignored for account types without a new UI", () => {
  assert.equal(prefersNewUi({ UserType: "Student", UiPreference: "next" }), false);
  assert.equal(newUiAvailableFor("Student"), false);
  assert.deepEqual(NEW_UI_ROLES, ["Management"]);
});

test("validation", () => {
  assert.equal(validateUiPreference("Management", "next"), null);
  assert.equal(validateUiPreference("Management", "classic"), null);
  assert.equal(validateUiPreference("Student", "classic"), null, "anyone may stay on classic");
  assert.match(validateUiPreference("Student", "next"), /not available/);
  assert.match(validateUiPreference("Management", "dark"), /must be/);
  assert.match(validateUiPreference("Management", undefined), /must be/);
});

test("the new UI starts at /v2", () => assert.equal(newUiHome(), "/v2"));
