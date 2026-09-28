/**
 * doj-news MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchPressReleases,
  getPressRelease,
  searchBlogEntries,
  getBlogEntry,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse, cleanHtml } from "../../shared/response.js";

function parseUnixDate(unixStr: string | undefined): string {
  if (!unixStr) return "?";
  try {
    const ts = parseInt(unixStr, 10);
    if (Number.isNaN(ts)) return unixStr;
    return new Date(ts * 1000).toISOString().slice(0, 10);
  } catch {
    return unixStr;
  }
}

export const tools: Tool<any, any>[] = [
  {
    name: "doj_press_releases",
    description:
      "Search DOJ press releases (262K+ records covering all DOJ divisions).\n" +
      "Includes enforcement actions, indictments, settlements, and policy announcements.\n" +
      "Filter by title keyword and sort by date.\n" +
      "Components: FBI, DEA, ATF, Civil Rights Division, Antitrust, USAO, and more.\n" +
      "Topics: Drug Trafficking, Cybercrime, National Security, Civil Rights, Financial Fraud, etc.",
    annotations: { title: "DOJ: Press Releases", readOnlyHint: true },
    parameters: z.object({
      title: z.string().optional().describe("Filter by title keyword: 'cybercrime', 'antitrust', 'fentanyl', 'civil rights'"),
      sort: z.enum(["date", "created"]).optional().describe("Sort by: 'date' (press release date), 'created' (when added)"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction: 'DESC' (newest first, default), 'ASC' (oldest first)"),
      pagesize: z.number().int().max(50).optional().describe("Results per page (default 20, max 50)"),
      page: z.number().int().optional().describe("Page number (zero-indexed). Use with pagesize for pagination."),
    }),
    execute: async (args) => {
      const data = await searchPressReleases({
        title: args.title,
        sort: args.sort ?? "date",
        direction: args.direction ?? "DESC",
        pagesize: args.pagesize ?? 20,
        page: args.page,
      });
      const total = data.metadata?.resultset?.count ?? "?";
      const results = data.results ?? [];
      if (!results.length) return emptyResponse("No press releases found.");

      return listResponse(
        `DOJ Press Releases: ${total} total, showing ${results.length} (page ${data.metadata?.resultset?.page ?? 0})`,
        {
          total: typeof total === "number" ? total : undefined,
          items: results.map(pr => ({
            title: pr.title,
            date: parseUnixDate(pr.date),
            components: pr.component?.map(c => c.name),
            url: pr.url,
          })),
        },
      );
    },
  },

  {
    name: "doj_press_release_detail",
    description:
      "Get the full text of a specific DOJ press release by UUID.\n" +
      "Returns the complete body, component, topic, date, and URL.",
    annotations: { title: "DOJ: Press Release Detail", readOnlyHint: true },
    parameters: z.object({
      uuid: z.string().describe("UUID of the press release (from search results)"),
    }),
    execute: async ({ uuid }) => {
      const data = await getPressRelease(uuid);
      const results = data.results ?? [];
      if (!results.length) return emptyResponse(`No press release found with UUID: ${uuid}`);
      const pr = results[0];
      const cleanBody = pr.body
        ? cleanHtml(pr.body)
        : null;
      return recordResponse(
        pr.title ?? "Untitled",
        {
          title: pr.title,
          date: parseUnixDate(pr.date),
          components: pr.component?.map(c => c.name),
          topics: Array.isArray(pr.topic) ? pr.topic.map(t => t.name) : typeof pr.topic === "string" ? [pr.topic] : undefined,
          url: pr.url,
          body: cleanBody,
        },
      );
    },
  },

  {
    name: "doj_blog_entries",
    description:
      "Search DOJ Office of Public Affairs blog entries (3,200+ records).\n" +
      "Blog entries often provide more context and analysis than press releases.\n" +
      "Covers policy discussions, division activities, and enforcement context.",
    annotations: { title: "DOJ: Blog Entries", readOnlyHint: true },
    parameters: z.object({
      sort: z.enum(["date", "created"]).optional().describe("Sort by"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction: 'DESC' (newest first), 'ASC'"),
      pagesize: z.number().int().max(50).optional().describe("Results per page (default 20, max 50)"),
      page: z.number().int().optional().describe("Page number (zero-indexed)"),
    }),
    execute: async (args) => {
      const data = await searchBlogEntries({
        sort: args.sort ?? "date",
        direction: args.direction ?? "DESC",
        pagesize: args.pagesize ?? 20,
        page: args.page,
      });
      const total = data.metadata?.resultset?.count ?? "?";
      const results = data.results ?? [];
      if (!results.length) return emptyResponse("No blog entries found.");

      return listResponse(
        `DOJ Blog Entries: ${total} total, showing ${results.length} (page ${data.metadata?.resultset?.page ?? 0})`,
        {
          total: typeof total === "number" ? total : undefined,
          items: results.map(blog => ({
            title: blog.title,
            date: parseUnixDate(blog.date),
            components: blog.component?.map(c => c.name),
            topic: blog.topic ? cleanHtml(blog.topic) : undefined,
            url: blog.url,
            teaser: blog.teaser ? cleanHtml(blog.teaser).slice(0, 300) : undefined,
          })),
        },
      );
    },
  },

  {
    name: "doj_blog_detail",
    description:
      "Get the full text of a specific DOJ blog entry by UUID.\n" +
      "Returns the complete body, component, topic, date, and URL.",
    annotations: { title: "DOJ: Blog Entry Detail", readOnlyHint: true },
    parameters: z.object({
      uuid: z.string().describe("UUID of the blog entry (from search results)"),
    }),
    execute: async ({ uuid }) => {
      const data = await getBlogEntry(uuid);
      const results = data.results ?? [];
      if (!results.length) return emptyResponse(`No blog entry found with UUID: ${uuid}`);
      const blog = results[0];
      const cleanBody = blog.body
        ? cleanHtml(blog.body)
        : null;
      return recordResponse(
        blog.title ?? "Untitled",
        {
          title: blog.title,
          date: parseUnixDate(blog.date),
          components: blog.component?.map(c => c.name),
          topic: blog.topic ? cleanHtml(blog.topic) : undefined,
          url: blog.url,
          body: cleanBody,
        },
      );
    },
  },
];
