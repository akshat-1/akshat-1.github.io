# Akshat Porwal — Portfolio

An interactive, dark-themed portfolio for Akshat Porwal, focused on AI, robotics, computer vision, security automation, and systems engineering.

The site is a static Vite application designed for GitHub Pages. It includes procedural Three.js scenes after each major section plus two technical browser-native labs:

- A 5DOF robotic arm with draggable target, damped least-squares inverse kinematics, Jacobian, and live transformation-matrix readouts.
- A multilayer perceptron cross-section where a user can select a perceptron and step through forward and backward computations, gradients, and weight updates.

## Requirements

- Node.js `22.14.0` (the version is pinned in `.nvmrc`)
- npm

## Local setup

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build and test

The single project check is:

```bash
npm test
```

It builds the production bundle and runs `scripts/smoke-test.mjs`, which checks that the generated site contains the portfolio sections, both interactive labs, resume asset, and no legacy reader references.

To build only:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Docker

Build and serve the production site locally:

```bash
docker run --rm -p 8080:80 akshat-portfolio
```

Open `http://localhost:8080`.

## Deployment

Push to `main`. `.github/workflows/deploy.yml` installs the pinned Node.js version, runs `npm ci`, builds `dist/`, and deploys that directory to GitHub Pages.

The repository must have GitHub Pages configured to use **GitHub Actions** as its build and deployment source.

## Content and assets

- Portfolio copy is in `src/data/portfolio.js`.
- The resume download is `public/Akshat_Porwal_Resume.pdf`.
- The current profile image is a geometric placeholder at `public/assets/profile-placeholder.svg`. Replace it with a profile photo when available and update `photo` in `src/data/portfolio.js` if the filename changes.
- Update the GitHub and LinkedIn URLs in `src/data/portfolio.js` if the public profile URLs differ.

## Project structure

```text
.
├── index.html
├── src/
│   ├── data/portfolio.js
│   ├── experiments/
│   │   ├── neural.js
│   │   ├── neural.css
│   │   ├── robotics.js
│   │   └── robotics.css
│   ├── main.js
│   └── styles.css
├── public/
│   ├── Akshat_Porwal_Resume.pdf
│   └── assets/profile-placeholder.svg
├── scripts/smoke-test.mjs
├── Dockerfile
├── package.json
└── vite.config.js
```
