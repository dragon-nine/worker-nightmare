interface Props {
  title: string
  message: string
}

export default function PlaceholderTab({ title, message }: Props) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <div className="card" style={{ textAlign: 'center', padding: 64 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🚧</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{message}</p>
      </div>
    </div>
  )
}
