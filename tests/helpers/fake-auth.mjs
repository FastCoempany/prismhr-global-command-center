// What src/lib/auth.ts hands a signed-in operator, for a page rendered under
// node:test (tests/helpers/page-render.ts). The real module reads the
// request's cookies, which no request supplies here; the page under test is
// the face, not the gate, and every page's gate is pinned by
// tests/canon/standing-decrees.test.ts ("every page signs in").
const ACTIVE = {
    appUser: { email: "operator@example.com", role: "owner" },
    authEmail: "operator@example.com",
    canRead: true,
    canWrite: true,
    message: "",
    status: "active",
};
/** The access the next render sees: a page sets globalThis.__fakeAccess to
 *  read the gate shut (the login page), and the default is signed in. */
export async function getAppAccess() {
  return globalThis.__fakeAccess ?? ACTIVE;
}
export function isValidAccessCode() {
  return false;
}
export async function setAccessSession() {}
