module.exports = {
  apps: [
    {
      name: "as-salamjs", // ✅ Change to your preferred app name
      script: "server.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      env: {
        NODE_ENV: "production"
      },
      watch: false,           // Disable watching in production
      instances: 1,           // Or 'max' for clustering
      autorestart: true,      // Auto-restart on crash
      max_memory_restart: "512M" // Restart if memory exceeds this limit
    }
  ]
}
