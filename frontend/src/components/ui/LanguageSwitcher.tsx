import { Globe } from 'lucide-react'
import { useTranslation, languages, type Language } from '@/lib/i18n'
import { Button } from './Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select'

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()

  return (
    <Select value={language} onValueChange={(v: string) => setLanguage(v as Language)}>
      <SelectTrigger className="w-auto h-8 gap-1.5 px-2 bg-transparent border-0">
        <Globe className="h-4 w-4 text-text-muted" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.native}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Compact version - cycle through languages
export function LanguageToggle() {
  const { language, setLanguage } = useTranslation()

  const cycle = () => {
    const order: Language[] = ['en', 'ru', 'uz']
    const idx = order.indexOf(language)
    const next = order[(idx + 1) % order.length]
    setLanguage(next)
  }

  const currentLang = languages.find(l => l.value === language)

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className="h-8 px-2 gap-1.5 text-text-secondary hover:text-text-primary"
      title="Switch language"
    >
      <span className="text-sm">{currentLang?.flag}</span>
      <span className="text-xs font-medium uppercase">{language}</span>
    </Button>
  )
}
