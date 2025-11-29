import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Paperclip, Mic, Loader2, User, Bot } from 'lucide-react'
import { useAppStore, useAnalysisContext } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

export function AISidebar() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const messages = useAppStore((s) => s.chatMessages)
  const loading = useAppStore((s) => s.chatLoading)
  const addMessage = useAppStore((s) => s.addChatMessage)
  const setLoading = useAppStore((s) => s.setChatLoading)
  const analysisContext = useAnalysisContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message
    addMessage({ role: 'user', content: userMessage })
    setLoading(true)

    try {
      // Mock AI response - replace with actual API call
      await new Promise((r) => setTimeout(r, 1500))
      
      let response = 'I am AI assistant. '
      
      if (analysisContext && analysisContext.type) {
        response += `I see ${analysisContext.type.toUpperCase()} analysis results for file "${analysisContext.filename}". `
        
        if (analysisContext.type === 'anova' && 'summary' in analysisContext.results) {
          const summary = analysisContext.results.summary as { benjaminiSignificant: number; totalVariables: number }
          response += `Found ${summary.benjaminiSignificant} significant variables out of ${summary.totalVariables} (by Benjamini-Hochberg). `
        }
        
        response += 'Ask me about the results!'
      } else {
        response += 'Upload a file and run analysis so I can help interpret the results.'
      }

      addMessage({ role: 'assistant', content: response })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: 'An error occurred. Please try again later.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full bg-surface-raised border-l border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="p-1.5 rounded bg-accent/10">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <span className="font-semibold text-text-primary">{t('ai.title')}</span>
        {analysisContext && analysisContext.type && (
          <span className="ml-auto text-2xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
            {analysisContext.type.toUpperCase()}
          </span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState hasContext={!!analysisContext} />
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-text-muted"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('app.loading')}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai.placeholder')}
            disabled={loading}
            className={cn(
              'w-full h-10 pl-4 pr-24 rounded-lg text-sm',
              'bg-surface border border-border text-text-primary',
              'placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
              'disabled:opacity-50'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 hover:bg-surface-overlay rounded transition-colors"
            >
              <Paperclip className="h-4 w-4 text-text-muted" />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-surface-overlay rounded transition-colors"
            >
              <Mic className="h-4 w-4 text-text-muted" />
            </button>
            <Button
              type="submit"
              size="icon-sm"
              disabled={!input.trim() || loading}
              className="ml-1"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function EmptyState({ hasContext }: { hasContext: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-accent" />
      </div>
      <h3 className="font-semibold text-text-primary mb-2">{t('ai.title')}</h3>
      <p className="text-sm text-text-secondary max-w-[240px] mx-auto">
        {hasContext ? t('ai.hint') : t('ai.noAnalysis')}
      </p>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-accent/10' : 'bg-surface-overlay'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-accent" />
        ) : (
          <Bot className="h-4 w-4 text-text-secondary" />
        )}
      </div>
      <div
        className={cn(
          'flex-1 px-3 py-2 rounded-lg text-sm',
          isUser
            ? 'bg-accent text-surface-raised'
            : 'bg-surface-overlay text-text-primary'
        )}
      >
        {message.content}
      </div>
    </motion.div>
  )
}
