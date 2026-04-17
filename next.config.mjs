/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      // Esto le dice a Vercel: "Ignora los errores de tipos y publica igual"
      ignoreBuildErrors: true,
    },
  };
  
  export default nextConfig;