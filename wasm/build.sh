#!/usr/bin/env bash
# Compiles 3rdPartyLib/exprtk into the WebAssembly module the app evaluates with.
# Requires the Emscripten SDK; point EMSDK at it if em++ is not already on PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v em++ >/dev/null 2>&1; then
  EMPP="em++"
else
  # emsdk_env.sh needs a `python` on PATH, which Windows installs often lack, so
  # point at the SDK directly instead of sourcing it.
  EMSDK="${EMSDK:-/c/emsdk}"
  EMPP=""

  for candidate in "$EMSDK/upstream/emscripten/em++.exe" "$EMSDK/upstream/emscripten/em++"; do
    if [ -x "$candidate" ]; then
      EMPP="$candidate"
      break
    fi
  done

  if [ -z "$EMPP" ]; then
    echo "em++ not found and no Emscripten SDK at $EMSDK -- see README." >&2
    exit 1
  fi

  export EMSDK
  export EM_CONFIG="${EM_CONFIG:-$EMSDK/.emscripten}"

  # The launcher shells out to Python and Node; without these it falls back to
  # whatever is on PATH, which on Windows is often the Microsoft Store stub.
  if [ -z "${EMSDK_PYTHON:-}" ]; then
    for candidate in "$EMSDK"/python/*/python.exe "$EMSDK"/python/*/bin/python3; do
      [ -x "$candidate" ] && export EMSDK_PYTHON="$candidate" && break
    done
  fi

  if [ -z "${EMSDK_NODE:-}" ]; then
    for candidate in "$EMSDK"/node/*/bin/node.exe "$EMSDK"/node/*/node.exe "$EMSDK"/node/*/bin/node; do
      [ -x "$candidate" ] && export EMSDK_NODE="$candidate" && break
    done
  fi
fi

if [ ! -f "$ROOT/3rdPartyLib/exprtk/exprtk.hpp" ]; then
  echo "3rdPartyLib/exprtk is empty -- run: git submodule update --init --recursive" >&2
  exit 1
fi

OUT="$ROOT/public/wasm"
mkdir -p "$OUT"

echo "Building exprtk -> $OUT/exprtk.mjs"

"$EMPP" "$ROOT/wasm/exprtk_bridge.cpp" \
  -o "$OUT/exprtk.mjs" \
  -std=c++17 \
  -O3 \
  -I "$ROOT/3rdPartyLib/exprtk" \
  -DNDEBUG \
  -Dexprtk_disable_rtl_io \
  -Dexprtk_disable_rtl_io_file \
  -Dexprtk_disable_string_capabilities \
  -Dexprtk_disable_enhanced_features \
  -fexceptions \
  --bind \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=createExprtkModule \
  -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=16MB \
  -sFILESYSTEM=0 \
  -sDYNAMIC_EXECUTION=0

for artifact in "$OUT/exprtk.mjs" "$OUT/exprtk.wasm"; do
  if [ ! -s "$artifact" ]; then
    echo "build failed: $artifact was not produced" >&2
    exit 1
  fi
done

ls -la "$OUT"
