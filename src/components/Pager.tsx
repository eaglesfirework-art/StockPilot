import Link from "next/link";

export function Pager({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className="pager">
      {page > 1 && <Link href={href(page - 1)}>← Newer</Link>}
      <span>Page {page}</span>
      {hasMore && <Link href={href(page + 1)}>Older →</Link>}
    </div>
  );
}
