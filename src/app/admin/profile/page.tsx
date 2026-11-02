import { pageUser } from "@/server/auth";
import { ProfileView } from "@/components/ProfileView";

export default async function AdminProfile() {
  const u = await pageUser("ADMIN");
  return <ProfileView inline user={{ name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt }} />;
}
