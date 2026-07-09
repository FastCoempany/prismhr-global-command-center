// The one switch for the temporarily-public site. Both auth layers read it:
// getAppAccess() (page-level) and the edge access-proxy (which guards "/").
// Keeping it in this dependency-free module means the edge middleware can
// import it safely, and re-locking the site is a single flip back to false.
export const PUBLIC_ACCESS = true;
