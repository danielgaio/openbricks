import { FolderKanban, Plus, MoreVertical } from 'lucide-react'

const workspaces = [
  { id: 1, name: 'Analytics', description: 'Business analytics and reporting', notebooks: 5, created: '2024-01-15' },
  { id: 2, name: 'ML Projects', description: 'Machine learning experiments', notebooks: 8, created: '2024-01-10' },
  { id: 3, name: 'ETL Pipelines', description: 'Data transformation jobs', notebooks: 12, created: '2024-01-05' },
]

export default function Workspaces() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-500 mt-1">Organize your notebooks and assets</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                  <p className="text-sm text-gray-500">{workspace.notebooks} notebooks</p>
                </div>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-3">{workspace.description}</p>
            <p className="text-xs text-gray-400 mt-2">Created {workspace.created}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
