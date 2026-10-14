// TKT-0292: reusable text templates (payment reminder, payment acknowledged, ...) that staff copy instead of digging through
// chat history. Pure functions over a plain array, so the rules are testable without a database.
export const TEMPLATE_LIMITS = { name: 80, body: 4000, count: 100 };

export class TemplateError extends Error {}

/** Trims and checks one template's fields. Throws TemplateError with a message fit to show the user. */
export function cleanTemplateInput(input) {
  const name = String(input?.name ?? "").trim();
  const body = String(input?.body ?? "").replace(/\r\n/g, "\n").trim();
  if (!name) throw new TemplateError("Give the template a name.");
  if (!body) throw new TemplateError("Write the template text.");
  if (name.length > TEMPLATE_LIMITS.name) throw new TemplateError(`The name can be at most ${TEMPLATE_LIMITS.name} characters.`);
  if (body.length > TEMPLATE_LIMITS.body) throw new TemplateError(`The text can be at most ${TEMPLATE_LIMITS.body} characters.`);
  return { name, body };
}

/** Next id after the highest existing one: TPL-0001, TPL-0002 ... Ids are never reused after a delete. */
export function nextTemplateId(list) {
  const max = list.reduce((m, t) => Math.max(m, Number(String(t.TemplateID || "").replace(/\D/g, "")) || 0), 0);
  return `TPL-${String(max + 1).padStart(4, "0")}`;
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function addTemplate(list, input, { by = "", now = new Date().toISOString() } = {}) {
  const { name, body } = cleanTemplateInput(input);
  if (list.length >= TEMPLATE_LIMITS.count) throw new TemplateError(`There can be at most ${TEMPLATE_LIMITS.count} templates. Delete one you no longer use.`);
  if (list.some((t) => sameName(t.Name, name))) throw new TemplateError("A template with this name already exists.");
  const template = { TemplateID: nextTemplateId(list), Name: name, Body: body, UpdatedAt: now, UpdatedBy: by };
  return { list: [...list, template], template };
}

export function updateTemplate(list, id, input, { by = "", now = new Date().toISOString() } = {}) {
  const current = list.find((t) => t.TemplateID === id);
  if (!current) throw new TemplateError("Template not found.");
  const { name, body } = cleanTemplateInput(input);
  if (list.some((t) => t.TemplateID !== id && sameName(t.Name, name))) throw new TemplateError("A template with this name already exists.");
  const template = { ...current, Name: name, Body: body, UpdatedAt: now, UpdatedBy: by };
  return { list: list.map((t) => (t.TemplateID === id ? template : t)), template };
}

export function removeTemplate(list, id) {
  if (!list.some((t) => t.TemplateID === id)) throw new TemplateError("Template not found.");
  return list.filter((t) => t.TemplateID !== id);
}

/** Alphabetical by name, ignoring case, so the list reads the same for everyone. */
export function sortTemplates(list) {
  return [...list].sort((a, b) => a.Name.localeCompare(b.Name, undefined, { sensitivity: "base" }));
}
