import {
  Database,
  Table2,
  FolderTree,
  Plus,
  MoreVertical,
  Search,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

// Mock databases for now, as the API doesn't support listing databases yet
const databases = [{ name: "default", tables: 0 }];

export default function Data() {
  const [selectedDb, setSelectedDb] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getTables(selectedDb);
      setTables(response.tables || []);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
      setError("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [selectedDb]);

  const handleDeleteTable = async (id: number, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete table "${name}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await api.deleteTable(id, true); // true = drop data
      fetchTables();
    } catch (err) {
      console.error("Failed to delete table:", err);
      alert("Failed to delete table");
    }
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Catalog</h1>
          <p className="text-gray-500 mt-1">
            Browse and manage your Delta Lake tables
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchTables}
            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Databases sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <FolderTree className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Databases</h2>
          </div>
          <div className="space-y-1">
            {databases.map((db) => (
              <button
                key={db.name}
                onClick={() => setSelectedDb(db.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedDb === db.name
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>{db.name}</span>
                </div>
                {/* <span className="text-xs text-gray-400">{db.tables}</span> */}
              </button>
            ))}
          </div>
        </div>

        {/* Tables list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTables.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No tables found in this database.
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((table) => (
                    <tr key={table.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <Table2 className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {table.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            table.format === "delta"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {table.format || "delta"}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs"
                        title={table.location}
                      >
                        {table.location}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(table.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            handleDeleteTable(table.id, table.name)
                          }
                          className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Table"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
