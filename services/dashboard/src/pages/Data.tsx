import { Database, Table2, FolderTree, Plus, MoreVertical, Search } from 'lucide-react'
import { useState } from 'react'

const databases = [
  { name: 'default', tables: 12 },
  { name: 'analytics', tables: 8 },
  { name: 'raw', tables: 25 },
]

const tables = [
  { id: 1, name: 'customers', database: 'analytics', format: 'delta', rows: '1.2M', size: '256 MB', updated: '2 hours ago' },
  { id: 2, name: 'transactions', database: 'analytics', format: 'delta', rows: '45M', size: '2.1 GB', updated: '1 hour ago' },
  { id: 3, name: 'products', database: 'analytics', format: 'delta', rows: '50K', size: '12 MB', updated: '1 day ago' },
  { id: 4, name: 'events_raw', database: 'raw', format: 'parquet', rows: '500M', size: '15 GB', updated: '30 min ago' },
]

export default function Data() {
  const [selectedDb, setSelectedDb] = useState('analytics')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTables = tables.filter(t => 
    t.database === selectedDb && 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Catalog</h1>
          <p className="text-gray-500 mt-1">Browse and manage your Delta Lake tables</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Table</span>
        </button>
      </div>

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
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>{db.name}</span>
                </div>
                <span className="text-xs text-gray-400">{db.tables}</span>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTables.map((table) => (
                  <tr key={table.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Table2 className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{table.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        table.format === 'delta' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {table.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{table.rows}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{table.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{table.updated}</td>
                    <td className="px-6 py-4">
                      <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
