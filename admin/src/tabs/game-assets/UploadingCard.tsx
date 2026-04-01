export default function UploadingCard({ filename }: { filename: string }) {
  return (
    <div className="asset-card uploading">
      <div className="asset-card-preview">
        <div className="upload-spinner" />
      </div>
      <div className="asset-card-info">
        <div className="asset-card-name">{filename}</div>
        <div className="asset-card-meta"><span className="uploading-text">업로드 중...</span></div>
      </div>
    </div>
  )
}
