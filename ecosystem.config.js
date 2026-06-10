module.exports = {
  apps: [
    {
      name: "tttgmb-portal",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/master/applications/APP_NAME/public_html",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
