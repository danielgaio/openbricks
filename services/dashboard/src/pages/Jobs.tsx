import { PlayCircle, Plus, Pause, RotateCw, MoreVertical, CheckCircle, XCircle } from 'lucide-react'

const jobs = [
  { id: 1, name: 'Daily ETL Pipeline', schedule: '0 6 * * *', lastRun: '6:00 AM', nextRun: 'Tomorrow 6:00 AM', status: 'success', duration: '45m' },
  { id: 2, name: 'Hourly Metrics Sync', schedule: '0 * * * *', lastRun: '3:00 PM', nextRun: '4:00 PM', status: 'running', duration: '-' },
  { id: 3, name: 'ML Model Retraining', schedule: '0 2 * * 0', lastRun: 'Last Sunday', nextRun: 'Sunday 2:00 AM', status: 'failed', duration: '2h 15m' },
  { id: 4, name: 'Data Quality Checks', schedule: '0 8 * * *', lastRun: '8:00 AM', nextRun: 'Tomorrow 8:00 AM', status: 'success', duration: '12m' },
]

const statusIcons: Record<string, JSX.Element> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  running: <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />,
  failed: <XCircle className="w-5 h-5 text-red-500" />,
}

export default function Jobs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Scheduled and on-demand job execution</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Job</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Next Run</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <PlayCircle className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{job.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{job.schedule}</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{job.lastRun}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{job.nextRun}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{job.duration}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {statusIcons[job.status]}
                    <span className="text-sm capitalize">{job.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {job.status === 'running' ? (
                      <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-green-600">
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}
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
