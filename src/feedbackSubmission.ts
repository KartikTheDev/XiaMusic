export type FeedbackCategory =
  | 'Bug Report'
  | 'Feature Request'
  | 'UI/UX Suggestions'
  | 'Performance Issues'
  | 'General Feedback'

export type FeedbackSubmission = {
  category: FeedbackCategory
  message: string
  name?: string
  email?: string
  consentAccepted: true
}

export type FeedbackSubmissionResult =
  | { status: 'not-configured' }
  | { status: 'submitted' }
  | { status: 'error'; message: string }

function getFeedbackEndpoint(): string | null {
  return import.meta.env.VITE_FEEDBACK_SUBMISSION_URL?.trim() || null
}

function isSecureEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    const secureProtocol = url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    return secureProtocol && !url.username && !url.password && !url.hash
  } catch {
    return false
  }
}

export async function submitFeedback(feedback: FeedbackSubmission): Promise<FeedbackSubmissionResult> {
  const endpoint = getFeedbackEndpoint()
  if (!endpoint) return { status: 'not-configured' }
  if (!isSecureEndpoint(endpoint)) {
    return { status: 'error', message: 'Feedback submission is unavailable because its endpoint is not a secure HTTPS URL.' }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
      redirect: 'error'
    })
    if (!response.ok) {
      return { status: 'error', message: `The feedback service returned an error (HTTP ${response.status}). Your feedback was not confirmed as submitted.` }
    }
    return { status: 'submitted' }
  } catch {
    return { status: 'error', message: 'Could not reach the feedback service. Your feedback was not confirmed as submitted.' }
  }
}
