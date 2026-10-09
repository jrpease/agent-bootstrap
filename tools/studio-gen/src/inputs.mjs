import sharp from 'sharp'

// Input images are re-encoded before they're sent: studio-gen's own stills are WebP,
// which not every endpoint takes. Video frames go as JPEG, which every video endpoint
// accepts and keeps a 2x still under Magnific's 10 MB cap. Edits go as PNG so alpha
// survives.
export async function frameJpeg(path) {
  return { bytes: await sharp(path).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer(), mimeType: 'image/jpeg' }
}

export async function editPng(path) {
  return { bytes: await sharp(path).png().toBuffer(), mimeType: 'image/png' }
}
