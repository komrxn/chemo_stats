import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store'
import { FileManagerSidebar } from './FileManagerSidebar'
import { AISidebar } from './AISidebar'
import { MainContent } from './MainContent'
import { TooltipProvider } from '@/components/ui/Tooltip'

export function AppLayout() {
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-screen overflow-hidden bg-surface flex">
        {/* Left Sidebar - File Manager */}
        <AnimatePresence mode="wait">
          {leftSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full flex-shrink-0 overflow-hidden"
            >
              <FileManagerSidebar />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
          <MainContent />
        </main>

        {/* Right Sidebar - AI Assistant */}
        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full flex-shrink-0 overflow-hidden"
            >
              <AISidebar />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}

