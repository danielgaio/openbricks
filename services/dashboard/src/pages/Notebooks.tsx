import { FileCode, Plus, Play, MoreVertical } from 'lucide-react'

const notebooks = [
  { id: 1, name: 'Sales Analysis', language: 'Python', workspace: 'Analytics', modified: '2 hours ago', status: 'idle' },
  { id: 2, name: 'Customer Segmentation', language: 'Python', workspace: 'ML Projects', modified: '1 day ago', status: 'running' },
  { id: 3, name: 'ETL Daily Load', language: 'SQL', workspace: 'ETL Pipelines', modified: '3 days ago', status: 'idle' },
  { id: 4, name: 'Revenue Forecast', language: 'Python', workspace: 'Analytics', modified: '1 week ago', status: 'idle' },
]

const languageColors: Record<string, string> = {
  Python: 'bg-yellow-100 text-yellow-800',
  SQL: 'bg-blue-100 text-blue-800',
  Scala: 'bg-red-100 text-red-800',
  R: 'bg-green-100 text-green-800',
}

export default function Notebooks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notebooks</h1>
          <p className="text-gray-500 mt-1">Interactive data exploration and analysis</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Notebook</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Workspace</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notebooks.map((notebook) => (
              <tr key={notebook.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <FileCode className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{notebook.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${languageColors[notebook.language]}`}>
                    {notebook.language}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{notebook.workspace}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{notebook.modified}</td>
                <td className="px-6 py-4">
                  {notebook.status === 'running' ? (
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Running</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Idle</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
