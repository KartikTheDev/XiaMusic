import { useEffect, useRef } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const policyMarkdown = `
# XiaMusic Privacy Policy
**Effective Date:** October 25, 2026
**Application:** XiaMusic
**Policy Version:** 1.0

## Introduction
Welcome to XiaMusic, a desktop music player designed to provide a personal, convenient, and enjoyable music-listening experience.

At XiaMusic, we believe that listening to music should feel personal, and that users should have a clear understanding of how their information is handled.

This Privacy Policy explains what information XiaMusic may access, how that information is used, where it is stored, and what choices users have regarding their privacy.

XiaMusic is designed with a local-first approach. Its core purpose is to help users organize, manage, and play music from their own devices without requiring them to upload their personal music collection to a remote server.

This policy applies to the XiaMusic desktop application and its built-in features, including the music library, playlists, playback history, favorites, audio settings, equalizer, and other supported functionality.

By using XiaMusic, you acknowledge this policy. Where applicable law requires consent for a particular activity, that consent will be obtained separately.

## Our Privacy Principles
XiaMusic follows these guiding principles:

- **Privacy First:** Personal information should be handled responsibly and only for legitimate purposes.
- **Local-First Music:** Music files should remain on the user's device unless a separately implemented feature explicitly requires otherwise and the user is informed.
- **Transparency:** Users should be able to understand what the application does with their information.
- **Data Minimization:** The application should access only the information reasonably necessary to provide its features.
- **User Control:** Users should retain meaningful control over their music library, preferences, and locally stored application data.
- **No Unnecessary Collection:** XiaMusic should not collect personal information merely because it might be useful in the future.

These principles guide our product design and development decisions. The actual operation of each feature must remain consistent with the disclosures in this policy.

## Information We May Access
Depending on the features you use, XiaMusic may access or store the following categories of information locally.

### Music Library Information
When you import music or select a folder, XiaMusic may access information associated with your audio files, including song titles, artist names, album names, track duration, supported audio metadata, embedded album artwork, local file paths, and the date a track was added to your library.

This information is used to display, organize, search, and play your music.

### Playback Information
To provide music-player functionality, XiaMusic may maintain local records such as recently played tracks, most-played tracks, playback counts, favorite songs, playlists, queue information, last-played timestamps, and listening progress where supported.

These records help the application provide personalized library views and playback features.

### Application Preferences
XiaMusic may store your preferences, including your selected theme, volume level, equalizer settings, playback preferences, interface configuration, and other settings you choose to customize.

### Technical Information
The application or its distribution platform may process limited technical information necessary for installation, operation, diagnostics, or updates, if those features are implemented.

Any such collection should be disclosed according to the actual functionality provided. XiaMusic should not claim that technical information is never collected unless the application and its supporting services have been verified accordingly.

## How We Use Information
Information accessed by XiaMusic may be used to play supported audio files, organize songs into albums and artist collections, display Smart Playlists, remember application preferences, restore relevant settings, apply equalizer configurations, manage the playback queue, and help diagnose technical problems when diagnostic functionality is enabled.

XiaMusic should use information only for purposes consistent with the feature that requires it.

We do not intend for personal music metadata or application preferences to be used for unrelated advertising or profiling.

## Local Storage and Music Files
XiaMusic is designed primarily as a local desktop music player.

When you import a music folder, the application may read supported files from the locations you select. Depending on the implementation, it may store track metadata, file references, playlists, and preferences in local application storage.

Your original music files should remain in their original locations unless you explicitly use a feature that moves, copies, or deletes them.

**Local storage is not the same as uploading.** Reading a file, extracting its metadata, or recording its local path does not inherently mean that the file has been transmitted over the internet.

Core music playback should not require uploading your personal music collection to XiaMusic servers.

If future versions introduce cloud synchronization, online music services, remote backups, or other network-dependent features, the relevant data practices must be disclosed before those features are used.

## Internet Connectivity and External Services
Core offline playback and local library management should work without an internet connection wherever the implemented features permit.

Some optional features, if introduced, may require internet access. Examples could include update checks, online documentation, crash-reporting services, or integrations with external providers.

If XiaMusic communicates with external services, the application should clearly disclose which service is contacted, why the connection is necessary, what information is transmitted, whether the service provider receives personal or technical information, and what choices the user has.

External providers may process information according to their own privacy policies and applicable agreements.

XiaMusic should not transmit music files, library metadata, or playback history to external services without an appropriate, clearly disclosed reason and any required user consent.

## Data Sharing and Disclosure
XiaMusic does not intend to sell users' personal information.

Personal music files, library records, playlists, and listening history should not be shared with advertisers or unrelated third parties as part of the core local-player functionality.

Information may be disclosed when necessary and legally permitted in limited circumstances, such as responding to a valid legal obligation, protecting the security of the application or its users, investigating suspected abuse or security incidents, or operating an explicitly disclosed third-party feature that the user chooses to use.

Any third-party integrations must be evaluated individually. This policy should be updated if their data practices materially change how user information is processed.

## Advertising and User Profiling
XiaMusic is intended to focus on music playback and library management rather than advertising.

The application should not build advertising profiles from users' listening history or personal music collections.

If advertising, personalized recommendations based on remote processing, or analytics-based profiling is introduced in a future version, the relevant practices should be disclosed clearly before implementation.

The absence of advertising does not, by itself, establish that an application collects no technical data. Any analytics or diagnostic functionality must be assessed separately.

## Data Retention and Deletion
Information stored by XiaMusic may remain on your device until you remove it or uninstall the application, depending on the storage mechanism used.

You may be able to remove information by using the application's available controls, such as removing tracks from the library, deleting playlists, clearing playback history, or resetting application preferences.

Removing a track from the library may remove only its library entry and not the original audio file. The exact behavior depends on the implemented feature and should be explained in the interface.

Uninstalling XiaMusic may not automatically delete all locally stored application data. Some operating systems preserve application data separately from installed program files.

Before uninstalling, users who want to remove their library metadata or preferences should use available deletion controls and check the relevant application-data location.

If XiaMusic introduces cloud storage or remote diagnostics, retention and deletion rules for those services must also be documented.

## Data Security
We aim to protect information handled by XiaMusic through reasonable technical and development practices.

Depending on the application's architecture, these measures may include restricting access to local files to the extent supported by the operating system, using appropriate Electron security settings and secure process boundaries, avoiding unnecessary exposure of filesystem access to the user interface, validating file inputs, maintaining application dependencies, avoiding unnecessary transmission of personal music information, and handling local application data carefully.

No software application or storage method can guarantee absolute security. Users should maintain appropriate backups of important files and keep their operating systems and application versions updated.

Security protections should reflect the features actually implemented in the released application.

## Children's Privacy
XiaMusic is a general-purpose music player and is not specifically designed to collect personal information from children.

The application should not request unnecessary personal details for ordinary local music playback.

If a future feature collects personal information online, the feature must comply with applicable age-related privacy requirements and any required parental-consent rules.

Parents and guardians should supervise children's use of online services where appropriate.

## Your Privacy Rights and Choices
Depending on your location and applicable law, you may have rights concerning personal information, including the right to understand what information is processed, access certain information associated with you, correct inaccurate personal information, request deletion of eligible personal information, withdraw consent where processing relies on consent, object to or restrict certain processing activities, and lodge a complaint with an appropriate data-protection authority.

For information stored entirely on your device, you may be able to exercise control directly through the application or your operating system.

Where XiaMusic or a service provider controls personal information subject to a legal request, requests should be handled according to applicable law.

These rights vary by jurisdiction and are subject to relevant legal conditions and exceptions.

## Third-Party Software and Dependencies
XiaMusic may use third-party libraries or software components to provide features such as audio playback, interface rendering, metadata extraction, and application packaging.

Using a software dependency does not automatically mean that personal information is shared with its developer.

However, some dependencies or optional integrations may communicate with external services or process technical information.

We aim to use dependencies responsibly and review their functionality and permissions where appropriate.

If a third-party service receives user information, that processing must be disclosed where required, and the relevant provider's terms and privacy policy may also apply.

## Cookies and Similar Technologies
The core desktop application does not need browser cookies to play local music.

If a future version incorporates web-based services, embedded browser content, authentication, or other functionality that uses cookies or similar technologies, those technologies may store or access information according to their purpose.

Where required, the application or relevant service will provide additional information and consent choices.

The presence or absence of cookies should be determined from the actual application's implementation rather than assumed solely because it is a desktop application.

## Changes to This Privacy Policy
We may update this Privacy Policy to reflect changes in XiaMusic's functionality, security practices, legal obligations, or data-handling procedures.

When a change materially affects how information is handled, we aim to provide an appropriate notice through the application, release notes, or another suitable channel.

The effective date at the beginning of this document indicates when the current version of the policy takes effect.

Users should review this policy periodically, especially when installing a version that introduces new online services or data-processing features.

We will not treat a policy update as a substitute for obtaining consent where consent is legally required.

## Offline Use and Privacy Expectations
XiaMusic is designed to make personal music playback convenient without requiring a user account for its core local-player functionality, provided no account requirement is introduced by a particular release.

When operating entirely offline, the application should process supported music files and locally stored settings through its local functionality.

If a feature cannot work offline, the application should explain the requirement before attempting to use that feature.

Users should not assume that all functionality is offline simply because the application is installed on a desktop computer. Optional online services, update mechanisms, or integrations must be considered separately.

## Contact and Privacy Questions
If you have questions about this Privacy Policy, wish to report a privacy concern, or need clarification about how XiaMusic handles information, please contact the official XiaMusic support channel.

**Product:** XiaMusic
**Privacy Contact:** [Insert official privacy or support email]
**Official Website:** [Insert official website, if available]

Do not publish placeholder contact information as though it were a real support address.

Once official contact details are available, they should be added here so users have a clear way to raise privacy-related concerns.

## Our Commitment to Your Privacy
Your music library is personal, and your privacy matters.

XiaMusic aims to provide a straightforward desktop music experience in which users can manage their own music, personalize playback, and enjoy their collections with clear information about how the application handles data.

Our goal is to minimize unnecessary data processing, preserve user control, and communicate honestly about the application's capabilities and limitations.

This Privacy Policy should always be read alongside the actual features, permissions, and data practices of the installed version of XiaMusic.

**Thank you for choosing XiaMusic.**

*Your music. Your space. Your privacy.*
`

