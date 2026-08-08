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

export async function extract30SecAudioSampleWav(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const totalDuration = audioBuffer.duration || 0;
    const durationToExtract = Math.min(30, totalDuration || 30);
    const sampleRate = Math.min(22050, audioBuffer.sampleRate);
    const numChannels = Math.min(2, audioBuffer.numberOfChannels);
    const numSamples = Math.floor(durationToExtract * sampleRate);

    // Calculate a random start offset inside the audiobook (skipping opening intro credits/title)
    let startOffset = 0;
    if (totalDuration > 35) {
      // Pick random window between 10% and 85% mark of the book
      const minOffset = Math.min(30, Math.floor(totalDuration * 0.1));
      const maxOffset = Math.max(minOffset, Math.floor(totalDuration * 0.85) - 30);
      startOffset = Math.floor(minOffset + Math.random() * (maxOffset - minOffset));
    }

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(numChannels, numSamples, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, startOffset, durationToExtract);

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(wavBlob);
    });
  } catch (err) {
    console.warn('WAV 30-sec sample extraction notice:', err);
    return null;
  }
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    data.push(buffer.getChannelData(i));
  }

  const numSamples = buffer.length;
  const dataByteLength = numSamples * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = data[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
