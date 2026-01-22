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

**Module Data Hooks (GraphQL)**
```tsx
// useModulesData.ts - Governance module data
export function useModulesData(chainId); // Current modules
export function useModuleDataAll(chainId); // Modules + complete history
export function useModuleHistory(chainId, module); // Specific module history
export function useModuleByAddress(address, chainId); // Single module with history
```

**Module Financials Hook (Blockchain)**
```tsx
// useModulesFinancials.ts - Fetch on-chain financial data for active modules
export function useModulesFinancials(chainId);
// Returns:
{
  byAddress: Map<string, ModuleFinancials>, // Data per module
  totalAssets: number,                      // Total across all modules
  totalMinted: number,                      // Total across all modules
  totalAssetsRaw: bigint,                   // Raw values
  totalMintedRaw: bigint,
  isLoading: boolean,
  error: string | null
}
// ModuleFinancials: { address, totalAssets, totalMinted, totalAssetsRaw, totalMintedRaw }
// Note: totalAssets and totalMinted are numbers (parseFloat of formatted units)
```

**Curator Balances Hook (Blockchain)**
```tsx
// useCuratorBalances.ts - Fetch token balances from DAO curator address
export function useCuratorBalances(chainId);
// Returns:
{
  usdu: TokenBalance,  // USDU balance (18 decimals)
  usdc: TokenBalance,  // USDC balance (6 decimals)
  total: number,       // Combined total (USDC scaled to 18 decimals)
  isLoading: boolean,
  error: string | null
}
// TokenBalance: { token, address, balance, balanceRaw, decimals }
// Note: USDC is scaled from 6 to 18 decimals before adding to total
// balance is a number (parseFloat of formatted units)
```

**Protocol Data Hooks (Blockchain)**
```tsx
// useProtocolData.ts - USDU supply, DEX liquidity, price
export function useProtocolData();
```

All hooks return standard format with:
```tsx
{
  data: T[],
  isLoading: boolean,
  error: string | null,
  refetch?: () => void
}
```

### Configuration and Constants

**CRITICAL: Always use centralized constants, never hardcode configuration values**

All configuration values should be defined in `lib/constants.ts` and sourced from environment variables where appropriate.

**Refetch Intervals**

```tsx
// lib/constants.ts
export const APP_REFETCH = parseInt(process.env.NEXT_PUBLIC_APP_REFETCH || '60000');

// ✅ GOOD - Use the constant
import { APP_REFETCH } from '@/lib/constants';

const { data } = useReadContracts({
  contracts,
  query: {
    refetchInterval: APP_REFETCH,
  },
});

// ❌ BAD - Don't hardcode
const { data } = useReadContracts({
  contracts,
  query: {
    refetchInterval: 30000, // NO!
  },
});
```

**Benefits:**
- Centralized configuration management
- Environment-specific values (dev vs production)
- Easy to change behavior without code modifications
- Consistent values across all hooks

**Pattern:**
1. Add constant to `lib/constants.ts`
2. Use environment variable with sensible default
3. Use `parseInt` for numeric values
4. Import and use the constant throughout the app

## UI Components

### Reusable Components (`components/ui/`)

- `Button.tsx` - Button component
- `Tabs.tsx` - Tab navigation
- `Accordion.tsx` - Collapsible content
- `AddressDisplay.tsx` - Full address display box with label, copy button, and explorer link
- `AddressLink.tsx` - Inline address link for use in tables and compact layouts
- `StatsCard.tsx` - Statistics card component

### Address Display Components

Two components for displaying blockchain addresses with explorer links:

**AddressDisplay** - Full-featured card display
```tsx
<AddressDisplay
	label="Market Address"
	address="0x1234..."
	type="address"  // or "tx" or "block"
	chainId={1}
	shorten={false}
	hideCopy={false}
	hideExplorer={false}
/>
```
- Use for: Prominent address displays, forms, detailed views
- Features: Label, full address, copy button, explorer link
- Styling: Gray background card with padding

**AddressLink** - Compact inline link
```tsx
<AddressLink
	address="0x1234..."
	type="tx"
	chainId={1}
	displayText="Custom text"  // optional, defaults to shortened address
	hideIcon={false}
/>
```
- Use for: Tables, lists, inline mentions
- Features: Shortened address, explorer link
- Styling: Orange link with external icon

