# Synth Website

Static website for Synth. Built with plain HTML and CSS. No build step required.

## Structure

```
website/
├── index.html           # Landing page
├── quick-start.html     # Five-minute quick start
├── docs.html            # Documentation index
├── examples.html        # Certified examples gallery
├── mission-studio.html  # Mission Studio explanation
├── architecture.html    # Public architecture overview
├── community.html       # Community links
├── styles.css           # Shared styles
└── README.md            # This file
```

## Local preview

```bash
cd website
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Deploy

Copy the contents of `website/` to any static hosting service:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- Any static file server

## Updating content

The site links to the GitHub repository for full documentation. When the repository docs change, update links here if paths change.
