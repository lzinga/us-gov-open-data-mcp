#!/usr/bin/env bash
# Install mcp-publisher, the MCP Registry CLI, into the current directory,
# pinned and checked against its published SHA-256.
#
# To update: pick a release at https://github.com/modelcontextprotocol/registry/releases
# and copy the mcp-publisher_linux_amd64.tar.gz line from registry_<version>_checksums.txt.
set -euo pipefail

VERSION=1.8.1
SHA256=a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc

curl -fsSL -o mcp-publisher.tar.gz \
  "https://github.com/modelcontextprotocol/registry/releases/download/v${VERSION}/mcp-publisher_linux_amd64.tar.gz"
echo "${SHA256}  mcp-publisher.tar.gz" | sha256sum -c -
tar -xzf mcp-publisher.tar.gz mcp-publisher
rm mcp-publisher.tar.gz
./mcp-publisher --version
