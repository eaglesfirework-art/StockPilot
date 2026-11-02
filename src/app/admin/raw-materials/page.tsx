import { ItemList, type ItemFilters } from "../_items/ItemList";

export default function RawMaterials({ searchParams }: { searchParams: ItemFilters }) {
  return <ItemList kind="RAW_MATERIAL" searchParams={searchParams} />;
}
