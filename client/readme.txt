# Create the project
npm create vite@latest frontend -- --template react-ts


# Install Professional Tooling
npm install @reduxjs/toolkit react-redux react-router-dom axios lucide-react
npm install react-hook-form @hookform/resolvers zod
npm install tailwindcss @tailwindcss/vite   #works with vite7
npm install @tanstack/react-query @tanstack/react-query-devtools axios


# folder structure 
src/
├── assets/            # Static files (images, svgs, global icons)
├── components/        # Shared "Atomic" UI components (Button, Input, Modal)
├── config/            # Environment variables and global constants
├── hooks/             # Global reusable hooks (useDebounce, useLocalStorage)
├── layouts/           # Page wrappers (MainLayout, AuthLayout, DashboardLayout)
├── pages/             # Route components (Home.tsx, Login.tsx) - Minimal logic!
├── services/          # Global API clients (Axios instance, base RTK Query)
├── store/             # Redux Toolkit store configuration
├── types/             # Global/Shared TypeScript types
└── utils/             # Helper functions (formatDate, validation logic)


# return of register from react hook form    
{
  name: string,      // The field name you registered
  ref: fn             // Ref callback to register the input with RHF
  onChange: fn,       // Event handler for input changes
  onBlur: fn,         // Event handler for input blur/focus loss
}

# commands
npm run dev -- --host