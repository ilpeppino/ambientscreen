> Status: Non-canonical
> Type: Archive
> Authority: Not the primary source of truth when a canonical doc exists

# Node Version Policy

## Canonical Version

**Node.js 22 (LTS)**

All environments — local development, CI pipelines, and NAS runtime — MUST use Node.js 22.x.

The exact version is pinned in `.nvmrc` at the project root.

---

## Enforcement

### Local development

Use [nvm](https://github.com/nvm-sh/nvm) (or [fnm](https://github.com/Schniz/fnm)) to switch to the correct version automatically:

```bash
nvm use        # reads .nvmrc and activates Node 22
```

Add this to your shell profile to auto-switch on `cd`:

```bash
# .zshrc / .bashrc
autoload -U add-zsh-hook
load-nvmrc() {
  local nvmrc_path
  nvmrc_path="$(nvm_find_nvmrc)"
  if [ -n "$nvmrc_path" ]; then
    nvm use
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### CI (GitHub Actions)

All workflows use:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
```

This reads `.nvmrc` directly — no version is hardcoded in workflow files.

### NAS runtime

Install Node 22 on the Synology NAS via the official package manager or nvm:

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

Verify the active version before starting the service:

```bash
node --version   # must print v22.x.x
```

---

## engines field

The API package enforces the version at install time:

```json
"engines": {
  "node": ">=22.0.0 <23.0.0"
}
```

npm will warn (or error with `engine-strict=true`) if the active Node version falls outside this range.

---

## Upgrade policy

- Follow Node.js LTS releases.
- Upgrade the major version when the current LTS enters maintenance mode.
- Update `.nvmrc` and `engines` together in a single PR.
- Never run production on an odd-numbered (non-LTS) Node release.
