module.exports = {
  apps: [
    {
      name: 'ic-api',
      script: './src/main.ts',
      instances: 1,
      exec_mode: 'cluster_mode',
    },
  ],
};
