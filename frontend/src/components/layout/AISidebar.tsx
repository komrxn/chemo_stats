import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Paperclip, Mic, MicOff, Loader2, User, Bot,
  X, FileText, AlertCircle, CheckCircle2
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
  attachments?: { name: string; type: string; imageData?: string; variableName?: string }[]
}

export function AISidebar() {
  const { t } = useTranslation()
  const activeTable = useActiveTable()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [imageAttachments, setImageAttachments] = useState<{ data: string; name: string; variableName?: string }[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [hasContext, setHasContext] = useState(false)
  const [contextType, setContextType] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const pendingAttachment = useAppStore((s) => s.pendingAttachment)
  const setPendingAttachment = useAppStore((s) => s.setPendingAttachment)

  const fileId = activeTable?.id || 'default'
  const fileName = activeTable?.name || 'No file'

  // Handle boxplot attachment from store
  useEffect(() => {
    if (pendingAttachment?.type === 'image') {
      // Add to array (max 10)
      setImageAttachments(prev => {
        if (prev.length >= 10) return prev
        return [...prev, {
          data: pendingAttachment.data,
          name: pendingAttachment.name,
          variableName: pendingAttachment.variableName,
        }]
      })
      setPendingAttachment(null)
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
    if ((!input.trim() && !attachment && imageAttachments.length === 0) || loading) return

    const userMessage = input.trim()
    setInput('')

    // Build message content
    let messageContent = userMessage
    const firstImage = imageAttachments[0]
    if (!messageContent && firstImage) {
      messageContent = `[Boxplot: ${firstImage.variableName || firstImage.name}]`
    } else if (!messageContent && attachment) {
      messageContent = `[Attached: ${attachment.name}]`
    }

    // Add context about images if present
    if (imageAttachments.length > 0 && userMessage) {
      const varNames = imageAttachments.map(img => img.variableName || img.name).join(', ')
      messageContent = `[Re: ${varNames}] ${userMessage}`
    }

    // Add user message
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      attachment: attachment
        ? { name: attachment.name, type: attachment.type }
        : undefined,
      attachments: imageAttachments.map(img => ({
        name: img.name,
        type: 'image/png',
        imageData: img.data,
        variableName: img.variableName
      }))
    }
    setMessages(prev => [...prev, newUserMsg])

    const currentImages = [...imageAttachments]
    setAttachment(null)
    setImageAttachments([])
    setLoading(true)

    try {
      // Include image context in message to AI
      let aiMessage = userMessage
      if (currentImages.length > 0 && currentImages[0]?.variableName) {
        const varNames = currentImages.map(img => img.variableName).filter(Boolean).join(', ')
        aiMessage = `[User is asking about boxplots for variables: "${varNames}"] ${userMessage || 'Please analyze these boxplots.'}`
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
    if (!file) return

    // Check if it's an image - add to array
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageAttachments(prev => {
          if (prev.length >= 10) return prev
          return [...prev, {
            data: reader.result as string,
            name: file.name,
          }]
        })
      }
      reader.readAsDataURL(file)
    } else {
      // Handle as regular file attachment
      setAttachment(file)
    }
  }

  return (
    <div className="h-full w-full bg-surface-raised border-l border-border flex flex-col">
      {/* Header */}
      <div className="w-full px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <div className="p-1.5 rounded bg-accent/10">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <span className="font-semibold text-text-primary truncate">{t('ai.title')}</span>

        {hasContext && (
          <span className="ml-auto text-2xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            {contextType?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 w-full min-h-0" ref={scrollRef}>
        <div className="w-full max-w-full p-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState hasContext={hasContext} />
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onImageClick={(src) => setPreviewImage(src)}
                />
              ))}    </AnimatePresence>
          )}
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
        </div>
      </ScrollArea>

      {/* ChatGPT-style Attachment Preview Bar */}
      {(attachment || imageAttachments.length > 0) && (
        <div className="px-4 pb-3 pt-2 border-t border-border">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Document attachment chip */}
            {attachment && (
              <div
                className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-xl"
                style={{ maxWidth: '200px' }}
              >
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {attachment.name}
                  </p>
                  <p className="text-2xs text-text-muted">
                    {attachment.type?.split('/')[1]?.toUpperCase() || 'File'}
                  </p>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1 hover:bg-surface-overlay rounded-full flex-shrink-0"
                >
                  <X className="h-3 w-3 text-text-muted hover:text-text-primary" />
                </button>
              </div>
            )}

            {/* Image/Boxplot thumbnails - now shows ALL */}
            {imageAttachments.map((img, index) => (
              <div
                key={index}
                className="relative group rounded-xl overflow-hidden border border-border cursor-pointer"
                style={{ width: '80px', height: '60px' }}
                onClick={() => setPreviewImage(img.data)}
              >
                <img
                  src={img.data}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setImageAttachments(prev => prev.filter((_, i) => i !== index))
                  }}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
                {img.variableName && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <p className="text-2xs text-white truncate text-center">
                      {img.variableName}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex-shrink-0">
        <div className="relative">
          <textarea
            ref={(el) => {
              if (el) {
                // Auto-resize textarea
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }
            }}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInput(e.target.value)
              // Auto-resize on change
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => {
              // Submit on Enter (without Shift)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder={t('ai.placeholder')}
            disabled={loading}
            rows={1}
            style={{
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE
            } as React.CSSProperties}
            className={cn(
              'w-full min-h-[40px] max-h-[120px] pl-4 pr-28 py-2.5 rounded-lg text-sm resize-none',
              'bg-surface border border-border text-text-primary',
              'placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
              'disabled:opacity-50',
              '[&::-webkit-scrollbar]:hidden' // Chrome, Safari
            )}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* File attachment (includes images) */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.csv,.xlsx,.xls,.txt,.pdf"
            />
            <button
              type="button"
              className={cn(
                'p-1.5 rounded transition-colors',
                (attachment || imageAttachments.length > 0)
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-surface-overlay text-text-muted'
              )}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file or image"
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
              disabled={(!input.trim() && !attachment && imageAttachments.length === 0) || loading}
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

function MessageBubble({ message, onImageClick }: { message: ChatMessage; onImageClick: (src: string) => void }) {
  const isUser = message.role === 'user'

  // Combine legacy single attachment with new array if needed
  const images = message.attachments ||
    (message.attachment?.imageData ? [{
      name: message.attachment.name,
      imageData: message.attachment.imageData,
      type: 'image/png'
    }] : [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex gap-2', isUser && 'flex-row-reverse')}
      style={{
        width: '100%',
        maxWidth: '100%',
        contain: 'layout'
      }}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center',
          isUser ? 'bg-accent/10' : 'bg-surface-overlay'
        )}
        style={{ flexShrink: 0 }}
      >
        {isUser ? (
          <User className="h-4 w-4 text-accent" />
        ) : (
          <Bot className="h-4 w-4 text-text-secondary" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'rounded-lg text-sm',
          isUser
            ? 'bg-accent text-gray-900'
            : 'bg-surface-overlay text-text-primary'
        )}
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          maxWidth: 'calc(100% - 36px)',
          overflow: 'hidden',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}
      >
        {/* Images Grid */}
        {images.length > 0 && (
          <div style={{
            width: '100%',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '2px'
          }}>
            {images.map((img, i) => (
              <div
                key={i}
                className="cursor-pointer hover:opacity-90 transition-opacity relative group"
                onClick={() => img.imageData && onImageClick(img.imageData)}
                style={{ aspectRatio: images.length === 1 ? 'auto' : '1' }}
              >
                <img
                  src={img.imageData}
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: images.length === 1 ? '300px' : 'none',
                    objectFit: images.length === 1 ? 'contain' : 'cover',
                    background: 'rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ width: '100%', padding: '8px 12px', overflow: 'hidden' }}>
          {/* File attachment badge (non-image) */}
          {message.attachment && !message.attachment.imageData && (
            <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
              <FileText className="h-3 w-3" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.attachment.name}
              </span>
            </div>
          )}

          {/* Message content - only show if there is text or if it's not just an image wrapper */}
          {(message.content || (!message.attachment && images.length === 0)) && (
            <MarkdownContent content={message.content} isUser={isUser} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const parseMarkdown = (text: string) => {
    // Code blocks
    text = text.replace(
      /```([\s\S]*?)```/g,
      '<pre style="background:#1a1d23;border-left:2px solid #2dd4bf;padding:12px;border-radius:6px;margin:8px 0;font-size:11px;overflow-x:auto;font-family:monospace;color:#2dd4bf;white-space:pre-wrap;word-break:break-all"><code>$1</code></pre>'
    )

    // Headers
    text = text.replace(/^### (.*?)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px">$1</h3>')
    text = text.replace(/^## (.*?)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">$1</h2>')
    text = text.replace(/^# (.*?)$/gm, '<h1 style="font-size:18px;font-weight:700;margin:16px 0 12px">$1</h1>')

    // Bold & italic
    text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
    text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>')

    // Inline code
    text = text.replace(
      /`([^`]+?)`/g,
      '<code style="background:rgba(45,212,191,0.1);color:#2dd4bf;padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace;border:1px solid rgba(45,212,191,0.2)">$1</code>'
    )

    // Lists
    text = text.replace(/^\d+\. (.*?)$/gm, '<li style="margin-left:16px">$1</li>')
    text = text.replace(/^- (.*?)$/gm, '<li style="margin-left:16px">$1</li>')
    text = text.replace(/(<li.*<\/li>\n?)+/g, '<ul style="list-style:disc;margin:8px 0 8px 16px">$&</ul>')

    // Line breaks
    text = text.replace(/\n\n/g, '</p><p style="margin:8px 0">')
    text = text.replace(/\n/g, '<br/>')

    if (!text.startsWith('<')) {
      text = '<p style="margin:8px 0">' + text + '</p>'
    }

    return text
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        fontSize: '13px',
        color: isUser ? '#111827' : '#94a3b8'
      }}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  )
}
