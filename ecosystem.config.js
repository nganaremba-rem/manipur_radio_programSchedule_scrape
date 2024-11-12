module.exports = {
  apps: [{
    name: 'radio-server',
    script: 'dist/server.js',
    // Specify the number of instances
    instances: 'max',     // Use 'max' for all CPU cores, or specify a number
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    
    // Auto restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '1m',
    
    // Environment variables
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    // Error handling and logs
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // Graceful shutdown and start
    kill_timeout: 3000,    // Time to wait before forced shutdown
    wait_ready: true,      // Wait for ready event
    listen_timeout: 8000,  // Time to wait for listen event
    
    // Watch and restart
    watch: false,          // Enable/disable watch feature
    ignore_watch: [        // Paths to ignore when watching
      'node_modules',
      'logs',
      '.git'
    ],
    
    // Source map support for stack traces
    source_map_support: true,
  }]
};