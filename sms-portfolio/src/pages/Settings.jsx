import { useState } from 'react'
import { Check, Save } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FORM_BUTTON, FormError } from '../components/admin/ManagementUi.jsx'

const STORAGE_KEY = 'scholara.school-settings'
const DEFAULTS = {
  schoolName: '',
  address: '',
  contactEmail: '',
  academicYear: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`,
}

function loadSettings() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(loadSettings)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...settings,
        schoolName: settings.schoolName.trim(),
        address: settings.address.trim(),
        contactEmail: settings.contactEmail.trim(),
        academicYear: settings.academicYear.trim(),
      }))
      setMessage('School settings saved in this browser.')
      setError('')
    } catch (saveError) {
      setMessage('')
      setError(saveError.message || 'Could not save settings in this browser.')
    }
  }

  const change = (event) => {
    setSettings((current) => ({ ...current, [event.target.name]: event.target.value }))
    setMessage('')
    setError('')
  }

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Settings" description="Manage school information and the active academic year." />
      </GlassCard>
      <GlassCard className="max-w-3xl p-5 sm:p-6">
        <h2 className="text-base font-semibold">General school information</h2>
        <p className="mt-1 text-sm text-ink/55">Settings are stored locally in this browser and are not shared across devices.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="School name" name="schoolName" value={settings.schoolName} onChange={change} maxLength={160} required />
          <label className="block text-sm font-medium">Address
            <textarea name="address" value={settings.address} onChange={change} maxLength={500} rows={3} className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" type="email" name="contactEmail" value={settings.contactEmail} onChange={change} maxLength={255} required />
            <Field label="Academic year" name="academicYear" value={settings.academicYear} onChange={change} placeholder="2026-27" maxLength={20} required />
          </div>
          <FormError>{error}</FormError>
          {message && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>}
          <div className="flex justify-end pt-2">
            <button type="submit" className={`${FORM_BUTTON} bg-night-900 text-white`}><Save className="mr-2 h-4 w-4" />Save settings</button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
