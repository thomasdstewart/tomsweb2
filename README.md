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

## Pull request validation workflow

GitHub PRs to `main` run a Hugo validation workflow that:

- Builds the site with Hugo using CI settings.
- Uploads the generated `public/` directory as an artifact (`hugo-public`).
- Renders a local preview and uploads screenshots as an artifact (`hugo-preview-screenshots`).

This keeps CI lightweight while still giving a quick visual check for theme/dependency updates before merge and GitLab deployment.
