# Agent Instructions — Portfolio Site

## Build Commands

```bash
# Local build/preview
myst build --html    # creates _build/html/
myst start           # serves on localhost

# CI automatically runs on push to main or PRs
# Uses GitHub Actions → deploys to GitHub Pages
```

**Build requires:**
- Node.js 18+ (for MyST CLI)
- Python 3.11+ (`pip install -r requirements.txt`)

## Critical Files

- `_toc.yml` — navigation structure; defines all pages shown in sidebar
- `myst.yml` — site config (title, logo, theme options)
- `intro.md` — landing page (root in _toc.yml)
- `references.bib` — bibliography for publications

## Adding Project Pages

1. Create directory: `projects/project-name/`
2. Add markdown file: `projects/project-name/project-name.md`
3. **Add to `_toc.yml`** under Projects caption:
   ```yaml
   - file: projects/project-name/project-name
   ```
4. Images go in `projects/project-name/images/`

**Common mistake:** Forgetting to add new pages to `_toc.yml` — they won't appear in navigation.

## MyST Syntax Quirks

**Use grids, not panels** (panels deprecated):
```markdown
::::{grid} 3

:::{grid-item-card} Title
Content here
:::

::::
```

**Image syntax:**
```markdown
```{image} images/file.png
:alt: Description
:width: 100%
:align: center
```
```

**Remove these deprecated options** (cause warnings):
- `:gutter:` in grids
- `:link-type:` in cards

## Git LFS

PDFs tracked via LFS (`.gitattributes`). If pushing fails with "git-lfs not found":
```bash
git lfs install
git push
```

## Content Guidelines

**Never invent personal details:**
- No biographical filler ("passionate developer...")
- No assumed career history or education
- Stick to documented projects and technical facts
- If personal content needed, ask user for specific info

**Prefer concise technical content:**
- Direct statements over marketing language
- Specific tech details over generic features
- Real implementation notes over tutorials

## Deployment

Push to `main` → GitHub Actions builds → deploys to GitHub Pages automatically.

**Live site:** https://omedeiro.github.io

CI runs `myst build --html` and checks for `_build/html/index.html`. Build artifact uploaded to GitHub Pages.

Builds also run on PRs to verify changes before merge.
