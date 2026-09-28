## Description

<!-- What does this PR do? Link to related issue(s) if applicable: Fixes #123 -->

## Type of Change

- [ ] New API module
- [ ] New tool for existing module
- [ ] Bug fix
- [ ] Refactor / improvement
- [ ] Documentation

## New Module Checklist

<!-- If adding a new API module, verify all items. Otherwise delete this section. -->

- [ ] Created `src/apis/{name}/sdk.ts` with typed client and exported functions
- [ ] Created `src/apis/{name}/meta.ts` with `name`, `displayName`, `description`, `auth?`, `workflow?`, `tips?`, `reference?`
- [ ] Created `src/apis/{name}/tools.ts` with tool definitions using standardized response helpers (`timeseriesResponse`, `tableResponse`, `recordResponse`, `listResponse`, `emptyResponse`)
- [ ] Created `src/apis/{name}/index.ts` re-exporting meta, tools, and `clearCache`
- [ ] Tools use descriptive `.describe()` on all Zod parameters
- [ ] `npm run build` passes with no errors
- [ ] `npm run test` passes
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] Tested tool output manually via MCP client or SDK import

## New Tool Checklist

<!-- If adding a tool to an existing module, verify these. Otherwise delete this section. -->

- [ ] Added SDK function in `sdk.ts`
- [ ] Added tool definition in `tools.ts`
- [ ] Tool returns a standardized response type (`timeseriesResponse`, `tableResponse`, `recordResponse`, `listResponse`, or `emptyResponse`)
- [ ] `npm run build` passes with no errors
- [ ] `npm run test` passes
- [ ] `npm run typecheck` and `npm run lint` pass

## Additional Notes

<!-- Anything else reviewers should know: rate limits, auth quirks, data format oddities, etc. -->
