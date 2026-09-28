# Releasing

Versions are CalVer `YYYY.M.D` (UTC date). A release takes two workflows.

1. **Prepare Release**: in Actions, select Prepare Release, then Run workflow on `main`. The workflow:
   - picks the version with [`scripts/release-version.mjs`](../scripts/release-version.mjs)
   - bumps `package.json` and `server.json` (the MCP Registry listing), then builds and tests
   - commits `release: vX` and pushes the commit together with the annotated tag `vX`. The push is atomic and
     never forced, so it fails if `main` moved during the run.
   - creates a draft GitHub release with generated notes
2. **Publish**: review the draft and publish it. That runs [`publish.yml`](workflows/publish.yml), which builds and
   tests the tag once without credentials, and validates `server.json`. It then publishes that same tarball to npm
   (trusted publishing, with provenance) and to GitHub Packages as `@lzinga/us-gov-open-data-mcp`, and lists the
   version in the [MCP Registry](https://registry.modelcontextprotocol.io) as
   `io.github.lzinga/us-gov-open-data-mcp`. The registry login uses GitHub OIDC, so it needs no secret.

## Version rules

- By default the version is today's UTC date, for example `2026.9.28`.
- A second release on the same day fails instead of getting a `-2` suffix. `2026.9.28-2` would be a SemVer
  prerelease, which sorts *before* `2026.9.28`, so npm and version ranges would treat it as older. Run the
  workflow again with an explicit version; the error message names the version it must exceed.
- An explicit version must be a plain `X.Y.Z` that is newer than every version on npm and every git tag.

## One-time setup (repository owner)

1. **npm trusted publisher**: on npmjs.com, open the package's Settings, then Trusted publishing, and add a
   GitHub Actions publisher with these values:
   - owner: `lzinga`
   - repository: `us-gov-open-data-mcp`
   - workflow filename: `publish.yml`
   - environment: `npm` (optional)
2. Publish one release and check that npmjs.com shows the provenance badge. Then:
   - set Publishing access to "Require two-factor authentication and disallow tokens"
   - revoke the old automation token
   - delete the unused `NPM_TOKEN` repository secret
3. Optional:
   - add required reviewers to the `npm` environment (Settings, then Environments)
   - enable immutable releases, so that published tags and assets can't change

The MCP Registry needs no setup: the first release that includes `server.json` creates the listing. Check it at
https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.lzinga/us-gov-open-data-mcp.

## Troubleshooting

- **`E404 Not Found - PUT https://registry.npmjs.org/us-gov-open-data-mcp`**: npm rejected the credentials.
  Under trusted publishing, this means the publisher settings on npmjs.com don't exactly match the repository,
  the `publish.yml` filename, or the environment. This error is also how `v2026.9.14` failed under the old
  `NPM_TOKEN` setup.
- **Re-running a failed publish** uses the workflow file from the release tag's commit. Tags created before
  trusted publishing still use `NPM_TOKEN`, so cut a new release instead.
- **"Version … already exists"**: see [version rules](#version-rules).
- **MCP Registry "Package validation failed"**: the registry reads `mcpName` from the published npm package. It
  must equal the `name` in `server.json`; the publish job retries in case npm hasn't served the new version yet.
- **MCP Registry "invalid audience"**: `mcp-publisher` is too old for the registry. Update the version and
  checksum in [`scripts/install-mcp-publisher.sh`](../scripts/install-mcp-publisher.sh).
