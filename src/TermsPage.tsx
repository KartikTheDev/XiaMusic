import { useEffect, useRef } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'

const termsSections = [
  {
    title: 'Acceptance of Terms',
    paragraphs: ['By using XiaMusic, you agree to these Terms of Use. If you do not agree, do not use the application.']
  },
  {
    title: 'Application Usage',
    paragraphs: ['XiaMusic is a local-first music player for audio files you choose on your device. Features described as planned or coming soon are not available unless they are implemented in your version.']
  },
  {
    title: 'User Responsibilities',
    paragraphs: ['You are responsible for the files you access and for having the rights and permissions needed to play or manage them. Do not use the application to violate another person’s rights or applicable law.']
  },
  {
    title: 'Feedback and Suggestions',
    paragraphs: ['The Feedback Portal currently has no configured submission service. Submitting its form will not transmit or store your feedback. If XiaLabs later enables an online endpoint, the form will send only the category, feedback text, optional name and email, and consent state after the endpoint is configured. The feedback service’s actual retention and handling terms must be disclosed before submissions are enabled.']
  },
  {
    title: 'Privacy and Data Handling',
    paragraphs: ['Music-library information and preferences are stored locally as described in the Privacy Policy. The Feedback Portal does not currently retain entries on your device or send them online. Do not enter sensitive personal information in a feedback form that is not configured to submit.']
  },
  {
    title: 'Intellectual Property',
    paragraphs: ['XiaMusic’s application code, name, and original interface elements are protected by applicable intellectual-property laws. These Terms do not transfer ownership to you. You retain the rights you hold in your own music and feedback.']
  },
  {
    title: 'Third-party Services',
    paragraphs: ['Some application components may rely on third-party software. No third-party feedback service is currently configured. If an external service is added, its applicable terms and privacy disclosures will be presented as appropriate.']
  },
  {
    title: 'Disclaimer and Limitation of Liability',
    paragraphs: ['XiaMusic is provided “as is” and “as available,” to the extent permitted by law. We do not guarantee uninterrupted or error-free operation. Nothing in these Terms limits rights or remedies that cannot legally be excluded. To the extent permitted by law, XiaLabs is not liable for indirect or consequential loss arising from use of the application.']
  },
  {
    title: 'Changes to Terms',
    paragraphs: ['These Terms may be updated when the application or its data practices change. Material changes should be reflected in the version of the Terms presented in XiaMusic. Continued use after an update takes effect constitutes acceptance where permitted by law.']
  },
  {
    title: 'Contact Information',
    paragraphs: ['No dedicated XiaLabs legal or support contact is configured in this application. Do not rely on this page as a support submission channel.']
  }
] as const

type TermsPageProps = {
  onBack: () => void
  backLabel?: string
}

export default function TermsPage({ onBack, backLabel = 'Back to Feedback' }: TermsPageProps) {
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus()
  }, [])

  return (
    <section className="privacy-policy-page" aria-labelledby="terms-page-title">
      <div className="privacy-policy-toolbar">
        <button ref={backButtonRef} className="subtle-button privacy-policy-back" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> {backLabel}
        </button>
      </div>
      <div className="privacy-policy-scroll">
        <article className="privacy-policy-article">
          <div className="privacy-policy-intro">
            <span className="privacy-policy-icon"><FileText size={20} /></span>
            <div>
              <span className="settings-eyebrow">XIALABS · TERMS OF USE</span>
              <p>Clear terms for using XiaMusic.</p>
            </div>
          </div>
          <div className="privacy-policy-body">
            <h2 id="terms-page-title">XiaMusic Terms of Use</h2>
            <p className="privacy-policy-document-meta">Application: XiaMusic<br />Provided by: XiaLabs</p>
            {termsSections.map(section => (
              <section key={section.title} aria-labelledby={`terms-${section.title.toLowerCase().replace(/ /g, '-')}`}>
                <h3 id={`terms-${section.title.toLowerCase().replace(/ /g, '-')}`}>{section.title}</h3>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
