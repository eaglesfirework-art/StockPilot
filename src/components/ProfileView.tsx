import { PasswordInput } from "@/components/ui/PasswordInput";
import { ActionForm } from "@/components/ActionForm";
import { passwordAction, profileAction } from "@/server/actions";
import { formatPhone } from "@/lib/phone";
import { dOnly } from "@/lib/fmt";

export function ProfileView({ user, inline }: {
  user: { name: string; email: string; phone: string | null; role: string; createdAt: Date }; inline: boolean;
}) {
  const cls = inline ? "form inline" : "form";
  return (
    <>
      <h1>My profile</h1>
      <div className="card">
        <div className="muted">Login email</div><b>{user.email}</b>
        <div className="muted" style={{ marginTop: ".6rem" }}>Role</div><b>{user.role === "ADMIN" ? "Admin" : "Manager"}</b>
        <div className="muted" style={{ marginTop: ".6rem" }}>Member since</div><b>{dOnly(user.createdAt)}</b>
      </div>

      <h2>Details</h2>
      <ActionForm action={profileAction} label="Save profile" className={cls} resetOnOk={false}>
        <label>Name<input name="name" defaultValue={user.name} required /></label>
        <label>Mobile number (India)<input name="phone" type="tel" inputMode="tel" defaultValue={formatPhone(user.phone)} placeholder="98765 43210" /></label>
      </ActionForm>
      <p className="muted">10 digits starting with 6 to 9. Saved as +91.</p>

      <h2>Change password</h2>
      <ActionForm action={passwordAction} label="Change password" className={cls}>
        <label>Current password<PasswordInput name="current" autoComplete="current-password" required /></label>
        <label>New password (8+ characters)<PasswordInput name="next" minLength={8} autoComplete="new-password" required /></label>
        <label>Repeat new password<PasswordInput name="confirm" minLength={8} autoComplete="new-password" required /></label>
      </ActionForm>
    </>
  );
}
