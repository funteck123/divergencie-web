import test from "node:test";
import assert from "node:assert/strict";
import { addTemplate, updateTemplate, removeTemplate, cleanTemplateInput, nextTemplateId, sortTemplates, TemplateError, TEMPLATE_LIMITS } from "./templates.js";

const NOW = "2026-10-14T12:00:00.000Z";

test("add: trims, numbers from TPL-0001, stamps who and when", () => {
  const { list, template } = addTemplate([], { name: "  Payment reminder ", body: "  Dear parent,\r\nPlease pay.  " }, { by: "MGT-0001", now: NOW });
  assert.deepEqual(template, { TemplateID: "TPL-0001", Name: "Payment reminder", Body: "Dear parent,\nPlease pay.", UpdatedAt: NOW, UpdatedBy: "MGT-0001" });
  assert.equal(list.length, 1);
});

test("ids are never reused after a delete", () => {
  let { list } = addTemplate([], { name: "A", body: "a" });
  list = addTemplate(list, { name: "B", body: "b" }).list;
  list = removeTemplate(list, "TPL-0002");
  assert.equal(nextTemplateId(list), "TPL-0002");
  list = addTemplate(addTemplate(list, { name: "C", body: "c" }).list, { name: "D", body: "d" }).list;
  assert.deepEqual(list.map((t) => t.TemplateID), ["TPL-0001", "TPL-0002", "TPL-0003"]);
});

test("rejects empty and over-long fields with a message for the user", () => {
  assert.throws(() => cleanTemplateInput({ name: " ", body: "x" }), /name/);
  assert.throws(() => cleanTemplateInput({ name: "x", body: "  " }), /text/);
  assert.throws(() => cleanTemplateInput({ name: "n".repeat(TEMPLATE_LIMITS.name + 1), body: "x" }), TemplateError);
  assert.throws(() => cleanTemplateInput({ name: "x", body: "b".repeat(TEMPLATE_LIMITS.body + 1) }), TemplateError);
  assert.doesNotThrow(() => cleanTemplateInput({ name: "n".repeat(TEMPLATE_LIMITS.name), body: "b".repeat(TEMPLATE_LIMITS.body) }));
});

test("duplicate names are refused, ignoring case, but a template may keep its own name when edited", () => {
  const { list } = addTemplate([], { name: "Payment reminder", body: "a" });
  assert.throws(() => addTemplate(list, { name: "payment REMINDER", body: "b" }), /already exists/);
  const out = updateTemplate(list, "TPL-0001", { name: "Payment Reminder", body: "new" }, { now: NOW, by: "MGT-0001" });
  assert.equal(out.template.Body, "new");
  assert.equal(out.template.UpdatedBy, "MGT-0001");
  const two = addTemplate(list, { name: "Other", body: "o" }).list;
  assert.throws(() => updateTemplate(two, "TPL-0002", { name: "payment reminder", body: "o" }), /already exists/);
});

test("update and remove of a missing id say so; update does not touch the others", () => {
  const { list } = addTemplate(addTemplate([], { name: "A", body: "a" }).list, { name: "B", body: "b" });
  assert.throws(() => updateTemplate(list, "TPL-0099", { name: "X", body: "x" }), /not found/);
  assert.throws(() => removeTemplate(list, "TPL-0099"), /not found/);
  const out = updateTemplate(list, "TPL-0001", { name: "A2", body: "a2" });
  assert.deepEqual(out.list[1], list[1]);
});

test("the list is capped", () => {
  let list = [];
  for (let i = 0; i < TEMPLATE_LIMITS.count; i++) list = addTemplate(list, { name: `T${i}`, body: "x" }).list;
  assert.throws(() => addTemplate(list, { name: "one more", body: "x" }), /at most/);
});

test("sorted by name, ignoring case", () => {
  assert.deepEqual(sortTemplates([{ Name: "b" }, { Name: "A" }, { Name: "c" }]).map((t) => t.Name), ["A", "b", "c"]);
});
