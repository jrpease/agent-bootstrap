#!/usr/bin/env bash
# desc: Install the official Blender MCP server and its Blender add-on
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

# Pinned on purpose: the server runs agent-written Python inside Blender, so an
# update is a deliberate bump of this tag, never whatever main has that day. The
# add-on is built from the same checkout so the two can't drift apart.
tag="v1.0.3"
repo="https://projects.blender.org/lab/blender_mcp.git"
clone="$HOME/.local/share/blender_mcp"
app="/Applications/Blender.app"
blender="$app/Contents/MacOS/Blender"   # `blender` is not on PATH

log "Installing the Blender MCP server ($tag)"
if [[ ! -d "$app" ]]; then skip "Blender not installed — nothing to do"; exit 0; fi
if ! have_cmd uv; then err "uv missing — run ./setup.sh deps first"; exit 1; fi

# Clone, or converge an existing clone onto the pinned tag.
if [[ ! -d "$clone/.git" ]]; then
  mkdir -p "$(dirname "$clone")"
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$tag" "$repo" "$clone"
  ok "cloned $tag -> $clone"
elif [[ "$(git -C "$clone" describe --tags --exact-match 2>/dev/null)" == "$tag" ]]; then
  skip "clone already at $tag"
else
  git -C "$clone" fetch --quiet --depth 1 origin tag "$tag"
  git -C "$clone" -c advice.detachedHead=false checkout --quiet "$tag"
  ok "moved clone to $tag"
fi

# Install the server's Python deps now, so the first MCP start isn't a cold
# install racing the client's startup timeout.
uv --directory "$clone/mcp" sync --quiet || { err "uv sync failed — the server would cold-install on first start"; exit 1; }
ok "server deps synced"

chmod +x "$DOTFILES/tools/blender-mcp/blender-mcp"
symlink "$DOTFILES/tools/blender-mcp/blender-mcp" "$HOME/.local/bin/blender-mcp"

# The add-on lands in the user repo of this Blender's major.minor.
version="$(defaults read "$app/Contents/Info.plist" CFBundleShortVersionString)"
manifest="$HOME/Library/Application Support/Blender/${version%.*}/extensions/user_default/mcp/blender_manifest.toml"
want="${tag#v}"
if [[ -f "$manifest" ]] && grep -q "^version = \"$want\"" "$manifest"; then
  skip "Blender add-on already at $want"
else
  out="$(mktemp -d)"
  "$blender" --command extension build --source-dir "$clone/addon/blender_mcp_addon" \
    --output-dir "$out" >/dev/null || { err "add-on build failed"; exit 1; }
  "$blender" --command extension install-file -r user_default -e "$out/mcp-$want.zip" >/dev/null \
    || { err "add-on install failed"; exit 1; }
  rm -rf "$out"
  ok "installed and enabled the Blender add-on ($want)"
  if pgrep -qx Blender; then
    warn "Blender is running — quit and reopen it to load the add-on"
    info "If the server still isn't up after reopening, run ./setup.sh blender again."
  fi
fi
# The add-on refuses to start its server unless Blender's "Allow Online Access"
# preference is on, and a fresh install ships with it off.
online="$("$blender" -b --python-expr \
  "import bpy; print('ONLINE=' + str(bpy.context.preferences.system.use_online_access))" \
  | sed -n 's/^ONLINE=//p')" || { err "could not read Blender preferences"; exit 1; }
if [[ "$online" == "True" ]]; then
  skip "Blender online access already on"
else
  "$blender" -b --python-expr \
    "import bpy; bpy.context.preferences.system.use_online_access = True; bpy.ops.wm.save_userpref()" \
    >/dev/null || { err "could not save Blender preferences"; exit 1; }
  ok "turned on Blender's Allow Online Access (the add-on needs it to start)"
  if pgrep -qx Blender; then
    warn "Blender is running — quit and reopen it so the add-on's server starts"
    info "If the server still isn't up after reopening, run ./setup.sh blender again."
  fi
fi
info "The add-on autostarts its server on localhost:9876 whenever Blender is open."
