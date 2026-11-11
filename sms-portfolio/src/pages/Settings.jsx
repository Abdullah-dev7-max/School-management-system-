import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, Clock3, Info, LoaderCircle, MailCheck, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { useRole } from '../context/RoleContext.jsx'
import { approveAdminAccessRequest, fetchAdminAccessRequests, fetchInstituteSettings, saveInstituteSettings } from '../lib/api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError } from '../components/admin/ManagementUi.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'

function Feedback({ error, message }) {
  if (error) return <FormError>{error}</FormError>
  if (message) {
    return <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>
  }
  return null
}

function AdminAccessRequests() {
  const requestsQuery = useAsync(fetchAdminAccessRequests, [], ['users'])
  const { signOut } = useRole()
  const navigate = useNavigate()
  const [approvingId, setApprovingId] = useState(null)
  const [error, setError] = useState('')

  const approve = async (request) => {
    const confirmed = window.confirm(
      `Approve ${request.full_name} (${request.email}) and transfer Admin access? Your current Admin access will be revoked and you will be signed out.`
    )
    if (!confirmed) return

    setApprovingId(request.id)
    setError('')
    try {
      const result = await approveAdminAccessRequest(request.id)
      const notice = result.emailSent
        ? `Admin access was transferred to ${request.email}. An approval email was sent.`
        : `Admin access was transferred to ${request.email}, but the approval email could not be sent. Configure the approval email sender; the new Admin can still sign in.`
      try {
        await signOut()
      } catch (signOutError) {
        setError(`Access was transferred, but sign-out failed. Your Admin access is revoked; reload this page or return to login. ${signOutError.message}`)
        return
      }
      navigate('/login', { replace: true, state: { notice } })
    } catch (approvalError) {
      setError(approvalError.message || 'Could not transfer Admin access.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Admin access requests</h2>
          <p className="text-sm text-ink/55">Review the applicant and confirm their email before granting access.</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Approving a request transfers the single active Admin seat to that person. Your Admin access will be revoked.
      </div>

      {requestsQuery.error && <FormError>{requestsQuery.error.message}</FormError>}
      {error && <FormError>{error}</FormError>}
      {requestsQuery.loading && <p className="text-sm text-ink/55">Loading requests…</p>}
      {!requestsQuery.loading && !requestsQuery.error && requestsQuery.data?.length === 0 && (
        <p className="text-sm text-ink/55">There are no pending Admin requests.</p>
      )}

      <div className="space-y-3">
        {requestsQuery.data?.map((request) => (
          <article key={request.id} className="rounded-2xl border border-ink/10 bg-white/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{request.full_name}</p>
                <p className="break-all text-sm text-ink/65">{request.email}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50">
                  <Clock3 className="h-3.5 w-3.5" />
                  Requested {new Date(request.created_at).toLocaleString()}
                </p>
                <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${request.email_confirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <MailCheck className="h-4 w-4" />
                  {request.email_confirmed ? 'Email confirmed' : 'Waiting for email confirmation'}
                </p>
              </div>
              <button
                type="button"
                disabled={!request.email_confirmed || approvingId !== null}
                onClick={() => approve(request)}
                className={`${FORM_BUTTON} shrink-0 bg-night-900 text-white`}
              >
                {approvingId === request.id
                  ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Transferring…</>
                  : 'Approve & transfer access'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </GlassCard>
  )
}

export default function Settings() {
  const { profile, updateProfileName } = useRole()
  const settingsQuery = useAsync(fetchInstituteSettings, [], ['institute_settings'])
  const [adminName, setAdminName] = useState(profile.full_name)
  const [school, setSchool] = useState(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [schoolMessage, setSchoolMessage] = useState('')
  const [schoolError, setSchoolError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSchool, setSavingSchool] = useState(false)

  useEffect(() => {
    setAdminName(profile.full_name)
  }, [profile.full_name])

  useEffect(() => {
    if (!settingsQuery.data) return
    setSchool({
      schoolName: settingsQuery.data.school_name,
      address: settingsQuery.data.address ?? '',
      contactEmail: settingsQuery.data.contact_email,
    })
  }, [settingsQuery.data])

  const changeAdminName = (event) => {
    setAdminName(event.target.value)
    setProfileMessage('')
    setProfileError('')
  }

  const changeSchool = (event) => {
    setSchool((current) => ({ ...current, [event.target.name]: event.target.value }))
    setSchoolMessage('')
    setSchoolError('')
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const fullName = adminName.trim()
    if (!fullName) {
      setProfileError('Enter your full name.')
      return
    }

    setSavingProfile(true)
    setProfileError('')
    setProfileMessage('')
    try {
      await updateProfileName(fullName)
      setProfileMessage('Administrator profile saved.')
    } catch (error) {
      setProfileError(error.message || 'Could not save your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSchool = async (event) => {
    event.preventDefault()
    if (!school?.schoolName.trim() || !school.contactEmail.trim()) {
      setSchoolError('Complete the school name and contact email.')
      return
    }

    setSavingSchool(true)
    setSchoolError('')
    setSchoolMessage('')
    try {
      await saveInstituteSettings(school)
      setSchoolMessage('Institute information saved.')
      await settingsQuery.reload()
    } catch (error) {
      setSchoolError(error.message || 'Could not save institute information.')
    } finally {
      setSavingSchool(false)
    }
  }

  if (settingsQuery.error) return <ManagementError error={settingsQuery.error} onRetry={settingsQuery.reload} />
  if (settingsQuery.loading || !settingsQuery.data || !school) return <LoadingScreen label="Loading institute settings" />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Settings" description="Keep administrator and school information up to date." />
      </GlassCard>

      <AdminAccessRequests />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Administrator profile</h2>
              <p className="text-sm text-ink/55">Update the name shown in the school workspace.</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Full name" name="adminName" value={adminName} onChange={changeAdminName} maxLength={160} required />
            <label className="block text-sm font-medium">
              Sign-in email
              <input value={profile.email} readOnly className="mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-canvas px-3 text-sm font-normal text-ink/60 outline-none" />
              <span className="mt-1 block text-xs font-normal text-ink/50">For account security, change the sign-in email through your authentication provider.</span>
            </label>
            <Feedback error={profileError} message={profileMessage} />
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={savingProfile} className={`${FORM_BUTTON} bg-night-900 text-white`}>
                <Save className="mr-2 h-4 w-4" />{savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lilac-100 text-lilac-600">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Institute information</h2>
              <p className="text-sm text-ink/55">Used across school records and fee receipts.</p>
            </div>
          </div>
          <form onSubmit={saveSchool} className="space-y-4">
            <Field label="School name" name="schoolName" value={school.schoolName} onChange={changeSchool} maxLength={160} required />
            <label className="block text-sm font-medium">
              School address
              <textarea name="address" value={school.address} onChange={changeSchool} maxLength={500} rows={3} className="mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60" />
            </label>
            <Field label="Contact email" type="email" name="contactEmail" value={school.contactEmail} onChange={changeSchool} maxLength={255} required />
            <Feedback error={schoolError} message={schoolMessage} />
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={savingSchool} className={`${FORM_BUTTON} bg-night-900 text-white`}>
                <Save className="mr-2 h-4 w-4" />{savingSchool ? 'Saving…' : 'Save institute'}
              </button>
            </div>
          </form>
        </GlassCard>
      </div>

      <GlassCard className="flex items-start gap-3 p-4 sm:p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-lilac-600" />
        <p className="text-sm text-ink/65">
          Academic years and class teachers are managed per class in Classes. Fee amounts and due dates are managed in Fees.
        </p>
      </GlassCard>
    </div>
  )
}
