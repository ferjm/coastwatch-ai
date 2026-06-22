import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { inviteErrorKey, type AppRole } from '@/lib/invitations'
import { UserPlus } from 'lucide-react'

interface InviteUserDialogProps {
  onInvited: () => void
}

export function InviteUserDialog({ onInvited }: InviteUserDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AppRole>('viewer')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setEmail('')
    setFullName('')
    setRole('viewer')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role, origin: window.location.origin },
      })
      if (error) {
        const status = (error as { context?: { status?: number } })?.context?.status
        toast({
          title: t('error'),
          description: t(inviteErrorKey(status)),
          variant: 'destructive',
        })
        return
      }
      if (data?.warning) {
        toast({ title: t('inviteSuccess'), description: t('inviteWarningRoleNotSet') })
      } else {
        toast({ title: t('inviteSuccess'), description: t('inviteSuccessDescription') })
      }
      reset()
      setOpen(false)
      onInvited()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('inviteUser')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteUserTitle')}</DialogTitle>
          <DialogDescription>{t('inviteUserDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t('email')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">{t('fullName')}</Label>
            <Input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{t('viewer')}</SelectItem>
                <SelectItem value="researcher">{t('researcher')}</SelectItem>
                <SelectItem value="admin">{t('administrator')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('sendingInvite') : t('sendInvite')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
