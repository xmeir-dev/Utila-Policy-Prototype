# Crypto Transfer Application - Design Guidelines

## Design Approach

**Selected Framework:** Design System Approach (Material Design principles + Crypto Platform References)

Drawing inspiration from Coinbase, Phantom Wallet, and modern fintech platforms that prioritize clarity, trust, and efficiency. The design balances sophisticated visual treatment with functional precision required for financial transactions.

**Core Principles:**
- Information clarity over decoration
- Spatial hierarchy to guide critical actions
- Trustworthy, professional aesthetic
- Efficient task completion flows

## Typography System

**Font Stack:** 
- Primary: Inter (via Google Fonts CDN)
- Mono: JetBrains Mono for addresses/transaction IDs

**Hierarchy:**
- Hero/Display: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body Text: text-base, font-medium
- Supporting Text: text-sm, font-normal
- Labels/Captions: text-xs, uppercase, tracking-wide

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24

**Grid Structure:**
- Main container: max-w-7xl with px-4 md:px-8
- Dashboard layout: Two-column (sidebar + main content)
- Sidebar width: w-64 (fixed on desktop)
- Card spacing: gap-6 for grids, gap-4 within cards

## Component Library

### Navigation
**Sidebar Navigation:**
- Fixed left sidebar with wallet overview at top
- Menu items with Heroicons (outline style)
- Active state: subtle background elevation
- Balance display prominently positioned

**Top Bar:**
- Network selector dropdown (right-aligned)
- Profile/settings icon
- Notification bell with badge indicator
- Search bar (when applicable)

### Cards & Containers

**Asset Cards:**
- Elevated surface with rounded-2xl corners
- Padding: p-6
- Include: token icon (40px), name, symbol, balance, USD value
- Hover state: slight elevation increase
- Layout: flex with space-between alignment

**Transaction Cards:**
- Compact design with p-4
- Row layout: status icon, recipient/sender, amount, timestamp
- Monospace font for addresses (truncated with ellipsis)
- Status indicators using colored dots

**Wallet Card:**
- Large card showcasing primary wallet
- Includes: wallet name, address (truncated), QR code button, copy button
- Balance prominently displayed with large text
- Action buttons: Send, Receive, Swap

### Forms & Inputs

**Transfer Form:**
- Large, single-column layout with max-w-md
- Field spacing: space-y-6
- Recipient address input with validation states
- Amount input with max button
- Asset selector (dropdown with search)
- Fee selector with radio options (Slow/Standard/Fast)
- Review panel showing total with fees

**Input Fields:**
- Height: h-12 for standard inputs
- Rounded: rounded-lg
- Padding: px-4
- Labels above inputs with mb-2
- Icons positioned inside inputs (left or right)

### Buttons

**Primary Actions:**
- Height: h-12 for standard, h-14 for hero CTAs
- Padding: px-8
- Rounded: rounded-full for primary, rounded-lg for secondary
- Font: text-base, font-semibold

**Button Hierarchy:**
- Primary: Send/Confirm transactions
- Secondary: Cancel/Back actions  
- Tertiary: View details/Learn more

**Icon Buttons:**
- Size: w-10 h-10 for standard
- Perfect circle: rounded-full
- Used for: Copy, QR, Settings, Close

### Data Display

**Asset List:**
- Sortable table/card grid hybrid
- Columns: Asset, Balance, Price, 24h Change, Actions
- Search and filter controls at top
- Pagination or infinite scroll

**Transaction History:**
- Reverse chronological list
- Grouped by date headers
- Filter tags: All, Sent, Received, Swapped
- Export button (top-right)

**Statistics Dashboard:**
- 4-column grid (lg:grid-cols-4 md:grid-cols-2)
- Metrics cards showing: Total Balance, 24h Change, Pending Txs, Active Wallets
- Sparkline charts for trends (use Chart.js via CDN)

### Modals & Overlays

**Transaction Confirmation:**
- Centered modal with max-w-md
- Clear visual hierarchy: from/to, amount, fees
- Network fee breakdown
- Large confirm button at bottom
- Close icon (top-right)

**Asset Selector Modal:**
- Full-height sidebar or centered modal
- Search bar at top
- Scrollable asset list with token icons
- Popular assets section at top

### Special Components

**QR Code Display:**
- Use qrcode.js library via CDN
- Centered presentation with address below
- Download/Share buttons

**Address Display:**
- Monospace truncation: 0x1234...5678
- Copy button with success feedback
- Full address on hover tooltip

**Network Badge:**
- Small pill shape with network icon
- Used in top bar and transaction details

## Icons
**Library:** Heroicons (outline style via CDN)
- Use 24px size for navigation
- Use 20px for inline actions
- Use 16px for small indicators

## Images

**Hero Section:**
- Abstract gradient mesh or 3D crypto-themed illustration
- Placement: Landing page hero (if separate from dashboard)
- Dimensions: Full-width, h-[600px] with content overlay
- Content overlay uses backdrop-blur-xl for buttons
- Alternative: Dashboard has no hero, jumps straight to wallet overview

**Asset Icons:**
- Use cryptocurrency icon library (cryptocurrency-icons via CDN)
- Fallback to first letter in colored circle
- Size: 40px for cards, 32px for lists, 24px for compact views

**Empty States:**
- Illustrations for: No transactions, No assets, Wallet creation
- Simple line art style, centered, with helpful CTA text below

## Accessibility
- Minimum touch target: 44px
- Color-blind safe status indicators (use shapes + colors)
- ARIA labels for all icon buttons
- Focus states: 2px ring with offset
- Keyboard navigation for all interactive elements

## Animations
**Minimal, purposeful only:**
- Loading states: Subtle pulse on cards
- Transition confirmation success: Checkmark animation
- Network switching: Brief fade transition
- No scroll animations, no parallax

This framework creates a professional, trustworthy crypto application optimized for clarity and efficient task completion while maintaining modern visual sophistication.