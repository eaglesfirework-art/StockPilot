import { db } from "@/server/db";
import { getUser } from "@/server/auth";
import { usersWithActivity } from "@/server/master";
import { ActionForm } from "@/components/ActionForm";
import { FilterBar } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { userAction, userDeleteAction, userUpdateAction } from "@/server/actions";
import { LIST_PAGE, pageOf } from "@/server/queries";
import { qs } from "@/lib/filters";
import { formatPhone } from "@/lib/phone";

type SP = { q?: string; role?: string; status?: string; page?: string };

export default async function Users({ searchParams: sp }: { searchParams: SP }) {
  const q = sp.q?.trim() ?? "";
  const role = sp.role === "ADMIN" || sp.role === "WORKER" ? sp.role : "";
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : "";
  const page = pageOf(sp);
  const phoneLike = /^[\d\s+()-]+$/.test(q);
  const [me, busy, found] = await Promise.all([
    getUser(), usersWithActivity(),
    db.user.findMany({
      where: {
        ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, ...(phoneLike ? [{ phone: { contains: q.replace(/\D/g, "") } }] : [])] }),
        ...(role && { role }), ...(status && { active: status === "active" }),
      },
      orderBy: { createdAt: "asc" }, take: LIST_PAGE + 1, skip: (page - 1) * LIST_PAGE,
    }),
  ]);
  const users = found.slice(0, LIST_PAGE);
  return (
    <>
      <h1>Users</h1>
      <FilterBar clear="/admin/users">
        <label>Search<input name="q" defaultValue={q} placeholder="Name, email or phone" /></label>
        <label>Role<select name="role" defaultValue={role}><option value="">All</option><option value="ADMIN">Admin</option><option value="WORKER">Worker</option></select></label>
        <label>Status<select name="status" defaultValue={status}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </FilterBar>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => {
            const self = u.id === me?.id;
            return (
              <tr key={u.id} className={u.active ? "" : "inactive"}>
                <td><b>{u.name}</b>{self && <span className="muted"> (you)</span>}</td><td>{u.email}</td><td>{formatPhone(u.phone) || "—"}</td>
                <td>{u.role === "ADMIN" ? "Admin" : "Worker"}</td>
                <td>{u.active ? <span className="badge green">Active</span> : <span className="badge red">Inactive</span>}</td>
                <td>
                  <RowActions
                    id={u.id} name={u.name} entity="user" updateAction={userUpdateAction} deleteAction={userDeleteAction}
                    deleteBlock={self ? "You cannot delete your own account." : busy.has(u.id) ? "This user has saved entries or log history. Deactivate instead (Edit, then untick Active)." : null}
                    fields={
                      <>
                        <label>Name<input name="name" defaultValue={u.name} required /></label>
                        <label>Email<input name="email" type="email" defaultValue={u.email} required /></label>
                        <label>Mobile (India)<input name="phone" type="tel" inputMode="tel" defaultValue={formatPhone(u.phone)} placeholder="98765 43210" /></label>
                        <label>Role
                          {self
                            ? <><select defaultValue={u.role} disabled><option value="WORKER">Worker</option><option value="ADMIN">Admin</option></select><input type="hidden" name="role" value={u.role} /></>
                            : <select name="role" defaultValue={u.role}><option value="WORKER">Worker</option><option value="ADMIN">Admin</option></select>}
                        </label>
                        <label>New password (leave blank to keep)<input name="password" type="password" autoComplete="new-password" minLength={8} /></label>
                        {self
                          ? <><p className="muted">You cannot deactivate yourself.</p><input type="hidden" name="active" value="on" /></>
                          : <label className="check"><input type="checkbox" name="active" defaultChecked={u.active} />Active (inactive users cannot log in)</label>}
                      </>
                    }
                  />
                </td>
              </tr>
            );
          })}
          {users.length === 0 && <tr><td colSpan={6} className="muted">No users match these filters.</td></tr>}
        </tbody>
      </table></div>
      <Pager page={page} hasMore={found.length > LIST_PAGE} base={`/admin/users${qs({ q, role, status })}`} />
      <p className="muted">A user who has saved anything can only be deactivated, not deleted.</p>

      <h2>Add user</h2>
      <ActionForm action={userAction} label="Create user" className="form inline">
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Mobile (India, optional)<input name="phone" type="tel" inputMode="tel" placeholder="98765 43210" /></label>
        <label>Role<select name="role"><option value="WORKER">Worker</option><option value="ADMIN">Admin</option></select></label>
        <label>Password (8+ characters)<input name="password" type="password" minLength={8} required /></label>
      </ActionForm>
    </>
  );
}
