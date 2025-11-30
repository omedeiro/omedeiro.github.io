# Copilot Instructions for Portfolio Site

## Code Generation Guidelines

### 1. Simplicity First
- Write minimal, focused code that directly addresses the task
- Avoid unnecessary complexity or over-engineering
- Use standard library functions when possible
- Only add dependencies when genuinely needed

### 2. Documentation Standards
- Keep descriptions concise and factual
- Avoid marketing language or excessive adjectives
- Focus on technical implementation details
- Only include examples when specifically requested
- Use bullet points for feature lists, not lengthy paragraphs

### 3. MyST Markdown Formatting
- Use modern MyST syntax (grid cards, not panels)
- Avoid deprecated directives like `{panels}`
- Remove unnecessary options like `:gutter:` and `:link-type:`
- Use clean grid layouts: `::::{grid} N` with `:::{grid-item-card}`

### 4. Content Structure
- Lead with essential information
- Omit "getting started" sections unless specifically requested
- Remove placeholder text and example repositories
- Focus on actual implementation rather than theoretical benefits

### 5. Code Examples
- Only include code when demonstrating specific functionality
- Keep examples short and directly relevant
- Remove installation instructions unless project setup is the focus
- Avoid generic "hello world" type examples

### 6. Contact Information
- Use real contact details, not placeholders
- Keep social media badges minimal
- Remove redundant contact methods

### 7. Project Descriptions
- State what the project does in one clear sentence
- List technologies used without excessive detail
- Focus on unique or interesting technical aspects
- Avoid generic project benefits or marketing copy

### 8. File Organization
- Keep configuration files minimal
- Only include metadata that's actually used
- Remove commented-out configuration options
- Use descriptive but concise variable names

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

Focus on substance over style, technical accuracy over marketing appeal.