function renderInline(text: string) {
  return text.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function renderPolicy() {
  const blocks = policyMarkdown.trim().split(/\n\s*\n/)
  return blocks.map((block, index) => {
    const lines = block.split('\n')
    const firstLine = lines[0]
    if (firstLine.startsWith('# ')) {
      return (
        <div className="privacy-policy-document-heading" key={index}>
          <h2 id="privacy-policy-title">{firstLine.slice(2)}</h2>
          <p className="privacy-policy-document-meta">
            {lines.slice(1).map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInline(line)}</span>)}
          </p>
        </div>
      )
    }
    if (firstLine.startsWith('## ')) return <h3 key={index}>{firstLine.slice(3)}</h3>
    if (firstLine.startsWith('### ')) return <h4 key={index}>{firstLine.slice(4)}</h4>
    if (lines.every(line => line.startsWith('- '))) {
      return <ul key={index}>{lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(2))}</li>)}</ul>
    }
    return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInline(line)}</span>)}</p>
  })
}

type PrivacyPolicyPageProps = {
  onBack: () => void
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus()
  }, [])

  return (
    <section className="privacy-policy-page" aria-labelledby="privacy-policy-title">
      <div className="privacy-policy-toolbar">
        <button ref={backButtonRef} className="subtle-button privacy-policy-back" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> Back to About
        </button>
      </div>
      <div className="privacy-policy-scroll">
        <article className="privacy-policy-article">
          <div className="privacy-policy-intro">
            <span className="privacy-policy-icon"><ShieldCheck size={20} /></span>
            <div>
              <span className="settings-eyebrow">PRIVACY &amp; TRANSPARENCY</span>
              <p>Your music library is personal, and your privacy matters.</p>
            </div>
          </div>
          <div className="privacy-policy-body">
            {renderPolicy()}
          </div>
        </article>
      </div>
    </section>
  )
}
