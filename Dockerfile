FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist/ dist/
# Listening on 0.0.0.0 requires MCP_AUTH_TOKEN (clients send "Authorization: Bearer <token>").
ENV MCP_TRANSPORT=httpStream \
    MCP_HOST=0.0.0.0 \
    MCP_PORT=8080
# The base image's unprivileged "node" user (numeric, so runAsNonRoot checks can verify it);
# the response cache goes to /home/node/.cache.
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.MCP_PORT || 8080) + '/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
ENTRYPOINT ["node", "dist/server.js"]
