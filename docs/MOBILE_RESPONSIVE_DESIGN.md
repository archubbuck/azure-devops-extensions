# Mobile Responsive Design Guidelines

## Overview

All Azure DevOps extensions in this repository are designed to be accessible on both desktop and mobile devices. This document outlines the responsive design patterns and best practices used across all extensions.

## Viewport Configuration

All HTML files must include the proper viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

This ensures proper scaling on mobile devices and prevents zooming issues.

## Responsive Breakpoints

We use two standard breakpoints for responsive design:

- **Tablet/Small Desktop**: `@media (max-width: 768px)`
- **Mobile**: `@media (max-width: 480px)`

## Design Patterns by Breakpoint

### Tablet (≤768px)

At this breakpoint, we make the following adjustments:

1. **Spacing Reduction**
   - Reduce padding from `16px` to `12px` or similar
   - Decrease margins and gaps between elements
   - Example: Header padding `16px 24px` → `12px 16px`

2. **Typography Scaling**
   - Reduce heading sizes by 10-20%
   - Slightly reduce body text (e.g., `14px` → `13px`)
   - Maintain readability while saving space

3. **Flexible Layouts**
   - Enable flex-wrap on horizontal layouts
   - Allow elements to stack when needed
   - Reduce grid template column sizes

4. **Button and Control Sizing**
   - Reduce button padding
   - Ensure touch targets remain ≥44px

### Mobile (≤480px)

At this breakpoint, we make more aggressive changes:

1. **Vertical Stacking**
   - Convert horizontal layouts to vertical
   - Stack buttons and controls in columns
   - Full-width buttons for better touch targets

2. **Typography Further Reduced**
   - Additional reduction in font sizes
   - Headings: `24px` → `20px` → `16px`
   - Body text: `14px` → `13px` → `12px`

3. **Simplified Navigation**
   - Collapse complex header layouts
   - Simplify status bars and action areas
   - Consider hamburger menus for dense navigation

4. **Touch-Friendly Interactions**
   - Ensure all interactive elements are ≥44px
   - Increase spacing between clickable items
   - Use full-width buttons where appropriate

## Component-Specific Patterns

### Grid Layouts (e.g., better-tag-manager)

```css
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

@media (max-width: 768px) {
  .tags-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 480px) {
  .tags-grid {
    grid-template-columns: 1fr;
  }
}
```

### Data Grids (e.g., better-excel-grid)

For complex data grids using AG Grid:
- Rely on AG Grid's built-in responsive features
- Reduce padding around grid wrapper
- Simplify header and footer layouts on mobile
- Consider horizontal scrolling for tables

### Modal Dialogs

```css
.modal {
  max-width: 500px;
  width: 90%;
}

@media (max-width: 768px) {
  .modal {
    width: 95%;
  }
}

@media (max-width: 480px) {
  .modal {
    width: 98%;
    /* Stack buttons vertically */
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
}
```

### Status Bars and Headers

```css
.status-bar {
  display: flex;
  gap: 16px;
}

@media (max-width: 768px) {
  .status-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .status-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

## Testing Responsive Design

### Browser DevTools

1. Open Chrome/Edge DevTools
2. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
3. Test at key breakpoints:
   - 375px (iPhone SE)
   - 390px (iPhone 12/13)
   - 768px (iPad)
   - 1024px (Desktop)

### Real Device Testing

When possible, test on:
- iOS devices (iPhone)
- Android devices (various screen sizes)
- Tablets (iPad, Android tablets)

## Accessibility Considerations

1. **Touch Targets**: Minimum 44x44px for all interactive elements
2. **Text Sizing**: Never reduce text below 11px on mobile
3. **Contrast**: Maintain WCAG AA contrast ratios at all breakpoints
4. **Focus States**: Ensure visible focus indicators on all devices

## Common Anti-Patterns to Avoid

❌ **Don't:**
- Use fixed widths that don't scale
- Hide critical functionality on mobile
- Use tiny fonts (<11px)
- Rely on hover states for mobile interactions
- Use horizontal scrolling as primary navigation

✅ **Do:**
- Use flexible units (%, rem, em, fr)
- Prioritize content for mobile views
- Ensure readable text at all sizes
- Design for touch-first interactions
- Use vertical scrolling for content

## Implementation Checklist

When creating a new extension or component:

- [ ] Add viewport meta tag to HTML
- [ ] Test at 768px breakpoint
- [ ] Test at 480px breakpoint
- [ ] Verify touch targets ≥44px
- [ ] Test with browser DevTools device emulation
- [ ] Verify text remains readable
- [ ] Ensure all functionality is accessible on mobile
- [ ] Test keyboard navigation
- [ ] Test with screen readers

## Examples in Codebase

Reference implementations can be found in:

- `apps/better-excel-grid/src/app/app.css`
- `apps/better-logs/src/components/LogPanel.css`
- `apps/better-notification-hub/src/components/NotificationPanel.css`
- `apps/better-tag-manager/src/app/app.css`
- `apps/better-hello-azure/src/app/app.css`

## Resources

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [WCAG Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Azure DevOps Extension Guidelines](https://docs.microsoft.com/en-us/azure/devops/extend/)

## Maintenance

This document should be updated when:
- New breakpoints are introduced
- New design patterns emerge
- Component libraries are updated
- Azure DevOps platform changes affect responsive behavior
