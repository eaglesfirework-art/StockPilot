import { pageUser } from "@/server/auth";
import { ProfileView } from "@/components/ProfileView";

export default async function WorkerProfile() {
  const u = await pageUser();
  return <ProfileView inline={false} user={{ name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt }} />;
}
