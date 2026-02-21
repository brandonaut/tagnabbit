import { type Tag } from './api/tags';

interface Props {
  tag: Tag;
  onBack: () => void;
}

export default function TagPage({ tag, onBack }: Props) {
  const pdfUrl = tag.sheetMusicAltUrl || tag.sheetMusicUrl;

  return (
    <div className="tag-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h1>{tag.title}</h1>
      {tag.version && <p className="tag-version">{tag.version}</p>}

      <div className="tag-meta">
        <span>#{tag.id}</span>
        {tag.arranger && <span>arr. {tag.arranger}</span>}
        {tag.key && <span>{tag.key}</span>}
        <span>{tag.downloaded.toLocaleString()} downloads</span>
      </div>

      {pdfUrl ? (
        <div className="sheet-music-container">
          <iframe
            src={pdfUrl}
            title={`Sheet music for ${tag.title}`}
            className="sheet-music"
          />
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sheet-music-link"
          >
            Open PDF in new tab
          </a>
        </div>
      ) : (
        <p className="no-sheet-music">No sheet music available.</p>
      )}
    </div>
  );
}
