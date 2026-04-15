/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // Esto le dice a Vercel: "Publicá la página igual, no frenes por errores de ESLint"
      ignoreDuringBuilds: true,
    },
  };
  
  export default nextConfig;