const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipFile {
  name: string
  data: Uint8Array
}

export function createZip(files: ZipFile[]): Blob {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const data = file.data
    const crc = crc32(data)
    const nameBytes = new TextEncoder().encode(file.name)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(8, 0, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    offset += localHeader.length + data.length
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const totalSize = localParts.reduce((s, p) => s + p.length, 0) + centralSize + 22
  const result = new Uint8Array(totalSize)
  let pos = 0
  for (const p of localParts) {
    result.set(p, pos)
    pos += p.length
  }
  for (const p of centralParts) {
    result.set(p, pos)
    pos += p.length
  }
  result.set(eocd, pos)

  return new Blob([result], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
