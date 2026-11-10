#!/usr/bin/env bash
# Installs the packed packages into a new npm project, the way a user gets them from the registry,
# then type-checks a consumer against their published types with skipLibCheck off, compiles it,
# and runs it with each Node: an ES import with a server parse and a server render with each
# adapter, and a CommonJS require() of each package.
#
# Usage: consumer-smoke/run.sh min|latest [node...]
#   min     the lowest TypeScript and peers the packages support
#   latest  the latest of each
#   node    the Node binaries to run the consumer with, node on the PATH by default
set -euo pipefail

mode=${1:-}
nodes=("${@:2}")
[ ${#nodes[@]} -gt 0 ] || nodes=(node)

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

case "$mode" in
  min)
    peers=(
      typescript@5.3.3
      valibot@1.4.1
      @valibot/to-json-schema@1.6.0
      vue@3.5.2
      @formisch/vue@1.1.1
      react@18.0.0
      react-dom@18.0.0
      @types/react@18
      @types/react-dom@18
      @types/node@20
      @formisch/react@1.2.0
    )
    ;;
  latest)
    peers=(
      typescript@latest
      valibot@latest
      @valibot/to-json-schema@latest
      vue@latest
      @formisch/vue@latest
      react@latest
      react-dom@latest
      @types/react@latest
      @types/react-dom@latest
      @types/node@latest
      @formisch/react@latest
    )
    ;;
  *)
    echo "Usage: $0 min|latest" >&2
    exit 2
    ;;
esac

for package in packages/schema packages/affects frameworks/vue frameworks/react; do
  pnpm --dir "$root/$package" pack --pack-destination "$work/packs"
done

mkdir "$work/app"
cp "$root"/consumer-smoke/*.ts "$root"/consumer-smoke/*.cjs "$root"/consumer-smoke/tsconfig.json "$work/app"
cd "$work/app"
npm init --yes > /dev/null
npm pkg set type=module
npm install --no-audit --no-fund "$work"/packs/*.tgz "${peers[@]}"
npm ls --depth=0

npx tsc --version
npx tsc -p .
for node in "${nodes[@]}"; do
  "$node" --version
  "$node" out/react.js
  "$node" out/vue.js
  "$node" require.cjs
done
