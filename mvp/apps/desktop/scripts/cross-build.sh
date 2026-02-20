#!/bin/bash
# =============================================================================
# Cross-compile Tauri desktop app for Windows (from Linux)
# =============================================================================
# Usage:
#   ./scripts/cross-build.sh           # Build for Windows
#   ./scripts/cross-build.sh linux     # Build for Linux
#   ./scripts/cross-build.sh both      # Build for both
#
# After building, the binary is at:
#   Windows: src-tauri/target/x86_64-pc-windows-msvc/release/uiux-standard-desktop.exe
#   Linux:   src-tauri/target/release/uiux-standard-desktop
#
# To download the Windows binary to your laptop:
#   scp devops:~/projects/best-ui-ux-standard/mvp/apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/uiux-standard-desktop.exe .
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAURI_DIR="$SCRIPT_DIR/../src-tauri"
TARGET="${1:-windows}"

# Ensure Rust is available
source "$HOME/.cargo/env" 2>/dev/null || true

cd "$TAURI_DIR"

build_windows() {
    echo "=== Building for Windows (x86_64-pc-windows-msvc) ==="
    echo "This uses cargo-xwin for cross-compilation..."
    cargo xwin build --release --target x86_64-pc-windows-msvc
    
    local EXE="target/x86_64-pc-windows-msvc/release/uiux-standard-desktop.exe"
    if [ -f "$EXE" ]; then
        local SIZE=$(du -sh "$EXE" | cut -f1)
        echo ""
        echo "=== SUCCESS ==="
        echo "Binary: $TAURI_DIR/$EXE ($SIZE)"
        echo ""
        echo "Download to your laptop with:"
        echo "  scp devops:$TAURI_DIR/$EXE ."
    else
        echo "ERROR: Binary not found at $EXE"
        exit 1
    fi
}

build_linux() {
    echo "=== Building for Linux (native) ==="
    cargo build --release
    
    local BIN="target/release/uiux-standard-desktop"
    if [ -f "$BIN" ]; then
        local SIZE=$(du -sh "$BIN" | cut -f1)
        echo ""
        echo "=== SUCCESS ==="
        echo "Binary: $TAURI_DIR/$BIN ($SIZE)"
    else
        echo "ERROR: Binary not found at $BIN"
        exit 1
    fi
}

case "$TARGET" in
    windows|win|w)
        build_windows
        ;;
    linux|lin|l)
        build_linux
        ;;
    both|all|a)
        build_linux
        echo ""
        build_windows
        ;;
    *)
        echo "Usage: $0 [windows|linux|both]"
        exit 1
        ;;
esac
