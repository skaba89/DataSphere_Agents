'use client'

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Profile */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                defaultValue="john@example.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
              <button className="border border-border px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Enable
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your password</p>
              </div>
              <button className="border border-border px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Update
              </button>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-muted-foreground mb-4">
            API keys allow you to authenticate requests to the DataSphere Agents API.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Production Key</p>
                <p className="text-xs text-muted-foreground font-mono">dsa_••••••••••••••••</p>
              </div>
              <button className="text-xs text-red-500 hover:text-red-700">Revoke</button>
            </div>
          </div>
          <button className="mt-4 border border-border px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            + Create API Key
          </button>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These actions are irreversible. Please be careful.
          </p>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
