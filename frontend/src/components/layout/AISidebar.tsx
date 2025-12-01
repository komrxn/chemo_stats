import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Send, Paperclip, Mic, MicOff, Loader2, User, Bot, 
  X, FileText, AlertCircle, CheckCircle2, Image as ImageIcon
} from 'lucide-react'
import { useActiveTable, useAppStore } from '@/store'
import { useTranslation } from '@/lib/i18n'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachment?: { name: string; type: string; imageData?: string }
}

export function AISidebar() {
  const { t } = useTranslation()
  const activeTable = useActiveTable()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [imageAttachment, setImageAttachment] = useState<{ data: string; name: string; variableName?: string } | null>(null)
  const [hasContext, setHasContext] = useState(false)
  const [contextType, setContextType] = useState<string | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const pendingAttachment = useAppStore((s) => s.pendingAttachment)
  const setPendingAttachment = useAppStore((s) => s.setPendingAttachment)
  
  const fileId = activeTable?.id || 'default'
  const fileName = activeTable?.name || 'No file'
  
  // Handle boxplot attachment from store
  useEffect(() => {
    if (pendingAttachment?.type === 'image') {
      setImageAttachment({
        data: pendingAttachment.data,
        name: pendingAttachment.name,
        variableName: pendingAttachment.variableName,
      })
      setPendingAttachment(null) // Clear from store
    }
  }, [pendingAttachment, setPendingAttachment])

  // Load chat history when file changes
  useEffect(() => {
    if (activeTable?.id) {
      loadHistory()
    } else {
      setMessages([])
      setHasContext(false)
      setContextType(null)
    }
  }, [activeTable?.id])

  // Store context when analysis completes
  useEffect(() => {
    if (activeTable?.analysis?.results && activeTable.id) {
      storeContext()
    }
  }, [activeTable?.analysis?.results])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory(fileId)
      setMessages(data.history.map((m, i) => ({
        id: `${i}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date()
      })))
      setHasContext(data.has_context)
      setContextType(data.context_type)
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }

  const storeContext = async () => {
    if (!activeTable?.analysis?.results || !activeTable.id || !activeTable.analysis.method) return
    
    try {
      await api.storeAnalysisContext(
        activeTable.id,
        activeTable.analysis.method,
        activeTable.analysis.results
      )
      setHasContext(true)
      setContextType(activeTable.analysis.method)
    } catch (e) {
      console.error('Failed to store context:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !attachment && !imageAttachment) || loading) return

    const userMessage = input.trim()
    setInput('')
    
    // Build message content
    let messageContent = userMessage
    if (!messageContent && imageAttachment) {
      messageContent = `[Boxplot: ${imageAttachment.variableName || imageAttachment.name}]`
    } else if (!messageContent && attachment) {
      messageContent = `[Attached: ${attachment.name}]`
    }
    
    // Add context about the image if present
    if (imageAttachment && userMessage) {
      messageContent = `[Re: ${imageAttachment.variableName} boxplot] ${userMessage}`
    }
    
    // Add user message
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      attachment: imageAttachment 
        ? { name: imageAttachment.name, type: 'image/png', imageData: imageAttachment.data }
        : attachment 
          ? { name: attachment.name, type: attachment.type } 
          : undefined
    }
    setMessages(prev => [...prev, newUserMsg])
    
    const currentImageAttachment = imageAttachment
    setAttachment(null)
    setImageAttachment(null)
    setLoading(true)

    try {
      // Include image context in message to AI
      let aiMessage = userMessage
      if (currentImageAttachment?.variableName) {
        aiMessage = `[User is asking about the boxplot for variable "${currentImageAttachment.variableName}"] ${userMessage || 'Please analyze this boxplot.'}`
      }
      
      const response = await api.chat(fileId, aiMessage, fileName)
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        
        // Transcribe
        setLoading(true)
        try {
          const result = await api.transcribeAudio(audioBlob)
          setInput(prev => prev + (prev ? ' ' : '') + result.text)
        } catch (e) {
          console.error('Transcription failed:', e)
        } finally {
          setLoading(false)
        }
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (e) {
      console.error('Failed to start recording:', e)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachment(file)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageAttachment({
          data: reader.result as string,
          name: file.name,
        })
      }
      reader.readAsDataURL(file)
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
        
        {hasContext && (
          <span className="ml-auto text-2xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {contextType?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState hasContext={hasContext} />
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

      {/* Image attachment preview */}
      {imageAttachment && (
        <div className="px-4 pb-2">
          <div className="relative bg-surface-overlay rounded-lg overflow-hidden">
            <img 
              src={imageAttachment.data} 
              alt={imageAttachment.name}
              className="w-full h-32 object-contain bg-surface"
            />
            <div className="absolute top-2 right-2">
              <button 
                onClick={() => setImageAttachment(null)}
                className="p-1 bg-surface/80 rounded-full hover:bg-surface"
              >
                <X className="h-4 w-4 text-text-muted hover:text-text-primary" />
              </button>
            </div>
            <div className="px-3 py-2 flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-accent" />
              <span className="flex-1 truncate text-text-secondary">
                {imageAttachment.variableName || imageAttachment.name}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* File attachment preview */}
      {attachment && !imageAttachment && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-overlay rounded-lg text-sm">
            <FileText className="h-4 w-4 text-accent" />
            <span className="flex-1 truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)}>
              <X className="h-4 w-4 text-text-muted hover:text-text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={t('ai.placeholder')}
            disabled={loading}
            className={cn(
              'w-full h-10 pl-4 pr-28 rounded-lg text-sm',
              'bg-surface border border-border text-text-primary',
              'placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
              'disabled:opacity-50'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Image attachment */}
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              onChange={handleImageSelect}
              accept="image/*"
            />
            <button
              type="button"
              className={cn(
                'p-1.5 rounded transition-colors',
                imageAttachment 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-surface-overlay text-text-muted'
              )}
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            
            {/* File attachment */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.txt,.pdf"
            />
            <button
              type="button"
              className={cn(
                'p-1.5 rounded transition-colors',
                attachment 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-surface-overlay text-text-muted'
              )}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            
            {/* Voice recording */}
            <button
              type="button"
              className={cn(
                'p-1.5 rounded transition-colors',
                recording 
                  ? 'bg-error/20 text-error animate-pulse' 
                  : 'hover:bg-surface-overlay text-text-muted'
              )}
              onClick={recording ? stopRecording : startRecording}
              title="Voice input"
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            
            {/* Send */}
            <Button
              type="submit"
              size="icon-sm"
              disabled={(!input.trim() && !attachment && !imageAttachment) || loading}
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
      
      {hasContext ? (
        <div className="space-y-2">
          <p className="text-sm text-success flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Analysis loaded
          </p>
          <p className="text-sm text-text-secondary max-w-[240px] mx-auto">
            {t('ai.hint')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-text-muted flex items-center justify-center gap-1">
            <AlertCircle className="h-4 w-4" />
            No analysis context
          </p>
          <p className="text-sm text-text-secondary max-w-[240px] mx-auto">
            {t('ai.noAnalysis')}
          </p>
        </div>
      )}
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
          'flex-1 rounded-lg text-sm overflow-hidden',
          isUser
            ? 'bg-accent text-surface-raised'
            : 'bg-surface-overlay text-text-primary'
        )}
      >
        {/* Image attachment */}
        {message.attachment?.imageData && (
          <div className="w-full">
            <img 
              src={message.attachment.imageData} 
              alt={message.attachment.name}
              className="w-full h-auto max-h-48 object-contain bg-surface"
            />
          </div>
        )}
        
        <div className="px-3 py-2">
          {/* File attachment badge (non-image) */}
          {message.attachment && !message.attachment.imageData && (
            <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
              <FileText className="h-3 w-3" />
              {message.attachment.name}
            </div>
          )}
          
          {/* Message content with markdown */}
          <MarkdownContent content={message.content} />
        </div>
      </div>
    </motion.div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown parsing
  const parseMarkdown = (text: string) => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre class="bg-surface/50 p-2 rounded my-2 text-xs overflow-x-auto"><code>$1</code></pre>')
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code class="bg-surface/30 px-1 rounded text-xs">$1</code>')
    // Lists
    text = text.replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>')
    text = text.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
    // Line breaks
    text = text.replace(/\n/g, '<br/>')
    
    return text
  }

  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  )
}
