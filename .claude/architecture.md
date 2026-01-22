# USDU Finance App - Architecture Guide

## Project Structure Pattern

### Pages vs Components

This project follows a strict separation pattern:

**Pages** (`pages/`) - Simple route handlers

- Only import and render section components
- No business logic
- No UI implementation
- Example: `pages/index.tsx`, `pages/governance.tsx`

**Sections** (`components/sections/`) - Complex UI components

- Contains all business logic
- Includes hooks, state management, and data fetching
- Self-contained with container styling (`container mx-auto px-4 py-12`)
- Example: `components/sections/Hero.tsx`, `components/sections/Governance.tsx`

### Example Structure

```tsx
// ✅ GOOD - pages/governance.tsx
import Governance from '@/components/sections/Governance';

export default function GovernancePage() {
	return (
		<>
			<Governance />
		</>
	);
}

// ✅ GOOD - components/sections/Governance.tsx
export default function Governance() {
	const { modules } = useModuleDataAll();

	return <div className="container mx-auto px-4 py-12">{/* Complex UI and logic here */}</div>;
}

// ❌ BAD - Don't put logic in page files
export default function GovernancePage() {
	const { modules } = useModuleDataAll(); // NO!
	return <div>...</div>;
}
```

## Data Fetching

### Apollo Client Setup

- Provider: `lib/graphql/provider.tsx`
- Endpoint: `process.env.NEXT_PUBLIC_INDEXER_URL` (Ponder indexer)
- Cache policy: `cache-and-network` with `cache-first` on subsequent fetches

### Hooks Pattern

Custom hooks in `hooks/` directory:

```tsx
// useModulesData.ts - Governance module data
export function useModulesData(chainId); // Current modules
export function useModuleDataAll(chainId); // Modules + complete history
export function useModuleHistory(chainId, module); // Specific module history
export function useModuleByAddress(address, chainId); // Single module with history
```

All hooks return:

```tsx
{
  data: T[],
  isLoading: boolean,
  error: string | null,
  refetch: () => void
}
```

## UI Components

### Reusable Components (`components/ui/`)

- `Button.tsx` - Button component
- `Tabs.tsx` - Tab navigation
- `Accordion.tsx` - Collapsible content

### Layout Components (`components/layout/`)

- `Layout.tsx` - Main app layout
- `Footer.tsx` - Site footer
- `DashboardLayout.tsx` - Dashboard specific layout

## Styling Guidelines

### Tailwind Custom Classes

```
usdu-orange  - Primary brand color
usdu-black   - Primary text color
usdu-bg      - Background color
usdu-surface - Surface/card color
usdu-card    - Card text color
text-secondary - Secondary text
```

### Container Pattern

Section components should include:

```tsx
<div className="container mx-auto px-4 py-12 space-y-8">{/* Content */}</div>
```

- `container mx-auto` - Centers and constrains width
- `px-4` - Horizontal padding
- `py-12` - Vertical padding
- `space-y-8` - Spacing between child elements

For content with max width constraints:

```tsx
<div className="max-w-7xl mx-auto space-y-4">{/* Constrained content */}</div>
```

## GraphQL Schema

### Ponder Indexer Tables

**StablecoinModuleMapping** (Current state)

- chainId, module, message, messageUpdated
- createdAt, updatedAt, expiredAt
- txHash, logIndex, blockheight, caller
- Query: `stablecoinModuleMappings`

**StablecoinModuleHistory** (Historical events)

- All fields from Mapping plus:
- kind: 'Proposed' | 'Set' | 'Revoked'
- timelock, expiredAt
- Query: `stablecoinModuleHistorys`

Note: Ponder adds `s` suffix for pluralization (not `ies`)

## Module Status Logic

Modules have different statuses based on their state:

1. **Active** - Module is set and not expired
2. **Pending** - Module is proposed but not set yet
3. **Revoked** - Module was revoked
4. **Expired** - Module has passed expiration date

Status is determined by:

- Latest history event `kind` field
- `isExpired` flag (computed from `expiredAt` timestamp)

Sorting order: Active → Pending → Revoked → Expired

## Utility Functions Organization

### Structure (`lib/utils/`)

Utilities are organized by domain/function type:

**format-number.ts** - Number and currency formatting
- `formatNumber()` - Add commas to numbers
- `formatCurrency()` - Flexible currency formatting with min/max decimals
- `formatCurrencyStandard()` - Standard USD currency format
- `formatCompactNumber()` - Numbers with K/M suffixes (e.g., 1.2M)
- `formatValue()` - Formatted values with prefix/suffix
- `formatPrice()` - Price formatting with specific decimals
- `formatValueWithState()` / `formatPriceWithState()` - Handles loading/error states

**format-date.ts** - Date and time formatting
- `toTimestamp()` - Convert Date to Unix timestamp
- `formatDateLocale()` - ISO-like format without separators
- `formatDate()` - Human-readable format (YYYY-MM-DD HH:mm)
- `formatDateDuration()` - Relative time (e.g., "2 hours ago")
- `formatDuration()` - Duration in seconds to human-readable
- `isDateExpired()` / `isDateUpcoming()` - Date comparison helpers

**format-string.ts** - String manipulation
- `capLetter()` - Capitalize first letter
- `shortenString()` - Shorten with ellipsis
- `shortenAddress()` - Shorten address with checksum validation
- `formatAddress()` - Alternative address formatter

**browser-utils.ts** - Browser-specific utilities
- `isClient` - Check if running on client side
- `copyToClipboard()` - Copy text to clipboard
- `sleep()` - Promise-based delay utility

**style-utils.ts** - Style utilities
- `cn()` - Combine class names (uses clsx)

**index.ts** - Central export file
- Re-exports all utilities for clean imports
- Import from `@/lib/utils` instead of individual files

### Usage

```tsx
// ✅ GOOD - Import from central index
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// ❌ BAD - Don't import from individual files
import { formatCurrency } from '@/lib/utils/format-number';
```

### Organization Best Practices

1. **Group by domain** - Functions with similar purposes belong together
2. **No duplicates** - Remove duplicate functionality when found
3. **Document with JSDoc** - Add comments explaining parameters and return values
4. **Keep functions pure** - Avoid side effects where possible
5. **Central exports** - Always use index.ts for re-exports
6. **Update all imports** - When refactoring, update all file imports

## Development Guidelines

1. **Always** create section components in `components/sections/`
2. **Always** keep pages simple (just imports and rendering)
3. Use `container mx-auto px-4 py-12` for section spacing
4. Sort data logically (e.g., active modules first, expired last)
5. Include loading and error states in all data-fetching components
6. Use Apollo Client caching with `refetch()` for manual updates
7. Follow existing color scheme and spacing patterns
8. Add `max-w-7xl mx-auto` for constrained content widths
9. **Import utilities** from `@/lib/utils` (not individual files)
