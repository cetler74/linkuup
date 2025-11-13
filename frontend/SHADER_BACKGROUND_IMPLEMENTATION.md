# Shader Background Implementation

## Overview
A subtle shader background effect has been implemented for the search page at `http://localhost:5173/search` (or `http://localhost:5174/search` depending on the port configuration).

## Components Created

### 1. ShaderBackground.tsx
- **Location**: `frontend/src/components/common/ShaderBackground.tsx`
- **Type**: Canvas-based animated shader effect
- **Features**:
  - Multiple overlapping radial gradients
  - Animated swirling motion
  - Subtle particle effects
  - Flowing lines for dynamic movement
  - Very low opacity (0.08) for subtlety

### 2. ShaderBackgroundCSS.tsx
- **Location**: `frontend/src/components/common/ShaderBackgroundCSS.tsx`
- **Type**: CSS-only fallback shader effect
- **Features**:
  - CSS gradients and animations
  - SVG noise texture
  - Floating animation
  - Very low opacity (0.05) for subtlety

## Implementation Details

### Colors Used
The shader effect uses very subtle versions of the original shader colors:
- **Blue**: `rgba(18, 117, 216, ...)` - Very subtle blue
- **Orange**: `rgba(225, 145, 54, ...)` - Very subtle orange  
- **Gray**: `rgba(209, 209, 209, ...)` - Very subtle gray

### Opacity Levels
- Canvas shader: 0.08 (very subtle)
- CSS shader: 0.05 (extremely subtle)
- Combined effect provides gentle visual interest without overwhelming content

### Integration
The shader background is integrated into the search route in `App.tsx`:
```tsx
<Route path="/search" element={
  <div className="min-h-screen flex flex-col relative">
    <ShaderBackground opacity={0.08} />
    <ShaderBackgroundCSS opacity={0.05} />
    <div className="relative z-10">
      <Header />
    </div>
    <main className="flex-1 relative z-10">
      <SearchResultsWithImages />
    </main>
    <Footer />
  </div>
} />
```

## Performance Considerations
- Canvas animation uses `requestAnimationFrame` for smooth performance
- Automatic cleanup of event listeners and animation frames
- Responsive design that adapts to window resizing
- CSS fallback ensures compatibility across all browsers

## Customization
The shader effect can be easily customized by adjusting:
- `opacity` prop for overall intensity
- Color values in the gradient definitions
- Animation speed by modifying the `time` increment
- Particle count and size in the canvas implementation

## Browser Support
- Canvas-based shader: Modern browsers with Canvas API support
- CSS-based shader: All browsers (fallback)
- Graceful degradation ensures the page works even if shaders fail to load
