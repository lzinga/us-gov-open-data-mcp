/**
 * Shared URL helpers.
 */

/**
 * True when `url`'s hostname is exactly `domain` or a subdomain of it.
 * Avoids substring/suffix checks like `hostname.endsWith("senate.gov")`,
 * which also match look-alikes such as `evilsenate.gov`.
 * Returns false for missing or unparseable URLs.
 */
export function isHostOrSubdomain(url: string | URL | null | undefined, domain: string): boolean {
  if (!url) return false;
  let hostname: string;
  try {
    hostname = (url instanceof URL ? url : new URL(url)).hostname.toLowerCase();
  } catch {
    return false;
  }
  const target = domain.toLowerCase().replace(/^\.+/, "");
  return hostname === target || hostname.endsWith(`.${target}`);
}
