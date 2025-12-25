/** @type {import('next').NextConfig} */
const nextConfig = {
  // // Do not expose source maps to browsers, but still emit them for offline debugging.
  // productionBrowserSourceMaps: false,
  // webpack: (config, { dev, isServer }) => {
  //   if (!dev && !isServer) {
  //     // Emit hidden source maps: files are generated without a sourceMappingURL in the bundle.
  //     config.devtool = "hidden-source-map";
  //     // Keep client output to one bundle per entry: no shared chunk extraction or runtime chunk.
  //     // config.optimization.splitChunks = false;
  //     // config.optimization.runtimeChunk = false;
  //     // Force deterministic filenames for both entry bundles and any (unexpected) chunks.
  //     // config.output.filename = "static/js/[name].js";
  //     // config.output.chunkFilename = "static/js/[name].js";
  //   }
  //   return config;
  // },
};

module.exports = nextConfig;
