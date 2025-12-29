# Copilot Instructions for MyST Technical Profile Site

## Architecture Overview

This is a **MyST Markdown-based technical profile site** built for academic/research professionals, deployed via GitHub Actions to GitHub Pages. Key components:

- **MyST Build System**: Uses `myst.yml` config with book-theme template
- **Jupyter Book Structure**: `_toc.yml` defines navigation hierarchy
- **Academic Focus**: Bibliography support with `references.bib` and citations
- **GitHub Actions**: Automated deployment with Node.js + Python build pipeline

## Critical File Structure

```
├── myst.yml              # Main MyST configuration - project metadata, site options
├── _toc.yml              # Navigation structure - defines page hierarchy
├── intro.md              # Landing page (root in _toc.yml)
├── publications.md       # Academic publications with bibliography
├── references.bib        # BibTeX bibliography database
├── projects/             # Project showcase directories
│   ├── budget-dashboard/
│   ├── activityAnalysis/ 
│   └── */index.md        # Each project has index.md entry point
├── _static/custom.css    # Custom styling overrides
└── .github/workflows/deploy.yml  # Build and deployment automation
```

## Development Workflow

### Building Locally
```bash
# Install MyST CLI globally
npm install -g mystmd

# Build site (creates _build/html/)
myst build --html

# Serve locally
myst start
```

### Key Build Dependencies
- **Node.js 18+**: MyST CLI and build system
- **Python 3.11+**: Bibliography processing, extensions
- **requirements.txt**: Python packages for MyST extensions

## MyST-Specific Patterns

### Configuration Structure
- **myst.yml**: Single source of truth - project metadata goes in `project:`, site options in `site:`
- **No duplicate keys**: YAML validation is strict - watch for duplicate `project:` sections
- **Bibliography setup**: `bibliography: references.bib` in project section, not site options

### Content Conventions
- **Grid layouts**: Use `::::{grid} N` with `:::{grid-item-card}` - NOT deprecated `{panels}`
- **Remove deprecated options**: `:gutter:`, `:link-type:` cause warnings
- **Bibliography display**: Use `{bibliography}` directive - `:all:` option doesn't work reliably
- **Image references**: Relative paths from markdown file location

### Project Structure Pattern
Each project in `projects/*/` follows this structure:
- `index.md` - Main project page (linked in `_toc.yml`)
- `README.md` - GitHub repository documentation
- `images/` - Project-specific assets

## Personal Information and Content Accuracy
- **NEVER** invent or assume personal details, biography, or background information
- **DO NOT** add filler text about education, experience, or personal history
- Only use information explicitly provided or already present in existing files
- When editing intro.md or about.md, preserve existing content exactly unless specifically asked to change it
- Avoid adding generic biographical statements like "passionate about technology" or career summaries
- If personal content is needed, ask the user to provide specific information rather than creating placeholder text
- Focus on technical work and projects that are actually documented in the repository

## Specific Syntax Corrections

### Replace This:
```markdown
```{panels}
Title
^^^
Content

---

Title 2
^^^
Content 2
```

### With This:
```markdown
::::{grid} 2

:::{grid-item-card} Title
Content
:::

:::{grid-item-card} Title 2
Content 2
:::

::::
```

### Avoid These Patterns:
- "This project demonstrates..."
- "Key features include..."
- "The tool provides..."
- "Users can easily..."
- Excessive use of emojis
- Long installation/setup sections
- Generic "future enhancements" lists
- **Personal biographical filler** like "passionate developer with X years experience"
- **Assumed career details** or educational background
- **Generic personal statements** that aren't factually verified

### Preferred Patterns:
- Direct technical statements
- Specific technology mentions
- Actual implementation details
- Real use cases or results
- Minimal but informative descriptions

## GitHub Actions & Deployment

### Keep Workflows Simple:
- Use latest action versions
- Include only necessary build steps
- Add proper error handling
- Use caching where beneficial
- Avoid redundant verification steps

### Configuration Files:
- Include only used options
- Remove placeholder comments
- Use environment-specific settings
- Keep dependencies minimal and up-to-date

## When Adding Content:
1. Ask: "Is this information essential?"
2. Can this be expressed more concisely?
3. Does this add technical value or just fill space?
4. Is this specific to the project or generic advice?
5. **Is this personal information factually accurate and verifiable?**
6. **Am I inventing biographical details that weren't provided?**

Focus on substance over style, technical accuracy over marketing appeal.
