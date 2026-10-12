const configuredOrigin = import.meta.env.VITE_ATLAS_API_ORIGIN?.trim().replace(/\/+$/, "");

/**
 * Local development stays same-origin through Vite's proxy. In a hosted
 * dashboard this points at the separately deployed Atlas API. It is a public
 * URL only — credentials remain in the API host's encrypted environment.
 */
export function atlasApi(path) {
  if (!path.startsWith("/")) throw new Error("Atlas API paths must start with '/'.");
  return configuredOrigin ? `${configuredOrigin}${path}` : path;
}

export const atlasApiOrigin = configuredOrigin ?? "same-origin";
