import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import api from '../lib/axios'
import ImageLightbox from './ImageLightbox'

// CNIC front/back are restricted server-side to the profile owner and Admin
// (see CandidateProfilePolicy::viewDocument()) — hidden here for anyone else
// so the list never shows a slot HR/assistant_hr would just get a 403 on.
const DOCUMENT_TYPES = [
  { key: 'transcript', label: 'Transcript', adminOnly: false },
  { key: 'cnic_front', label: 'CNIC (front)', adminOnly: true },
  { key: 'cnic_back', label: 'CNIC (back)', adminOnly: true },
  { key: 'fsc_certificate', label: 'FSC Certificate', adminOnly: false },
  { key: 'matric_certificate', label: 'Matric Certificate', adminOnly: false },
]

// Lists a candidate's uploaded documents as clickable items. The serving
// endpoint requires auth, so each document is fetched as a blob through the
// shared axios instance (which attaches the bearer token) rather than a
// plain <a href>/<img src> pointing at the API — neither would carry the
// auth header. Whether to open a new tab or the lightbox is decided from the
// fetched blob's actual content type, not the document type, since any slot
// can hold either a PDF or an image.
export default function CandidateDocumentsList({ profileId, documents, isAdmin }) {
  const [loadingKey, setLoadingKey] = useState(null)
  const [error, setError] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const visibleTypes = DOCUMENT_TYPES.filter((type) => isAdmin || !type.adminOnly)

  async function handleOpen(type) {
    setError('')
    setLoadingKey(type.key)

    try {
      const response = await api.get(`/candidate-documents/${profileId}/${type.key}`, {
        responseType: 'blob',
      })
      const objectUrl = URL.createObjectURL(response.data)

      if (response.data.type === 'application/pdf') {
        // The tab needs the object URL to stay valid while it loads the
        // PDF, so this is deliberately never revoked.
        window.open(objectUrl, '_blank', 'noopener,noreferrer')
      } else {
        setLightboxSrc(objectUrl)
      }
    } catch {
      setError('Unable to load this document. Please try again.')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-ink/55">Documents</p>
      <div className="mt-2 space-y-1.5">
        {visibleTypes.map((type) => {
          const isUploaded = Boolean(documents?.[type.key])

          return (
            <div
              key={type.key}
              className="flex items-center justify-between gap-3 rounded-md border border-ink/10 px-3 py-2 text-sm"
            >
              <span className="text-ink">{type.label}</span>
              {isUploaded ? (
                <button
                  type="button"
                  onClick={() => handleOpen(type)}
                  disabled={loadingKey === type.key}
                  className="flex items-center gap-1 text-xs font-medium text-jade hover:text-jade-deep disabled:text-ink/40"
                >
                  <ExternalLink size={12} />
                  {loadingKey === type.key ? 'Loading…' : 'View'}
                </button>
              ) : (
                <span className="text-xs text-ink/40">Not uploaded</span>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="mt-2 text-sm text-rust">{error}</p>}

      <ImageLightbox
        isOpen={Boolean(lightboxSrc)}
        src={lightboxSrc}
        onClose={() =>
          setLightboxSrc((previous) => {
            if (previous) URL.revokeObjectURL(previous)
            return null
          })
        }
      />
    </div>
  )
}
