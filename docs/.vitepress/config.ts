import { defineConfig } from "vitepress";
import typedocSidebar from "../api/typedoc-sidebar.json";
import { toolsSidebar, dsSidebar } from "../generated-sidebar.json";

export default defineConfig({
  title: "US Government Open Data MCP",
  description:
    "MCP server + TypeScript SDK for 40+ U.S. government APIs",
  base: "/us-gov-open-data-mcp/",

  head: [
    [
      "meta",
      {
        name: "keywords",
        content:
          "MCP, government data, TypeScript SDK, FRED, Treasury, Congress, CDC, FDA",
      },
    ],
  ],

  cleanUrls: true,

  // Show h2 + h3 in the "On this page" outline
  markdown: {
    headers: { level: [2, 3] },
  },

  themeConfig: {
    outline: [2, 3],
    logo: undefined,
    siteTitle: "US Gov Open Data MCP",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/api/" },
      {
        text: "Links",
        items: [
          {
            text: "npm",
            link: "https://www.npmjs.com/package/us-gov-open-data-mcp",
          },
          {
            text: "GitHub",
            link: "https://github.com/lzinga/us-gov-open-data-mcp",
          },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Quick Start", link: "/guide/getting-started" },
            { text: "API Keys", link: "/guide/api-keys" },
            {
              text: "Data Sources",
              link: "/guide/data-sources",
              collapsed: true,
              items: dsSidebar,
            },
            {
              text: "All Tools",
              link: "/guide/tools",
              collapsed: true,
              items: toolsSidebar,
            },
          ],
        },
        {
          text: "Examples",
          items: [
            { text: "MCP Usage", link: "/guide/mcp-usage" },
            { text: "SDK Usage", link: "/guide/sdk-usage" },
          ],
        },
        {
          text: "Showcases",
          collapsed: true,
          items: [
            {
              text: "Worst-Case Impact",
              link: "/guide/worst-case-analysis",
            },
            {
              text: "Best-Case Impact",
              link: "/guide/best-case-analysis",
            },
            {
              text: "Presidential Scorecard",
              link: "/guide/presidential-economic-scorecard",
            },
            {
              text: "Deficit Reduction",
              link: "/guide/deficit-reduction-comparison",
            },
          ],
        },
        {
          text: "Developer Guide",
          items: [
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Adding Modules", link: "/guide/adding-modules" },
          ],
        },
      ],
      "/api/": [
        {
          text: "SDK API Reference",
          items: [{ text: "Overview", link: "/api/" }],
        },
        ...typedocSidebar,
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/lzinga/us-gov-open-data-mcp",
      },
      {
        icon: "npm",
        link: "https://www.npmjs.com/package/us-gov-open-data-mcp",
      },
    ],

    search: {
      provider: "local",
    },

    editLink: {
      pattern:
        "https://github.com/lzinga/us-gov-open-data-mcp/edit/main/docs/:path",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Data sourced from official U.S. government APIs.",
    },
  },
});
