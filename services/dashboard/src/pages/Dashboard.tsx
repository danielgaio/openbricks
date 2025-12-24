import { 
  Server, 
  FileCode, 
  PlayCircle, 
  Database,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const stats = [
  { name: 'Active Clusters', value: '2', icon: Server, color: 'text-green-500' },
  { name: 'Notebooks', value: '12', icon: FileCode, color: 'text-blue-500' },
  { name: 'Running Jobs', value: '3', icon: PlayCircle, color: 'text-purple-500' },
  { name: 'Tables', value: '45', icon: Database, color: 'text-orange-500' },
]

const recentActivity = [
  { id: 1, type: 'job', status: 'success', name: 'ETL Pipeline - Daily', time: '2 minutes ago' },
  { id: 2, type: 'notebook', status: 'running', name: 'Data Analysis Q4', time: '15 minutes ago' },
  { id: 3, type: 'cluster', status: 'started', name: 'Analytics Cluster', time: '1 hour ago' },
  { id: 4, type: 'job', status: 'failed', name: 'ML Training Job', time: '2 hours ago' },
  { id: 5, type: 'table', status: 'created', name: 'sales_2024', time: '3 hours ago' },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to OpenBricks Studio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Compute Usage</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400">Usage chart coming soon</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 py-2">
                {activity.status === 'success' || activity.status === 'started' || activity.status === 'created' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : activity.status === 'running' ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.name}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <FileCode className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">New Notebook</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <PlayCircle className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-700">Run Job</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Server className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-700">Start Cluster</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <Database className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-700">Browse Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