**When to use which:**
- `AddressDisplay`: Standalone address displays where address is the primary content
- `AddressLink`: Inline address mentions within text, tables, or compact layouts

**Important:** Never manually implement address links with `<a>` tags and hardcoded explorer URLs. Always use these components which:
- Automatically use the correct block explorer for the chain
- Handle different address types (address, tx, block)
- Provide consistent styling across the app
- Include proper accessibility attributes

### Next.js Link Usage

**CRITICAL: Always use Next.js Link component for URLs**

Next.js provides optimized client-side navigation through its `Link` component. **Never use `<a>` tags directly** for any URL references.

❌ **BAD - Regular anchor tags:**
```tsx
<a href="/dashboard" className="...">
	Dashboard
</a>

<a href="https://etherscan.io/address/0x123" target="_blank" rel="noopener noreferrer">
	View on Etherscan
</a>
```

✅ **GOOD - Next.js Link:**
```tsx
import Link from 'next/link';

// Internal links
<Link href="/dashboard" className="...">
	Dashboard
</Link>

// External links
<Link href="https://etherscan.io/address/0x123" target="_blank" rel="noopener noreferrer">
	View on Etherscan
</Link>
```

**Benefits of using Link:**
- Automatic prefetching for faster navigation
- Client-side routing without full page reloads
- Better performance and user experience
- Proper handling of internal vs external links
- Consistent with Next.js best practices

**Note:** Our `AddressDisplay` and `AddressLink` components already use `Link` internally, so no need to wrap them.

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

### Critical: Don't Duplicate Utility Functions

**NEVER** create local utility functions in components when a centralized utility exists or could exist.

❌ **BAD - Duplicate local functions:**
```tsx
export default function MyComponent() {
	const formatTimestamp = (timestamp: bigint) => {
		const date = new Date(Number(timestamp) * 1000);
		return date.toLocaleString();
	};

	return <div>{formatTimestamp(data.createdAt)}</div>;
}
```

✅ **GOOD - Use or extend centralized utilities:**
```tsx
import { formatTimestampLocale } from '@/lib/utils';

export default function MyComponent() {
	return <div>{formatTimestampLocale(data.createdAt)}</div>;
}
```

**If a utility doesn't exist:**
1. Add it to the appropriate file in `lib/utils/` (e.g., format-date.ts, format-string.ts)
2. Export it from `lib/utils/index.ts`
3. Import and use it in your component
4. This makes it reusable across the entire codebase

**Benefits:**
- Single source of truth
- Easier testing and maintenance
- Consistent behavior across the app
- No duplicate code

## SEO & Metadata

### NextSeo Usage Pattern

**CRITICAL: Always use centralized SEO constants from `lib/constants.ts`**

Never hardcode SEO metadata in pages. All titles, descriptions, and OpenGraph data should be defined in the `SEO` constant.

❌ **BAD - Hardcoded metadata:**
```tsx
<NextSeo
	title="My Page - USDU Finance"
	description="Some description here..."
/>
```

✅ **GOOD - Use constants:**
```tsx
import { SEO } from '@/lib/constants';

<NextSeo
	title={SEO.myPage.title}
	description={SEO.myPage.description}
	openGraph={SEO.myPage.openGraph}
/>
```

**Adding new page metadata:**
1. Add entry to `SEO` constant in `lib/constants.ts`
2. Use template literals with `APP_NAME`, `APP_URL`, `PROJECT.description` where appropriate
3. Include title, description, and openGraph (with type, url)
4. Import and use in page component

**Example:**
```typescript
// lib/constants.ts
export const SEO = {
	myNewPage: {
		title: `My New Page - ${APP_NAME}`,
		description: 'Page description here',
		openGraph: {
			title: `My New Page - ${APP_NAME}`,
			description: 'OpenGraph description',
			type: 'website' as const,
			url: `${APP_URL}/my-new-page`,
		},
	},
};
```

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
10. **Always use Next.js `Link`** component for URLs (never `<a>` tags)
11. **Never duplicate utility functions** in components - use or extend centralized utils
12. **Use `AddressDisplay` or `AddressLink`** components for blockchain addresses
13. **Use centralized SEO constants** from `lib/constants.ts` (never hardcode metadata)
14. **Use centralized configuration constants** like `APP_REFETCH` (never hardcode config values)
