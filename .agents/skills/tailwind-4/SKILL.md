---
name: tailwind-4
description: 'Advanced patterns and strict standards for Tailwind CSS v4. Trigger: When writing styles via className, handling conditional rendering with cn(), or managing dynamic CSS variables.'
metadata:
  version: '1.0'
  scope: [general]
  auto_invoke: 'Working with Tailwind classes'
---

# Tailwind CSS Architecture & Patterns

## 1. utility Class Management (`cn`)

Standardize class merging using `clsx` and `tailwind-merge`. This is the foundational utility for all React components.

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes and resolves conflicts (e.g., p-4 vs p-2).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Usage Strategy

| Scenario          | Approach          | Example                                          |
| ----------------- | ----------------- | ------------------------------------------------ |
| **Static Styles** | String literal    | `className="flex gap-2"`                         |
| **Conditional**   | `cn()` wrapper    | `className={cn("p-4", isOpen && "bg-blue-500")}` |
| **Prop Merging**  | `cn()` with prop  | `className={cn("text-sm", className)}`           |
| **Dynamic Math**  | `style` attribute | `style={{ width: `${percent}%` }}`               |

---

## 2. Color & Token Discipline

Strictly avoid hardcoded values to maintain theme consistency and dark mode compatibility.

### 🚫 Anti-Patterns (Forbidden)

```typescript
// Do NOT use raw hex codes
<div className="bg-[#0f172a]" />

// Do NOT inject CSS variables directly into class strings
<div className="text-[var(--foreground)]" />

```

### ✅ Best Practices (Allowed)

```typescript
// Use semantic tokens defined in your theme
<div className="bg-slate-900" />
<div className="text-foreground" />

```

### 3rd Party Integration (e.g., Charts)

When a library (like Recharts or VisX) cannot accept a `className`, use CSS variables mapped to constants.

```typescript
const THEME_COLORS = {
  axis: "var(--border)",
  grid: "var(--muted-foreground)",
  tooltip: "var(--background)",
};

// Usage
<CartesianGrid stroke={THEME_COLORS.grid} />

```

---

## 3. Dynamic Styling Strategy

### The `cn()` Pattern

Use for discrete states (boolean flags, enums).

```typescript
<button
  className={cn(
    "rounded px-4 py-2 transition-colors",
    // Handle variants
    variant === "solid" && "bg-primary text-white",
    variant === "outline" && "border border-input hover:bg-accent",
    // Handle state
    isDisabled && "opacity-50 pointer-events-none"
  )}
/>

```

### The `style` Pattern

Use for continuous values (coordinates, progress bars, user-defined colors).

```typescript
// Interpolating numbers
<div style={{ transform: `translateX(${x}px)` }} />

// Injecting dynamic CSS variables
<div style={{ "--delay": `${index * 100}ms` } as React.CSSProperties} />

```

---

## 4. JIT & Arbitrary Values

Use the square bracket syntax `[]` sparsely. It is permitted for pixel-perfect layouts but forbidden for colors.

```typescript
// ✅ Allowed: One-off layout constraints
<div className="h-[calc(100vh-4rem)]" />
<div className="grid-cols-[200px_1fr]" />
<div className="top-[50px]" />

// ❌ Forbidden: Arbitrary colors (breaks theming)
<div className="text-[#ff0000]" />

```

---

## 5. Layout Patterns Reference

### Flexbox & Alignment

Prefer `gap` over margins for internal spacing.

```typescript
<div className="flex flex-col items-center justify-center gap-4" />
<div className="inline-flex flex-wrap content-between" />

```

### Grid Layouts

Responsive grid structures.

```typescript
// Auto-fit grid
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" />

// Complex spans
<div className="col-span-2 row-span-1" />

```

### Spacing & Sizing

Use standard t-shirt sizing or fractionals.

```typescript
<div className="w-full max-w-md p-6 mx-auto my-12" />
<div className="min-h-screen py-10 px-4" />

```

### Typography & Effects

Combine size, weight, and color.

```typescript
<h2 className="text-3xl font-extrabold tracking-tight text-slate-900" />
<div className="shadow-lg ring-1 ring-black/5 rounded-xl" />

```

### Interactive States

Group modifiers for hover/focus interactions.

```typescript
<a className="hover:underline focus:ring-2 focus:ring-offset-2 active:opacity-80" />
<div className="group hover:bg-slate-100">
  <span className="group-hover:text-blue-600">Nested Change</span>
</div>

```

### Dark Mode

Prefix styles with `dark:`.

```typescript
<div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50" />

```
