import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <p>Unauthorized</p>;
  }

  return <div>Welcome, {session.user?.email}</div>;
}
