import type { NextConfig } from "next";

/**
 * Versión publicada: el commit que Vercel desplegó (local: "dev"). Queda fija
 * en el JavaScript de cada build (NEXT_PUBLIC_VERSION) y /api/version devuelve
 * la del build publicado, así la app instalada en el inicio del celular sabe
 * cuándo hay una versión nueva. No se fija `deploymentId`: Vercel pone el suyo
 * (NEXT_DEPLOYMENT_ID) y Next aborta el build si no coinciden (error E971).
 */
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSION: VERSION },
};

export default nextConfig;
