import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface UnsavedChangesDialogProps {
    open: boolean
    onDiscard: () => void
    onContinue: () => void
}

export function UnsavedChangesDialog({ open, onDiscard, onContinue }: UnsavedChangesDialogProps) {
    const { t } = useTranslation()

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onContinue()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        {t('data.unsavedChanges')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('data.unsavedChangesDesc')}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onDiscard}
                    >
                        {t('data.discardChanges')}
                    </Button>
                    <Button
                        variant="default"
                        onClick={onContinue}
                    >
                        {t('data.continueEditing')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
