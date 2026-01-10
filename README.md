# Tomsweb2

Personal site built with [Hugo](https://gohugo.io/) using the [Blowfish](https://blowfish.page/) theme.

## Tech stack
- **Static site generator:** Hugo
- **Theme:** Blowfish (v2)
- **CICD:** GitLab

## Local development

Prerequisite: Install Hugo.

```bash
hugo server -D
```

Then open http://localhost:1313

## Project structure

- `content/` — Pages, posts, and content bundles
- `layouts/` — Custom templates/overrides
- `assets/` — Source assets processed by Hugo
- `static/` — Files copied directly to the output
- `terraform/` — Infrastructure as code for site
