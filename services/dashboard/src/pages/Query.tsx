import { useState } from "react";
import { Play, Terminal, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";

export default function Query() {
  const [query, setQuery] = useState("SELECT * FROM default.users LIMIT 10");
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleRunQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setColumns([]);
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      const response = await api.executeQuery(query);

      if (response.data && response.data.length > 0) {
        setColumns(Object.keys(response.data[0]));
        setResults(response.data);
      } else {
        setResults([]);
      }

      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
    } catch (err: any) {
      console.error("Query execution failed:", err);
      setError(err.response?.data?.detail || "Query execution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SQL Lab</h1>
          <p className="text-gray-500 mt-1">
            Execute Spark SQL queries against your Data Lake
          </p>
        </div>
        <button
          onClick={handleRunQuery}
          disabled={loading}
          className={`flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors ${
            loading ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          <Play className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Running..." : "Run Query"}</span>
        </button>
      </div>

      {/* Query Editor */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-2 mb-2 text-sm text-gray-500">
          <Terminal className="w-4 h-4" />
          <span className="font-medium">Query Editor</span>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-40 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter your SQL query here..."
          spellCheck={false}
        />
        <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
          <span>Cmd/Ctrl + Enter to run</span>
          <span>Spark SQL supported</span>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm min-h-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
          <h2 className="font-semibold text-gray-900">Results</h2>
          {executionTime && (
            <span className="text-xs text-gray-500 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
              Executed in {executionTime.toFixed(2)}ms
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Query Failed
              </h3>
              <p className="text-red-600 max-w-2xl mx-auto font-mono text-sm bg-red-50 p-4 rounded border border-red-100">
                {error}
              </p>
            </div>
          ) : results.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 whitespace-nowrap border-b border-gray-200"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={`${i}-${col}`}
                        className="px-6 py-3 whitespace-nowrap text-gray-900"
                      >
                        {typeof row[col] === "object"
                          ? JSON.stringify(row[col])
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Terminal className="w-12 h-12 mb-4 text-gray-300" />
              <p>Run a query to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
