"use client";

import { TemplateList } from "@/ui2/features/templates/TemplatesView";
import { Card } from "./Cards";

/** Teachers and Staff copy the standard messages here (payment reminder and so on). Management keeps them under Templates. */
export function TemplatesCard() {
  return (
    <Card title="Message templates">
      <TemplateList canEdit={false} />
    </Card>
  );
}
