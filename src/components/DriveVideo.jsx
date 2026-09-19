import React from 'react';

function getDriveId(value='') {
  const match = value.match(/\/d\/([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : value.trim();
}

export default function DriveVideo({ fileId, title='ZAFE documentary video', className='' }) {
  const id = getDriveId(fileId);
  if (!id) return <div className={`drive-video-empty ${className}`}>Video unavailable</div>;
  return <div className={`drive-video ${className}`}>
    <iframe title={title} src={`https://drive.google.com/file/d/${id}/preview`} allow="autoplay; fullscreen" allowFullScreen />
  </div>;
}
