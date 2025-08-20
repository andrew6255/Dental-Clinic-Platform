export default function FilePreview({ file }) {
  const ct = (file.contentType || "").toLowerCase();
  const url = file.downloadURL;

  if (!url) return null;

  // Images
  if (ct.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={file.label || file.fileName}
          className="max-h-40 rounded-lg border object-contain"
          loading="lazy"
        />
      </a>
    );
  }

  // PDFs
  if (ct === "application/pdf" || file.fileName?.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        src={url}
        title={file.label || file.fileName}
        className="w-full h-60 rounded-lg border"
      />
    );
  }

  return null; // non-previewable types fall back to "Open" link in the list
}
