import { FormEvent, useId, useState } from 'react'
import { Bug, Gauge, Lightbulb, MessageCircle, PanelsTopLeft, Send, ShieldCheck } from 'lucide-react'
import { submitFeedback, type FeedbackCategory } from './feedbackSubmission'

const feedbackCategories = [
  { name: 'Bug Report', Icon: Bug },
  { name: 'Feature Request', Icon: Lightbulb },
  { name: 'UI/UX Suggestions', Icon: PanelsTopLeft },
  { name: 'Performance Issues', Icon: Gauge },
  { name: 'General Feedback', Icon: MessageCircle }
] as const

type LegalPage = 'privacy' | 'terms'
type FeedbackPortalProps = {
  onOpenLegalPage: (page: LegalPage) => void
}

export default function FeedbackPortal({ onOpenLegalPage }: FeedbackPortalProps) {
  const consentId = useId()
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailIsValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = Boolean(category && message.trim() && emailIsValid && consent && !isSubmitting)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || !category) return

    setIsSubmitting(true)
    setSubmissionStatus('')
    const result = await submitFeedback({
      category,
      message: message.trim(),
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      consentAccepted: true
    })
    setIsSubmitting(false)

    if (result.status === 'submitted') {
      setSubmissionStatus('Feedback submitted successfully.')
      setCategory('')
      setName('')
      setEmail('')
      setMessage('')
      setConsent(false)
    } else if (result.status === 'not-configured') {
      setSubmissionStatus('Not submitted: online feedback is not configured. Your information has not been sent or saved. Please try again after XiaLabs enables the secure feedback service.')
    } else {
      setSubmissionStatus(result.message)
    }
  }

  return (
    <section className="settings-section-content feedback-portal" aria-labelledby="feedback-title">
      <div className="feedback-heading">
        <div>
          <span className="settings-eyebrow">XIAMUSIC · XIALABS</span>
          <h3 id="feedback-title">Feedback Portal</h3>
          <p className="settings-section-description">Help us improve XiaMusic. You can share feedback anonymously.</p>
        </div>
      </div>

      <div className="feedback-unavailable" role="status">
        <ShieldCheck size={17} aria-hidden="true" />
        <p><strong>Secure submissions are not configured yet.</strong> Until XiaLabs connects a feedback service, nothing you enter here is transmitted or stored. Submitting now will not send your feedback.</p>
      </div>

      <form className="feedback-form" onSubmit={event => void handleSubmit(event)} noValidate>
        <fieldset className="feedback-category-fieldset">
          <legend>FEEDBACK CATEGORY</legend>
          <div className="feedback-category-grid">
            {feedbackCategories.map(({ name: label, Icon }) => (
              <button
                className={`feedback-category ${category === label ? 'is-selected' : ''}`}
                type="button"
                key={label}
                aria-pressed={category === label}
                onClick={() => { setCategory(label); setSubmissionStatus('') }}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {!category && <span className="feedback-field-hint">Choose a category to continue.</span>}
        </fieldset>

        <div className="feedback-field-grid">
          <label className="feedback-field">
            <span>YOUR NAME</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Anonymous Developer"
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label className="feedback-field">
            <span>EMAIL ADDRESS (OPTIONAL)</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="xyz@gmail.com"
              value={email}
              aria-invalid={!emailIsValid}
              onChange={event => { setEmail(event.target.value); setSubmissionStatus('') }}
            />
            {!emailIsValid && <span className="feedback-field-error">Enter a valid email address or leave this field empty.</span>}
          </label>
        </div>

        <label className="feedback-field feedback-message-field">
          <span>YOUR FEEDBACK</span>
          <textarea
            placeholder="Tell us what you think..."
            rows={5}
            value={message}
            onChange={event => { setMessage(event.target.value); setSubmissionStatus('') }}
            required
          />
          {!message.trim() && <span className="feedback-field-hint">Feedback details are required.</span>}
        </label>

        <div className="feedback-consent">
          <input
            id={consentId}
            type="checkbox"
            aria-label="I consent to XiaLabs using the information I submit to review and respond to this feedback, according to XiaLabs' Privacy Policy and Terms."
            checked={consent}
            onChange={event => setConsent(event.target.checked)}
          />
          <p className="feedback-consent-copy">
            <label htmlFor={consentId}>I consent to XiaLabs using the information I submit to review and respond to this feedback. If I provide my name or email, I understand that the submission will be processed according to XiaLabs' </label>
            <button type="button" className="feedback-inline-link" onClick={() => onOpenLegalPage('privacy')}>Privacy Policy</button>
            {' and '}
            <button type="button" className="feedback-inline-link" onClick={() => onOpenLegalPage('terms')}>Terms</button>.
          </p>
        </div>

        <button className="feedback-submit" type="submit" disabled={!canSubmit}>
          <Send size={15} aria-hidden="true" />
          {isSubmitting ? 'Submitting…' : 'Submit Form'}
        </button>
        {submissionStatus && (
          <p className={`feedback-submission-status ${submissionStatus.startsWith('Feedback submitted') ? 'is-success' : 'is-error'}`} role="status" aria-live="polite">
            {submissionStatus}
          </p>
        )}
      </form>
    </section>
  )
}
