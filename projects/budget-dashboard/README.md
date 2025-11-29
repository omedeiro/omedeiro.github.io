# Budget Dashboard Documentation

This directory contains comprehensive documentation for the Personal Finance Dashboard tool.

## Documentation Structure

- **[index.md](index.md)** - Main landing page with overview and quick start
- **[getting-started.md](getting-started.md)** - Step-by-step setup and first analysis guide
- **[data-import.md](data-import.md)** - Complete guide for importing financial data from banks
- **[analysis-features.md](analysis-features.md)** - Overview of all analysis capabilities
- **[customization.md](customization.md)** - How to customize categories and analysis
- **[api-reference.md](api-reference.md)** - Technical API documentation for developers

## Assets

- **images/** - Sample charts and visualizations (anonymized data)
- **examples/** - Code examples and sample configurations
- **generate_sample_assets.py** - Script to generate documentation assets

## GitHub Pages Setup

This documentation is designed for GitHub Pages with Jekyll. To set up:

1. **Enable GitHub Pages** in your repository settings
2. **Set source** to "Deploy from a branch" → "docs" folder
3. **Choose theme** (optional) - currently configured for Minima theme
4. **Custom domain** (optional) - configure in repository settings

### Local Development

To preview locally:

```bash
# Install Jekyll (if needed)
gem install bundler jekyll

# Navigate to docs directory
cd docs

# Create Gemfile if it doesn't exist
echo "source 'https://rubygems.org'" > Gemfile
echo "gem 'github-pages', group: :jekyll_plugins" >> Gemfile
echo "gem 'webrick'" >> Gemfile

# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve
```

Visit http://localhost:4000 to preview the documentation.

## Generating Sample Assets

The documentation includes sample charts and visualizations created with anonymized data:

```bash
# Generate all sample assets
python generate_sample_assets.py
```

This creates:
- Sample charts in `images/` directory
- Interactive dashboard preview
- Realistic but anonymized financial data

## Content Guidelines

### Writing Style
- Use clear, concise language
- Include practical examples
- Provide both basic and advanced usage
- Keep security and privacy in mind

### Code Examples
- Always use realistic but anonymized data
- Include error handling where appropriate
- Explain the purpose of each code block
- Provide complete, runnable examples

### Screenshots and Charts
- Use the generated sample data only
- No real financial information should be shown
- Ensure images are high quality (300 DPI for PNGs)
- Include descriptive alt text for accessibility

## File Organization

```
docs/
├── index.md                     # Main landing page
├── getting-started.md           # Setup guide
├── data-import.md              # Data import documentation
├── analysis-features.md        # Analysis capabilities
├── customization.md            # Customization guide
├── api-reference.md            # API documentation
├── _config.yml                 # Jekyll configuration
├── README.md                   # This file
├── generate_sample_assets.py   # Asset generation script
├── images/                     # Sample visualizations
│   ├── dashboard-overview.png
│   ├── monthly-trends.png
│   ├── category-breakdown.png
│   └── ...
└── examples/                   # Code examples
    ├── custom_analysis.py
    ├── advanced_configuration.py
    └── integration_examples.py
```

## Contributing

When updating documentation:

1. **Test locally** - Use Jekyll to preview changes
2. **Update assets** - Re-generate sample assets if code changes
3. **Check links** - Ensure all internal links work
4. **Maintain consistency** - Follow existing style and structure
5. **Review privacy** - Ensure no real financial data is included

## Deployment

Documentation automatically deploys to GitHub Pages when changes are pushed to the `docs/` directory in the main branch.

**Live URL**: https://omedeiro.github.io/budget-dashboard (update with your actual username)

## Advanced Features

### Custom Layouts

Create custom Jekyll layouts in `_layouts/` for specialized pages:

```html
<!-- _layouts/feature.html -->
---
layout: default
---
<div class="feature-page">
  <h1>{{ page.title }}</h1>
  {{ content }}
</div>
```

### Navigation Customization

Modify `_config.yml` to customize navigation:

```yaml
header_pages:
  - getting-started.md
  - data-import.md
  - analysis-features.md
  - customization.md
  - api-reference.md
```

### SEO Optimization

Each page should include front matter for SEO:

```yaml
---
title: "Page Title"
description: "Page description for search engines"
keywords: "budget, finance, analysis, python"
---
```

This documentation structure provides a professional, comprehensive guide for users while maintaining privacy and security standards.
