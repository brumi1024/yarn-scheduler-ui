import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clusterProxyTarget = env.VITE_CLUSTER_PROXY_TARGET;

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: clusterProxyTarget
      ? {
          proxy: {
            '/ws/v1/cluster': {
              target: clusterProxyTarget,
              changeOrigin: true,
              secure: false,
            },
            '/conf': {
              target: clusterProxyTarget,
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
  };
});
