---
Task ID: 1
Agent: Main Agent
Task: Comprehensive DataSphere Agents upgrade - Bug fixes, agent improvements, design, mobile, security, new features

Work Log:
- Fixed image button hardcoding - now opens a dialog for user to describe the image they want
- Fixed mic button - now shows "Entrée vocale bientôt disponible" toast and visible on mobile
- Fixed social login buttons - show toast notifications for coming soon
- Fixed forgot password button - shows toast notification
- Improved ChatView with auto-resizing textarea and Ctrl+Enter to send
- Enhanced all agent system prompts (support, finance, data, sales, webbuilder, image, custom)
- Enhanced TOOL_SYSTEM_SUFFIX with better formatting rules and French guidance
- Improved RAG context for data/finance/support agents with smart chunking
- Added webbuilder and image agent types to execution agents
- Reduced conversation history from 20 to 10 messages
- Added agent-type-based temperature and max_tokens
- Improved MobileNav with Web Builder tab and haptic feedback
- Improved ChatView mobile padding and touch scrolling
- Improved DashboardView with 2-column mobile stats and horizontal scroll agents
- Improved LoginView with responsive social buttons
- Created security.ts with rate limiting, input sanitization, email/password validation
- Added rate limiting to login (5/min), register (3/min), and chat-stream (20/min) routes
- Added input validation and sanitization to auth and chat routes
- Improved Sidebar with gradient line, notification bell popover, tooltips when collapsed
- Improved DashboardView with Raccourcis section, gradient stat cards, recent activity
- Improved AgentsView with category tabs, popular badge, better hover animations
- Added premium CSS utilities (card-hover, status-dot, shimmer-loading, focus-ring)
- Improved SettingsView with connection status dots, test connection button, avatar
- Created MarketplaceView with search, filters, rating, install, publish features
- Added notification bell with popover and auto-polling in Sidebar
- Added Marketplace to navigation (Sidebar + page.tsx route)
- Updated MobileNav to highlight marketplace and other sub-views in "Plus" tab

Stage Summary:
- All 6 major areas addressed: bug fixes, agent improvements, design, mobile, security, new features
- MarketplaceView fully implemented with CRUD operations
- Security layer added with rate limiting and input validation
- All agent types now have detailed, professional system prompts
- Professional UI with gradients, animations, glassmorphism
- Full mobile responsiveness with haptic feedback
