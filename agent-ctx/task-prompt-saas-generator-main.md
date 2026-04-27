# Task: Create Prompt Generator and SaaS Generator features

## Summary
Created two new features for the DataSphere Agents project:

### 1. Prompt Generator (`prompt-generator`)
- **Component**: `/src/components/datasphere/PromptGeneratorView.tsx`
  - Input section with textarea for rough prompt/goal
  - Dropdowns for target (Agent System Prompt, Chat Message, Image Generation, Code Generation), tone (Professional, Creative, Technical, Educational, Friendly), and language (Français, English, Bilingual)
  - Generate button with loading animation
  - Output section with enhanced prompt in formatted card
  - Copy to Clipboard, Apply as Agent Prompt, and Regenerate buttons
  - Version history (last 5 generated prompts)
  - Collapsible tips section with prompt engineering best practices
  - Emerald/teal color theme with framer-motion animations

- **API Endpoint**: `/src/app/api/prompt-generator/route.ts`
  - POST: { prompt, target, tone, language }
  - Uses resolveProvider for AI provider selection
  - Z-AI SDK fallback
  - Returns { enhanced, suggestions }

### 2. SaaS Generator (`saas-generator`)
- **Component**: `/src/components/datasphere/SaasGeneratorView.tsx`
  - Project configuration: name, description, features multi-select, tech stack, database, toggles
  - Full-screen loading overlay with progress indicators
  - Tabbed output: Architecture, Database Schema, API Routes, Components, Setup Guide
  - Syntax-highlighted code blocks with copy buttons
  - Download as text file and Copy All buttons
  - Visual tree of project structure with expandable folders
  - File count, estimated complexity metrics
  - Feature selection grid with 10 options

- **API Endpoint**: `/src/app/api/saas-generator/route.ts`
  - POST: { name, description, features, techStack, database, options }
  - Uses resolveProvider for AI provider selection
  - Z-AI SDK fallback
  - Returns { architecture, schema, routes, components, setupGuide }

### 3. Integration Updates
- **Sidebar.tsx**: Added `Wand2` and `Rocket` icons, `prompt-generator` and `saas-generator` nav items
- **page.tsx**: Imported and added switch cases for both new views
- **MobileNav.tsx**: Added both view IDs to the "More" navigation arrays

## Files Modified
- `src/components/datasphere/Sidebar.tsx` - Added nav items and icon imports
- `src/app/page.tsx` - Added imports and switch cases
- `src/components/datasphere/MobileNav.tsx` - Added view IDs to arrays

## Files Created
- `src/components/datasphere/PromptGeneratorView.tsx`
- `src/components/datasphere/SaasGeneratorView.tsx`
- `src/app/api/prompt-generator/route.ts`
- `src/app/api/saas-generator/route.ts`
