module.exports = {
  apps: [
    {
      name: 'schoolerp-api',
      script: 'server.js',
      cwd: '/var/www/projects/schoolerp/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5006,
      },
    },
  ],
};
