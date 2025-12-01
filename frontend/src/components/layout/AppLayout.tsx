import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store'
import { FileManagerSidebar } from './FileManagerSidebar'
import { AISidebar } from './AISidebar'
import { MainContent } from './MainContent'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const aiSidebarWidth = useAppStore((s) => s.aiSidebarWidth)
  const setAiSidebarWidth = useAppStore((s) => s.setAiSidebarWidth)
  
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = {
      startX: e.clientX,
      startWidth: aiSidebarWidth
    }
    setIsResizing(true)

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = resizeRef.current.startX - e.clientX
      const newWidth = resizeRef.current.startWidth + delta
      setAiSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      resizeRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [aiSidebarWidth, setAiSidebarWidth])

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

        {/* Right Sidebar - AI Assistant (Resizable) */}
        <AnimatePresence mode="wait">
          {rightSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: aiSidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: isResizing ? 0 : 0.2, ease: 'easeInOut' }}
              className="h-full flex-shrink-0 overflow-hidden relative"
            >
              {/* Resize handle */}
              <div
                className={cn(
                  'absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10',
                  'hover:bg-accent/30 transition-colors',
                  isResizing && 'bg-accent/50'
                )}
                onMouseDown={handleResizeStart}
              />
              <AISidebar />
            </motion.aside>
          )}
        </AnimatePresence>
        
        {/* Resize overlay to prevent text selection */}
        {isResizing && (
          <div className="fixed inset-0 z-50 cursor-ew-resize" />
        )}
      </div>
    </TooltipProvider>
  )
}

