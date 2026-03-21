#!/usr/bin/env sh
set -eu

if command -v make >/dev/null 2>&1; then
	echo "[pre-commit] Running make format..."
	make format
else
	echo "[pre-commit] 'make' not found. Running formatter fallback..."

	if command -v uvx >/dev/null 2>&1; then
		uvx black .
	elif command -v black >/dev/null 2>&1; then
		black .
	else
		echo "[pre-commit] ERROR: neither 'uvx' nor 'black' is available."
		exit 1
	fi

	if command -v pnpm >/dev/null 2>&1; then
		pnpm dlx prettier --write .
	else
		echo "[pre-commit] pnpm not found; skipping Prettier format"
	fi
fi

echo "[pre-commit] Restaging tracked formatting changes..."
git add -u

echo "[pre-commit] format complete."
