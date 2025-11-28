import { Server, Plus, Play, Square, MoreVertical } from 'lucide-react'

const clusters = [
  { id: 1, name: 'Analytics Cluster', type: 'Standard', workers: 4, memory: '32 GB', status: 'running', uptime: '2d 4h' },
  { id: 2, name: 'ML Training', type: 'GPU', workers: 2, memory: '64 GB', status: 'stopped', uptime: '-' },
  { id: 3, name: 'Development', type: 'Standard', workers: 1, memory: '8 GB', status: 'running', uptime: '5h 30m' },
]

const statusColors: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  stopped: 'bg-gray-100 text-gray-800',
  starting: 'bg-yellow-100 text-yellow-800',
  terminating: 'bg-red-100 text-red-800',
}

export default function Clusters() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clusters</h1>
          <p className="text-gray-500 mt-1">Manage your Spark compute clusters</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Cluster</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  cluster.status === 'running' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Server className={`w-5 h-5 ${
                    cluster.status === 'running' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[cluster.status]}`}>
                    {cluster.status}
                  </span>
                </div>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium">{cluster.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Workers</p>
                <p className="font-medium">{cluster.workers}</p>
              </div>
              <div>
                <p className="text-gray-500">Memory</p>
                <p className="font-medium">{cluster.memory}</p>
              </div>
              <div>
                <p className="text-gray-500">Uptime</p>
                <p className="font-medium">{cluster.uptime}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
              {cluster.status === 'running' ? (
                <button className="flex-1 flex items-center justify-center space-x-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors">
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              ) : (
                <button className="flex-1 flex items-center justify-center space-x-2 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors">
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
