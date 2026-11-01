import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { userAction, userToggleAction } from "@/server/actions";

export default async function Users() {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <h1>Users</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
            <td>{u.active ? <span className="badge green">Active</span> : <span className="badge red">Inactive</span>}</td>
            <td><ActionForm action={userToggleAction} label={u.active ? "Deactivate" : "Activate"} className="form inline" resetOnOk={false}>
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={String(!u.active)} /></ActionForm></td></tr>))}</tbody></table></div>
      <h2>Add user</h2>
      <ActionForm action={userAction} label="Create user" className="form inline">
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Role<select name="role"><option value="WORKER">Worker</option><option value="ADMIN">Admin</option></select></label>
        <label>Password (8+ characters)<input name="password" type="password" minLength={8} required /></label>
      </ActionForm>
    </>
  );
}
