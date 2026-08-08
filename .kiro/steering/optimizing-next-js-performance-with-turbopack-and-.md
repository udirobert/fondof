---
title: "Optimizing Next.js Performance with Turbopack and Foundry"
domain: ["performance"]
applicability: ["- monorepo with pnpm workspaces"]
sources:
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Disk Caching for Dev"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Faster Builds with Turbopack's FileSystem Cache"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Type Checking with TypeScript 7"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Native Node.js Streams for Server-Side Rendering"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Versioned Docs for AI Agents"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Fewer Prefetch Requests with Inlining"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Better Caching for Static Assets"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Custom Error Boundaries"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Built-in Glob Imports"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Root Params"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Instant Navigations"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Instant Insights"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Partial Prefetching"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Better Incremental Static Regeneration (ISR)"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Navigation Inspector"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Playwright Test Helper"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Rust-based React Compiler"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 0–22"
    contribution: "Network Resilience"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 23–24"
    contribution: "Maintaining a Large Open-Source Project"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 23–24"
    contribution: "Building a Strong Community"
  - url: "https://nextjs.org/blog/next-16-3"
    segment: "Paragraphs 23–24"
    contribution: "Effective Collaboration"
provenance:
  sourceHashes:
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
    - "2d670fd8815f2d0887320d74408b3b02efae127dbb2dd9154143f80806897792"
  composedAt: "2026-08-08T16:07:28.344Z"
  fittedTo: "udirobert/fondof"
---

# Optimizing Next.js Performance with Turbopack and Foundry

## Context

This skill applies to Next.js projects utilizing Turbopack and Foundry, particularly those with a monorepo structure using pnpm workspaces. It assumes the project uses TypeScript (85%) and Solidity (15%) codebase, with a focus on optimizing performance and leveraging the strengths of Turbopack and Foundry.

## Guidance

To optimize Next.js performance with Turbopack and Foundry:

### Idea 1: Disk Caching for Dev

Enable disk caching for dev to reduce memory usage:
```typescript
// next.config.js
module.exports = {
  experimental: {
    turbopack: {
      dev: {
        diskCaching: true,
      },
    },
  },
};
```

### Idea 2: Faster Builds with Turbopack's FileSystem Cache

Use Turbopack's disk caching feature to speed up builds:
```typescript
// next.config.js
module.exports = {
  experimental: {
    turbopack: {
      build: {
        fsCache: true,
      },
    },
  },
};
```

### Idea 3: Type Checking with TypeScript 7

Use TypeScript 7 for faster type checking during next build:
```typescript
// package.json
"scripts": {
  "build": "next build && tsc",
  "dev": "next dev",
},
```

### Idea 4: Native Node.js Streams for Server-Side Rendering

Replace web streams with native Node.js streams in the App Router rendering layer:
```typescript
// pages/_app.tsx
import { NextPage } from 'next';
import { createServer } from 'http';

const App: NextPage = () => {
  const server = createServer((req, res) => {
    // Use native Node.js streams
    const readable = new ReadableStream({
      async pull(controller) {
        // ...
      },
    });
    const writable = new WritableStream({
      async write(chunk) {
        // ...
      },
    });
    readable.pipeTo(writable);
  });

  return (
    <div>
      <h1>Server-Side Rendering</h1>
      <p>Using native Node.js streams</p>
    </div>
  );
};
```

### Idea 5: Versioned Docs for AI Agents

Use version-matched AGENTS.md blocks to automatically read documentation for AI agents:
```markdown
# AGENTS.md

## Anti-patterns

* Avoid using global variables and instead opt for a more modular approach using import.meta.glob.
* Refrain from using complex nested components and instead break them down into smaller, reusable components.
* Do not use deprecated APIs and instead use the latest versions of libraries and frameworks.

## References

* [Next.js 16.3 Release Notes](https://nextjs.org/blog/next-16-3)
* [Turbopack Documentation](https://turbopack.app/)
* [Foundry Documentation](https://foundry.ethers.io/)
* [Next.js API Reference](https://nextjs.org/docs/api-reference)
* [Turbopack API Reference](https://turbopack.app/api-reference)
```
