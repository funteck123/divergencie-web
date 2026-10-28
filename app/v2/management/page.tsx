import { redirect } from "next/navigation";

/** /v2/management has no page of its own: a bookmark or a typed address lands on Accounts, the management home (the same target as the /v2 root). */
export default function ManagementHome() {
  redirect("/v2/management/accounts");
}
