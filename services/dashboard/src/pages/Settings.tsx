import { User, Shield, Database, Bell, Palette } from 'lucide-react'

const settingsSections = [
  {
    id: 'profile',
    name: 'Profile',
    icon: User,
    description: 'Manage your account settings and preferences',
  },
  {
    id: 'security',
    name: 'Security',
    icon: Shield,
    description: 'Configure authentication and access controls',
  },
  {
    id: 'data',
    name: 'Data Sources',
    icon: Database,
    description: 'Connect external databases and storage',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    description: 'Configure alerts and notification preferences',
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel of the dashboard',
  },
]

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your OpenBricks configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <section.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{section.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{section.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium">0.1.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Spark Version</p>
            <p className="font-medium">3.5.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Delta Lake Version</p>
            <p className="font-medium">3.0.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">License</p>
            <p className="font-medium">Apache 2.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
