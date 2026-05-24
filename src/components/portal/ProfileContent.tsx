import prisma from "@/lib/db";
import { ProfileForm } from "@/components/portal/ProfileForm";

export default async function ProfileContent({ user: sessionUser }: { user: any }) {
  if (!sessionUser?.id && !sessionUser?.email) {
    return <div className="p-8 bg-red-50 text-red-600 rounded-xl">Invalid session data. Please re-login.</div>;
  }

  // Fetch full user data from DB using session ID or email fallback
  const user = await prisma.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email },
  }) as any;

  if (!user) {
    return <div className="p-8 bg-red-50 text-red-600 rounded-xl">User record not found in database.</div>;
  }

  const serializedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    dept: user.dept,
    supervisor: user.supervisor,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    phone: user.phone,
    address: user.address,
    bio: user.bio,
    grade: user.grade,
    board: user.board,
    targetUni: user.targetUni,
    specialization: user.specialization,
    hourlyRate: user.hourlyRate,
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-sm font-black text-[var(--gold)] uppercase tracking-widest mb-1">Your Identity</h2>
          <h1 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Account Profile</h1>
        </div>
      </div>

      <ProfileForm user={serializedUser} />
    </div>
  );
}
