import Link from "next/link";

const initials = (name: string) => name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

// A round profile badge with the user's initials. With `href` it links to the profile page.
export function Avatar({ name, href, size = 32 }: { name: string; href?: string; size?: number }) {
  const dot = <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>{initials(name)}</span>;
  if (!href) return dot;
  return (
    <Link href={href} className="avatar-link" aria-label={`My profile (${name})`} title="My profile">
      {dot}
    </Link>
  );
}
