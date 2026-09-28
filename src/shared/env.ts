/**
 * Reading optional configuration from the environment.
 *
 * .env.example ships placeholder values (your_email@example.com, …). Someone
 * who copies it without editing those lines should get the unset behavior,
 * not requests that claim to come from a placeholder contact.
 */

/**
 * True for values that are empty or still a placeholder: anything with a
 * "your_"/"your-" token or an example.com/.org/.net address (reserved by
 * RFC 2606, so never a real contact).
 */
export function isPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "" || /\byour[-_]/.test(v) || /(^|[@./\s(])example\.(com|org|net)\b/.test(v);
}

/** The trimmed value of an environment variable, or undefined when it is unset or a placeholder. */
export function configuredEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[name]?.trim();
  return value && !isPlaceholder(value) ? value : undefined;
}
