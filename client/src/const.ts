export const getHashRouteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = import.meta.env.BASE_URL || "/";
  return `${base}#${normalizedPath}`;
};

export const getLoginUrl = () => getHashRouteUrl("/auth");
