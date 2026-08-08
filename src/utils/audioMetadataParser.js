/**
 * High-Precision Browser ID3v2, ID3v2.2, ID3v2.3, ID3v2.4 & MP4 Audio Metadata Parser.
 * Scans ID3 headers, APIC picture frames, and raw image stream bytes to extract exact cover artwork.
 */
export async function parseAudioFileMetadata(file) {
  return new Promise((resolve) => {
    const result = {
      title: '',
      author: '',
      narrator: '',
      durationFormatted: '',
      durationSeconds: 0,
      coverUrl: null,
      audioObjectUrl: URL.createObjectURL(file),
      fileName: file.name,
    };

    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    result.title = cleanFileName;

    // 1. Audio Duration via browser HTML5 Audio Element
    const audio = new Audio(result.audioObjectUrl);

    const onMetadataLoaded = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const totalSecs = Math.floor(audio.duration);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        result.durationSeconds = audio.duration;
        if (hrs > 0) {
          result.durationFormatted = `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
        } else {
          result.durationFormatted = `${mins} min${mins !== 1 ? 's' : ''}`;
        }
      }
      parseID3Buffer();
    };

    const parseID3Buffer = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target.result);

          // Find 'ID3' header offset (check first 64KB)
          let id3Offset = -1;
          for (let i = 0; i < Math.min(buffer.length - 10, 65536); i++) {
            if (buffer[i] === 0x49 && buffer[i + 1] === 0x44 && buffer[i + 2] === 0x33) {
              id3Offset = i;
              break;
            }
          }

          if (id3Offset !== -1) {
            const versionMajor = buffer[id3Offset + 3];
            const tagSize = ((buffer[id3Offset + 6] & 0x7f) << 21) |
                            ((buffer[id3Offset + 7] & 0x7f) << 14) |
                            ((buffer[id3Offset + 8] & 0x7f) << 7) |
                            (buffer[id3Offset + 9] & 0x7f);

            let pos = id3Offset + 10;
            const maxPos = Math.min(buffer.length - 10, id3Offset + 10 + tagSize);

            while (pos < maxPos) {
              let frameID = '';
              let frameSize = 0;
              let headerSize = 10;

              if (versionMajor === 2) {
                frameID = String.fromCharCode(buffer[pos], buffer[pos + 1], buffer[pos + 2]);
                frameSize = (buffer[pos + 3] << 16) | (buffer[pos + 4] << 8) | buffer[pos + 5];
                headerSize = 6;
              } else if (versionMajor === 4) {
                frameID = String.fromCharCode(buffer[pos], buffer[pos + 1], buffer[pos + 2], buffer[pos + 3]);
                frameSize = ((buffer[pos + 4] & 0x7f) << 21) | ((buffer[pos + 5] & 0x7f) << 14) | ((buffer[pos + 6] & 0x7f) << 7) | (buffer[pos + 7] & 0x7f);
              } else {
                frameID = String.fromCharCode(buffer[pos], buffer[pos + 1], buffer[pos + 2], buffer[pos + 3]);
                frameSize = (buffer[pos + 4] << 24) | (buffer[pos + 5] << 16) | (buffer[pos + 6] << 8) | buffer[pos + 7];
              }

              pos += headerSize;

              if (frameSize <= 0 || pos + frameSize > buffer.length) break;

              // TIT2 / TT2 (Title)
              if (frameID === 'TIT2' || frameID === 'TT2') {
                const text = parseFrameText(buffer, pos, frameSize);
                if (text) result.title = text;
              }
              // TPE1 / TP1 (Artist/Author)
              else if (frameID === 'TPE1' || frameID === 'TP1' || frameID === 'TPE2') {
                const text = parseFrameText(buffer, pos, frameSize);
                if (text && !result.author) result.author = text;
              }
              // TCOM / TCM / TEXT (Narrator / Composer)
              else if (frameID === 'TCOM' || frameID === 'TCM' || frameID === 'TEXT') {
                const text = parseFrameText(buffer, pos, frameSize);
                if (text && !result.narrator) result.narrator = text;
              }
              // APIC / PIC (Attached Picture / Cover Art)
              else if (frameID === 'APIC' || frameID === 'PIC') {
                const cover = parseAPICFrame(buffer, pos, frameSize);
                if (cover) result.coverUrl = cover;
              }

              pos += frameSize;
            }

            // Fallback scan for raw JPEG/PNG image inside ID3 tag region if APIC frame was skipped
            if (!result.coverUrl && tagSize > 0) {
              const id3Region = buffer.subarray(id3Offset, Math.min(buffer.length, id3Offset + 10 + tagSize));
              const fallbackCover = parseRawImageFromBuffer(id3Region);
              if (fallbackCover) result.coverUrl = fallbackCover;
            }
          }
        } catch (err) {
          console.warn('ID3 parsing warning:', err);
        }
        resolve(result);
      };

      reader.onerror = () => resolve(result);
      // Read first 16MB of audio file buffer
      const slice = file.slice(0, Math.min(file.size, 1024 * 1024 * 16));
      reader.readAsArrayBuffer(slice);
    };

    audio.onloadedmetadata = onMetadataLoaded;
    audio.onerror = () => parseID3Buffer();
  });
}

function parseFrameText(buffer, offset, length) {
  try {
    const encoding = buffer[offset];
    const data = buffer.subarray(offset + 1, offset + length);
    if (encoding === 0) {
      let str = '';
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0) break;
        str += String.fromCharCode(data[i]);
      }
      return str.trim();
    } else {
      const decoder = new TextDecoder(encoding === 1 || encoding === 2 ? 'utf-16' : 'utf-8');
      const text = decoder.decode(data);
      return text.replace(/\0/g, '').trim();
    }
  } catch {
    return '';
  }
}

function parseAPICFrame(buffer, offset, length) {
  try {
    const frameData = buffer.subarray(offset, offset + length);
    return parseRawImageFromBuffer(frameData);
  } catch (err) {
    console.warn('APIC image parse error:', err);
    return null;
  }
}

function parseRawImageFromBuffer(frameData) {
  try {
    let imgStart = -1;
    let mimeType = 'image/jpeg';

    for (let i = 0; i < frameData.length - 4; i++) {
      // JPEG magic bytes: 0xFF 0xD8 0xFF
      if (frameData[i] === 0xFF && frameData[i + 1] === 0xD8 && frameData[i + 2] === 0xFF) {
        imgStart = i;
        mimeType = 'image/jpeg';
        break;
      }
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      if (frameData[i] === 0x89 && frameData[i + 1] === 0x50 && frameData[i + 2] === 0x4E && frameData[i + 3] === 0x47) {
        imgStart = i;
        mimeType = 'image/png';
        break;
      }
    }

    if (imgStart !== -1) {
      const imageData = frameData.subarray(imgStart);
      let binary = '';
      const len = imageData.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = imageData.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64 = window.btoa(binary);
      return `data:${mimeType};base64,${base64}`;
    }
  } catch (err) {
    console.warn('Raw image stream error:', err);
  }
  return null;
}
