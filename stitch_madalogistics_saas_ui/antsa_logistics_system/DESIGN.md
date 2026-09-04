---
name: Antsa Logistics System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747684'
  outline-variant: '#c4c6d5'
  surface-tint: '#2f58be'
  primary: '#00348f'
  on-primary: '#ffffff'
  primary-container: '#1e4bb1'
  on-primary-container: '#b3c4ff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#563400'
  on-tertiary: '#ffffff'
  tertiary-container: '#754900'
  on-tertiary-container: '#ffb95f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#063ea5'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
---

## Brand & Style

This design system is engineered for the high-stakes world of B2B logistics in Madagascar. The visual identity balances technical precision with deep-rooted reliability, ensuring that supply chain managers and fleet operators feel a sense of absolute control and security.

The aesthetic follows a **Corporate / Modern** style with leanings toward **Minimalism**. It prioritizes clarity and high data density without feeling cluttered. By utilizing generous whitespace and a refined color palette derived from the brand's core identity, the UI evokes stability, efficiency, and professional excellence. The interface remains functional and unobtrusive, allowing critical logistical data to take center stage.

## Colors

The color strategy is anchored by "Mada Blue," a professional and deep navy-blue extracted from the logo, symbolizing authority and secure transit. 

- **Primary (#1E4BB1):** Used for core navigation, primary actions, and branding elements.
- **Secondary (#10B981):** A "Success Green" used for positive status indicators like "Delivered," "In Stock," or "Payment Verified."
- **Tertiary (#F59E0B):** A "Warning Orange" reserved for alerts, pending status, or items requiring immediate attention in the supply chain.
- **Neutrals:** A range of Slate grays provides the structural framework, ensuring high legibility for data-heavy tables and forms.

The system defaults to a **Light Mode** to maintain a clean, document-like feel, utilizing a subtle off-white background (#F8FAFC) to reduce eye strain during long periods of use.

## Typography

The typography system uses **Hanken Grotesk** as the primary typeface. It is a sharp, contemporary sans-serif that balances high legibility with a modern, tech-forward character.

For technical data—such as tracking numbers, coordinates, and timestamps—the system utilizes **Geist**. This adds a developer-grade precision to the logistics data, making strings of numbers easier to scan and differentiate from narrative text. 

Hierarchy is established through weight and color (using Neutral-900 for headings and Neutral-600 for body text). For mobile devices, headline sizes scale down to prevent awkward wrapping, while maintaining the same bold weights for impact.

## Layout & Spacing

The layout utilizes a **Fluid Grid** system with fixed-width constraints for readability on ultra-wide monitors. 

- **Desktop:** 12-column grid with 24px gutters. Sidebars are fixed at 280px to provide a consistent anchor for navigation.
- **Tablet:** 8-column grid with 16px gutters. Navigation collapses into a rail or hamburger menu.
- **Mobile:** 4-column grid with 16px margins. 

The spacing rhythm is built on a **4px baseline**, with standard increments (8, 16, 24, 40, 64) ensuring vertical rhythm. Layouts are "generous"—meaning ample padding within cards (min 24px) to prevent the dense logistics data from becoming overwhelming.

## Elevation & Depth

Visual hierarchy is conveyed through **Tonal Layers** and **Low-contrast Outlines**. 

Because this is a professional tool, excessive shadows are avoided to maintain a "flat" and fast-loading appearance. Instead, depth is created by placing white surface containers atop a subtle light-gray background (#F8FAFC). 

When elevation is required (e.g., for modals or dropdown menus), the system uses **Ambient Shadows**: ultra-soft, diffused shadows with a slight blue tint (Primary-900 at 5% opacity). Borders use a consistent 1px stroke in a light neutral shade (#E2E8F0) to define boundaries without adding visual weight.

## Shapes

The shape language is **Rounded**, utilizing a 0.5rem (8px) corner radius for most standard UI elements like cards and input fields. 

This specific radius is "Soft but Structured"—it feels modern and approachable without losing the professional rigor of a logistics platform. Small components like tags and badges use a fully rounded "pill" shape to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use a solid Primary Blue fill with white text. Secondary buttons use a Primary Blue outline with a transparent background. All buttons have a subtle hover state involving a 10% darkening of the fill color.
- **Input Fields:** Use a 1px border (#E2E8F0) that transitions to Primary Blue on focus. Labels are always visible, using the `label-md` Geist typography for technical clarity.
- **Status Chips:** High-contrast badges with background tints (e.g., Success Green at 10% opacity with solid green text) used for shipment statuses.
- **Data Tables:** High-density layout with 1px horizontal dividers only. Header rows use a subtle gray background and bold `label-sm` text.
- **Cards:** White surfaces with 8px rounded corners and 1px borders. No shadows are used for standard cards; only for active or hovered states.
- **Logistics Timeline:** A custom vertical stepper component using the Primary Blue for completed stages and Neutral-300 for upcoming stages.