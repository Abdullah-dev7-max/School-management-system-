import { useEffect, useState } from 'react'
import { Check, Save } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { useRole } from '../context/RoleContext.jsx'
import { fetchInstituteSettings, saveInstituteSettings } from '../lib/api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError } from '../components/admin/ManagementUi.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'

export default function Settings() {
  const { profile, updateProfileName } = useRole()
  const settingsQuery = useAsync(fetchInstituteSettings, [], ['institute_settings'])
  const [settings, setSettings] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!settingsQuery.data) return
    setSettings({
      fullName: profile.full_name,
      schoolName: settingsQuery.data.school_name,
      address: settingsQuery.data.address ?? '',
      contactEmail: settingsQuery.data.contact_email,
      academicYear: settingsQuery.data.academic_year,
    })
  }, [settingsQuery.data, profile.full_name])

  const change = (event) => {
    setSettings((current) => ({ ...current, [event.target.name]: event.target.value }))
    setMessage('')
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!settings?.fullName.trim()) {
      setError('Enter your full name.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateProfileName(settings.fullName)
      await saveInstituteSettings(settings)
      setMessage('Settings saved.')
      await settingsQuery.reload()
    } catch (saveError) {
      setError(saveError.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (settingsQuery.error) return <ManagementError error={settingsQuery.error} onRetry={settingsQuery.reload} />
  if (settingsQuery.loading || !settingsQuery.data || !settings) return <LoadingScreen label="Loading institute settings" />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Settings" description="Manage the administrator profile and institute information." />
      </GlassCard>
      <GlassCard className="max-w-3xl p-5 sm:p-6">
        <h2 className="text-base font-semibold">Institute information</h2>
        <p className="mt-1 text-sm text-ink/55">These settings are stored in the institute database.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Administrator full name" name="fullName" value={settings.fullName} onChange={change} maxLength={160} required />
            <Field label="School name" name="schoolName" value={settings.schoolName} onChange={change} maxLength={160} required />
            <label className="block text-sm font-medium">Address
              <textarea name="address" value={settings.address} onChange={change} maxLength={500} rows={3} className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email" type="email" name="contactEmail" value={settings.contactEmail} onChange={change} maxLength={255} required />
              <Field label="Academic year" name="academicYear" value={settings.academicYear} onChange={change} maxLength={20} required />
            </div>
            <FormError>{error}</FormError>
            {message && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>}
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className={`${FORM_BUTTON} bg-night-900 text-white`}>
                <Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
        </form>
      </GlassCard>
    </div>
  )
}
