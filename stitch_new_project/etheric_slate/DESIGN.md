# Design System Specification: The Architectural Minimalist

## 1. Overview & Creative North Star
The North Star for this design system is **"The Digital Curator."** 

We are moving beyond the generic "SaaS template" by embracing a high-end, editorial approach to software design. While the foundation is inspired by the functional clarity of Notion and the precision of Linear, our execution shifts toward a more intentional, layered experience. We prioritize breathing room over density and tonal depth over structural lines. 

The goal is to create an interface that feels less like a tool and more like a premium workspace—where every element is positioned with the precision of a gallery installation. We break the grid through intentional asymmetry in hero sections and use exaggerated typography scales to command attention.

---

## 2. Colors & Surface Philosophy
The palette is a sophisticated study in whites and cool grays, punctuated by a precise "Accent Blue" for functional momentum.

### Color Tokens
- **Primary (The Accent):** `#005ac2` (Action) | `#d8e2ff` (Container)
- **Neutral (The Foundation):** `#ffffff` (Surface Lowest) | `#f8f9fa` (Background) | `#eaeff1` (Surface Container)
- **Contrast (The Text):** `#2b3437` (On-Surface) | `#586064` (On-Surface Variant)

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural definition must be achieved through **background color shifts**. To separate a sidebar from a main stage, or a header from a scrollable area, use a transition from `surface-container-low` to `surface`. If a boundary feels missing, increase the white space rather than adding a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
- **Base Level:** `surface` (#f8f9fa) is your canvas.
- **Structural Sections:** Use `surface-container-low` (#f1f4f6) for large regions like sidebars or secondary content blocks.
- **Interactive Cards:** Use `surface-container-lowest` (#ffffff) to make interactive elements "pop" against the gray background.

### The "Glass & Gradient" Rule
To elevate the system from "flat" to "premium," floating elements (modals, dropdowns, popovers) must utilize **Glassmorphism**. Use a semi-transparent `surface` color with a `backdrop-blur` of 12px–20px. 
*Note: Apply a subtle linear gradient to main CTAs—from `primary` (#005ac2) to `primary_dim` (#004fab)—to give buttons a tactile, high-end "soul."*

---

## 3. Typography
We use **Inter** not just for readability, but as a brand-defining element. The hierarchy is exaggerated to create an editorial feel.

- **Display Scales (The Statement):** `display-lg` (3.5rem) should be used for hero moments with tight letter-spacing (-0.02em). 
- **Headline Scales (The Narrative):** `headline-sm` (1.5rem) uses a medium weight to anchor content sections without overwhelming the "No-Line" layout.
- **Body & Label (The Utility):** `body-md` (0.875rem) is our workhorse. For labels, use `label-md` (0.75rem) in `on-surface-variant` with increased letter-spacing (+0.05em) to maintain an airy, professional tone.

---

## 4. Elevation & Depth
Depth in this system is a result of **Tonal Layering**, not heavy shadows.

- **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container-low` (#f1f4f6) section. The delta in brightness creates a "Soft Lift" that feels more natural than a shadow.
- **Ambient Shadows:** For elements that truly float (like Tooltips or Modals), use a "Whisper Shadow": `box-shadow: 0 12px 40px -12px rgba(43, 52, 55, 0.08);`. The shadow color is a low-opacity tint of our `on-surface` token, mimicking natural light.
- **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use the `outline-variant` token (#abb3b7) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** High-contrast `on-primary` text on a `primary` gradient background. `0.5rem` (DEFAULT) roundedness.
- **Secondary:** `surface-container-high` background with `on-surface` text. No border.
- **Tertiary:** Purely typographic with a subtle `primary` tint on hover.

### Cards & Lists
- **Rule:** Never use divider lines.
- **Implementation:** Separate list items using 8px of vertical white space. In cards, use padding (24px–32px) and `surface-container` shifts to define content areas.

### Input Fields
- **Resting State:** `surface-container-highest` background with a "Ghost Border" at 10%.
- **Focus State:** 2px solid `primary` or a soft `primary-container` outer glow.
- **Typography:** Placeholder text should be `on-surface-variant` at 50% opacity.

### Navigation (The Signature Component)
- **The Sidebar:** Use `surface-container-low` as the background. Active states should not use a background color—instead, use a bold `primary` vertical "indicator pill" (4px width) on the left edge of the active item.

---

## 6. Do’s and Don’ts

### Do:
- **Do** embrace negative space. If a layout feels "empty," it’s likely working.
- **Do** use `surface-container` tiers to nest content. An inner card should always be lighter than its parent container to "lift" toward the user.
- **Do** use Inter's Variable font features to subtly adjust weight for "Label" vs "Body" roles.

### Don’t:
- **Don't** use 100% black (#000000) for text. Use `on-surface` (#2b3437) to maintain the soft, modern aesthetic.
- **Don't** use 1px solid borders for grids. Use the `surface` color shifts.
- **Don't** use traditional "Material" elevation (z-index 1, 2, 3). Use the **Layering Principle** (Tonal shifts) first.
- **Don't** clutter the interface with icons. Use icons only when they serve as essential functional signposts.

---

## 7. Roundedness Scale
To maintain the "Architectural" feel, we use a disciplined radius system:
- **Standard (Components):** `0.5rem` (Buttons, Inputs, Chips)
- **Large (Sections):** `1rem` (Cards, Modals)
- **Interactive (Pills):** `9999px` (Status Badges)