import { NextResponse } from "next/server";
import { requireManagement, requireSession } from "@/lib/authz";
import { logAudit } from "@/lib/logging";
import { getTemplates, setTemplates } from "@/lib/mcqConfig";
import { addTemplate, removeTemplate, sortTemplates, TemplateError, updateTemplate } from "@/lib/templates";

// TKT-0292: reusable text templates. Management, Staff and Teachers can read and copy them; only Management changes them.
// body: POST { name, body } | PATCH { templateId, name, body } | DELETE { templateId }
const READERS = ["Management", "Staff", "Teacher"];

function fail(e) {
  if (e instanceof TemplateError) return NextResponse.json({ error: e.message }, { status: 400 });
  return NextResponse.json({ error: e.message || "Could not use templates." }, { status: 500 });
}

export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  if (!READERS.includes(session.userType)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    return NextResponse.json({ templates: sortTemplates(await getTemplates()) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;
  try {
    const { name, body } = await req.json();
    const { list, template } = addTemplate(await getTemplates(), { name, body }, { by: session.userId });
    await setTemplates(list);
    await logAudit({ actorUserId: session.userId, action: "create", entityType: "Template", entityId: template.TemplateID, summary: `Added template ${template.Name}` });
    return NextResponse.json({ template });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;
  try {
    const { templateId, name, body } = await req.json();
    const { list, template } = updateTemplate(await getTemplates(), String(templateId || ""), { name, body }, { by: session.userId });
    await setTemplates(list);
    await logAudit({ actorUserId: session.userId, action: "edit", entityType: "Template", entityId: template.TemplateID, summary: `Edited template ${template.Name}` });
    return NextResponse.json({ template });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;
  try {
    const { templateId } = await req.json();
    const current = await getTemplates();
    const gone = current.find((t) => t.TemplateID === templateId);
    await setTemplates(removeTemplate(current, String(templateId || "")));
    await logAudit({ actorUserId: session.userId, action: "delete", entityType: "Template", entityId: templateId, summary: `Deleted template ${gone?.Name}`, snapshot: gone });
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
