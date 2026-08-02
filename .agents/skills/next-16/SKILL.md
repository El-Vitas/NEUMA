---
name: next-16
description: 'Next.js 16 App Router patterns & React 19 integration. Trigger: When working with App Router, async Request APIs (params/cookies), Server Actions with useActionState, Partial Prerendering (PPR), and the `use cache` directive.'
metadata:
  version: '1.0'
  scope: [general]
  auto_invoke: 'App Router / Server Actions'
---

# App Router File Conventions

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI (Suspense boundary)
├── error.tsx           # Error boundary (Client Component)
├── not-found.tsx       # 404 page
├── global-error.tsx    # Root layout error boundary
├── instrumentation.ts  # Observability & Init logic
├── (auth)/             # Route group (logical grouping)
│   ├── login/page.tsx
│   └── layout.tsx      # Layout specific to auth group
└── api/
    └── route.ts        # API Route Handler

```

# Async Request APIs (REQUIRED)

In Next.js 16, dynamic APIs are strictly asynchronous. You MUST await them.

```typescript
// ✅ Correct: Awaiting params and searchParams
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ query: string }>;
}) {
  const { slug } = await params;
  const { query } = await searchParams;

  return <div>Slug: {slug}, Query: {query}</div>;
}

// ✅ Correct: Awaiting cookies and headers
import { cookies, headers } from "next/headers";

export async function UserProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for");
}

```

# Server Components & Data Fetching

```typescript
// Default behavior: Not cached (Dynamic) unless specified
export default async function Page() {
  // Parallel fetching prevents waterfalls
  const [user, posts] = await Promise.all([
    db.user.findFirst(),
    db.posts.findMany(),
  ]);

  return (
    <main>
      <UserProfile user={user} />
      {/* Streaming: Component wraps itself in Suspense or parent does */}
      <Suspense fallback={<Skeleton />}>
        <PostFeed posts={posts} />
      </Suspense>
    </main>
  );
}

```

# The `use cache` Directive (Next.js 16)

The new standard for caching expensive operations or components.

```typescript
// src/services/product.ts
"use cache";
import { db } from "@/lib/db";

// This function's output will be cached globally
export async function getProduct(id: string) {
  return db.product.findUnique({ where: { id } });
}

// Or inline in a component
async function Stock({ id }: { id: string }) {
  "use cache";
  const stock = await db.stock.find(id);
  return <div>{stock}</div>;
}

```

# Server Actions & React 19

Using `useActionState` (native) for form handling.

```typescript
// src/modules/auth/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email');

  if (!email) {
    return { error: 'Email required', success: false };
  }

  await db.auth.login(email);
  redirect('/dashboard');
}
```

```typescript
// src/modules/auth/components/LoginForm.tsx
"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <form action={action}>
      <input name="email" />
      <button disabled={isPending}>
        {isPending ? "Logging in..." : "Login"}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}

```

# Route Handlers (API)

```typescript
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Dynamic by default if using Request object
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Process webhook
  await processEvent(body);

  return NextResponse.json({ received: true }, { status: 200 });
}
```

# The `after` API (Non-blocking Tasks)

Execute logic after the response has been sent to the user (logging, analytics).

```typescript
import { after } from "next/server";

export default async function Page() {
  // This runs immediately
  const data = await fetchData();

  // This runs after the response stream closes
  after(() => {
    analytics.trackView("Page Viewed");
    logger.info("Data fetched successfully");
  });

  return <View data={data} />;
}

```

# Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');

  // Protect dashboard routes
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

# Metadata (Async)

```typescript
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; // Must await params
  const product = await getProduct(id);

  return {
    title: product.title,
    description: product.description,
  };
}
```
