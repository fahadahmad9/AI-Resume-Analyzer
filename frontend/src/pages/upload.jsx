import { useMemo, useState } from 'react'

function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null)

  const fileInfo = useMemo(() => {
    if (!selectedFile) return 'No file selected'
    const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(2)
    return `${selectedFile.name} (${sizeInMb} MB)`
  }, [selectedFile])

  const handleFileChange = (event) => {
    const [file] = event.target.files || []

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.')
      event.target.value = ''
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  return (
    <main className="upload-page">
      <section className="upload-card">
        <h1>Upload Resume</h1>
        <p>Select a PDF resume to begin analysis.</p>

        <label className="upload-input" htmlFor="resume-pdf">
          <span>Choose Resume PDF</span>
          <input
            id="resume-pdf"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </label>

        <p className="upload-file-info">{fileInfo}</p>
        <button type="button" className="upload-button" disabled={!selectedFile}>
          Upload
        </button>
      </section>
    </main>
  )
}

export default UploadPage