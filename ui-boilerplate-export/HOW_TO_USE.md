# UI/UX Dashboard Boilerplate

This boilerplate contains the pure UI/UX shell of the dashboard. It features a responsive sidebar, a top navigation bar, and a fully functional light/dark theme toggle, all stripped of any domain-specific business logic.

## 🚀 Setup Instructions

1. **Install Dependencies**
   Copy the dependencies from `dependencies.json` or run the following command in your new Next.js project:
   ```bash
   npm install lucide-react next-themes
   npm install -D tailwindcss @tailwindcss/postcss @tailwindcss/typography postcss
   ```

2. **Copy Files**
   - Copy the `components/` folder into your new project (e.g., `src/components/`).
   - Copy `styles/globals.css` to your global styles location (e.g., `src/app/globals.css`).
   - Copy `config/tailwind.config.ts` to your project root if you are using standard Tailwind config, or adjust accordingly if you are using Tailwind v4 inline `@theme`.

3. **Wrap Your Application**
   In your main `layout.tsx` (`src/app/layout.tsx`), set up the `ThemeProvider` and the `AppLayout`:

   ```tsx
   import type { Metadata } from 'next';
   import '../styles/globals.css';
   import { ThemeProvider } from '@/components/ThemeProvider';
   import AppLayout from '@/components/layout';

   export const metadata: Metadata = {
     title: 'My App',
     description: 'App description',
   };

   export default function RootLayout({
     children,
   }: Readonly<{
     children: React.ReactNode;
   }>) {
     return (
       <html lang="en" suppressHydrationWarning>
         <body className="antialiased" suppressHydrationWarning>
           <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
             <AppLayout>
               {children}
             </AppLayout>
           </ThemeProvider>
         </body>
       </html>
     );
   }
   ```

4. **Customize Navigation**
   - Open `components/Sidebar.tsx` and modify the `NAV_ITEM_DEFS` array to include your own routes and icons.

Enjoy your beautiful UI shell!
