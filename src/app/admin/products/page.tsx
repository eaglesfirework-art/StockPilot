import { ItemList, type ItemFilters } from "../_items/ItemList";

export default function Products({ searchParams }: { searchParams: ItemFilters }) {
  return <ItemList kind="FINISHED_GOOD" searchParams={searchParams} />;
}
