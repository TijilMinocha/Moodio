import { SearchClient } from "@/components/SearchClient";

export default function SearchPage() {
  return (
    <div className="px-4 py-6 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold">Search</h1>
      </header>
      <SearchClient />
    </div>
  );
}
