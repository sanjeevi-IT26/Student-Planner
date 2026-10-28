import { clerkClient, type User } from "@clerk/express";
import { eq } from "drizzle-orm";
import { campusUsersTable, db, type CampusUser } from "@workspace/db";

function verifiedPrimaryEmail(user: User): string | null {
  const primary = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  if (!primary || primary.verification?.status !== "verified") return null;
  return primary.emailAddress.trim().toLowerCase();
}

export async function profileFromClerkUser(
  user: User,
  createAsFaculty = false,
): Promise<CampusUser | null> {
  const [existing] = await db
    .select()
    .from(campusUsersTable)
    .where(eq(campusUsersTable.id, user.id))
    .limit(1);
  if (existing) return existing;

  const email = verifiedPrimaryEmail(user);
  if (!email) return null;

  const bootstrapEmail = process.env.CAMPUS_TRACK_INITIAL_FACULTY_EMAIL
    ?.trim()
    .toLowerCase();
  const role =
    createAsFaculty ||
    (bootstrapEmail !== undefined && email === bootstrapEmail)
      ? "faculty"
      : "student";
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || email;

  const [created] = await db
    .insert(campusUsersTable)
    .values({ id: user.id, email, displayName, role })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [raced] = await db
    .select()
    .from(campusUsersTable)
    .where(eq(campusUsersTable.id, user.id))
    .limit(1);
  return raced ?? null;
}

export async function getClerkUserForEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await clerkClient.users.getUserList({
    emailAddress: [normalizedEmail],
    limit: 1,
  });
  return (
    result.data.find((user) =>
      user.emailAddresses.some(
        (address) =>
          address.emailAddress.trim().toLowerCase() === normalizedEmail &&
          address.verification?.status === "verified",
      ),
    ) ?? null
  );
}
