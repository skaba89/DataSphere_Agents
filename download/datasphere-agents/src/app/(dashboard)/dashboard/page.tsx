'use client'

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to DataSphere Agents</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Agents', value: '12', change: '+2 this week', icon: '🤖' },
          { label: 'Conversations', value: '1,847', change: '+142 today', icon: '💬' },
          { label: 'Tokens Used', value: '2.4M', change: '67% of limit', icon: '🪙' },
          { label: 'Team Members', value: '8', change: '+1 this month', icon: '👥' },
        ].map((stat) => (
          <div key={stat.label} className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Agent "Support Bot" completed a conversation', time: '2 minutes ago', type: 'success' },
              { action: 'New conversation started with "Sales Assistant"', time: '15 minutes ago', type: 'info' },
              { action: 'Agent "Data Analyst" workflow completed', time: '1 hour ago', type: 'success' },
              { action: 'Subscription upgraded to Pro plan', time: '3 hours ago', type: 'info' },
              { action: 'New team member joined the organization', time: '5 hours ago', type: 'info' },
              { action: 'Agent "Code Reviewer" encountered an error', time: '6 hours ago', type: 'error' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    activity.type === 'success'
                      ? 'bg-green-500'
                      : activity.type === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="text-sm font-medium">Create New Agent</p>
              <p className="text-xs text-muted-foreground">Set up a new AI agent</p>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="text-sm font-medium">Start Conversation</p>
              <p className="text-xs text-muted-foreground">Chat with an agent</p>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="text-sm font-medium">Create Workflow</p>
              <p className="text-xs text-muted-foreground">Automate multi-step tasks</p>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="text-sm font-medium">Invite Team Member</p>
              <p className="text-xs text-muted-foreground">Grow your team</p>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <p className="text-sm font-medium">View API Keys</p>
              <p className="text-xs text-muted-foreground">Manage integrations</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
