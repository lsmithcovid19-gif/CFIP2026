import QRCode from 'qrcode'

export interface DatosJugador {
  id: string
  dni: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  direccion: string
  correo: string
  telefono: string
  nro_colegiatura: string
  foto_url: string
  equipo_nombre: string
  equipo_categoria: string
  baseUrl: string
}

const calcularEdad = (fecha: string) => {
  if (!fecha) return ''
  const añoNac = parseInt(fecha.split('-')[0])
  const añoActual = new Date().getFullYear()
  return `${añoActual - añoNac} años`
}

const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

const renderHtmlToCanvas = async (htmlContent: string, width: number, height: number) => {
  const { default: html2canvas } = await import('html2canvas')
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px;`
  wrapper.innerHTML = htmlContent
  document.body.appendChild(wrapper)
  await new Promise(r => setTimeout(r, 700))
  const canvas = await html2canvas(wrapper.firstElementChild as HTMLElement, {
    scale: 4,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width,
    height,
  })
  document.body.removeChild(wrapper)
  return canvas
}

export const generarCarnet = async (jugador: DatosJugador) => {
  const { default: jsPDF } = await import('jspdf')

  const fotoJugador = jugador.foto_url ? await urlToBase64(jugador.foto_url) : ''
  const qrUrl = `${jugador.baseUrl}/verificar/${jugador.id}`
  const qrBase64 = await QRCode.toDataURL(qrUrl, { width: 300, margin: 0 })

  // carnet_frente.png tamaño real = 513 x 285. Escala x3 para nitidez = 1539x855
  const SCALE = 3
  const WF = 513 * SCALE
  const HF = 285 * SCALE
  // carnet_reverso.png tamaño real = 516 x 273. Escala x3 = 1548x819
  const WR = 516 * SCALE
  const HR = 273 * SCALE
  const px = (v: number) => v * SCALE

  // Coordenadas medidas con escaneo de píxeles directo sobre carnet_frente.png (513x285):
  // Nombres: termina en x=123, línea y=155-178 -> valor empieza x=128, baseline y=174
  // Apellidos: termina x=127, y=182-205 -> valor x=132, baseline y=200
  // Club: termina x=73, y=208-224 -> valor x=80, baseline y=224
  // Categoria: termina x=138, y=234-250 -> valor x=144, baseline y=248
  // DNI: termina x=62, NC va de x=228 a 247, ambos y=262-278 -> baseline y=276
  // Marco foto interior: x=371 a 492, y=150 a 275

  const frenteHTML = `
  <div style="
    width:${WF}px;height:${HF}px;
    position:relative;
    font-family:Arial,Helvetica,sans-serif;
    background-image:url('/logos/carnet_frente.png');
    background-size:${WF}px ${HF}px;
    background-repeat:no-repeat;
  ">
    <div style="position:absolute;left:${px(139)}px;top:${px(149)}px;color:#1a1a1a;font-weight:700;font-size:${px(15)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.nombres}</div>
    <div style="position:absolute;left:${px(137)}px;top:${px(175)}px;color:#1a1a1a;font-weight:700;font-size:${px(15)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.apellidos}</div>
    <div style="position:absolute;left:${px(88)}px;top:${px(200.5)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.equipo_nombre}</div>
    <div style="position:absolute;left:${px(152)}px;top:${px(226.5)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.equipo_categoria}</div>
    <div style="position:absolute;left:${px(75)}px;top:${px(250)}px;color:#1a1a1a;font-weight:700;font-size:${px(22)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.dni}</div>
    <div style="position:absolute;left:${px(270)}px;top:${px(250)}px;color:#1a1a1a;font-weight:700;font-size:${px(22)}px;line-height:${px(20)}px;white-space:nowrap;">${jugador.nro_colegiatura}</div>

    <!-- Foto del jugador: marco interior x=371-492, y=150-275 -->
    <div style="position:absolute;left:${px(371)}px;top:${px(150)}px;width:${px(121)}px;height:${px(125)}px;overflow:hidden;background:#f0f0f0;">
      ${fotoJugador
        ? `<img src="${fotoJugador}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
        : ''
      }
    </div>
  </div>`

  // Coordenadas medidas en carnet_reverso.png (516x273):
  // Marco QR interior: x=425-485, y=185-240
  const reversoHTML = `
  <div style="
    width:${WR}px;height:${HR}px;
    position:relative;
    font-family:Arial,Helvetica,sans-serif;
    background-image:url('/logos/carnet_reverso.png');
    background-size:${WR}px ${HR}px;
    background-repeat:no-repeat;
  ">
    <div style="position:absolute;left:${px(431)}px;top:${px(187)}px;width:${px(62.5)}px;height:${px(62.5)}px;background:#fff;">
      ${qrBase64 ? `<img src="${qrBase64}" style="width:100%;height:100%;display:block;" />` : ''}
    </div>
  </div>`

  const canvasFrente = await renderHtmlToCanvas(frenteHTML, WF, HF)
  const canvasReverso = await renderHtmlToCanvas(reversoHTML, WR, HR)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })
  pdf.addImage(canvasFrente.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 85.6, 54)
  pdf.addPage()
  pdf.addImage(canvasReverso.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 85.6, 54)
  pdf.save(`carnet_${jugador.nombres}_${jugador.apellidos}.pdf`)
}

export const generarFicha = async (jugador: DatosJugador) => {
  const { default: jsPDF } = await import('jspdf')

  const fotoJugador = jugador.foto_url ? await urlToBase64(jugador.foto_url) : ''
  const qrUrl = `${jugador.baseUrl}/verificar/${jugador.id}`
  const qrBase64 = await QRCode.toDataURL(qrUrl, { width: 300, margin: 0 })

  // FICHA.png tamaño real = 1024 x 1025. Escala x1.5 = 1536x1537.5
  const SCALE = 1.5
  const W = 1024 * SCALE
  const H = 1025 * SCALE
  const px = (v: number) => v * SCALE

  // Coordenadas medidas con escaneo de píxeles directo sobre FICHA.png (1024x1025):
  // Cajas (interior, donde escribir el valor):
  // EQUIPO: x=255-1010, y=225-255 (centro y=240)
  // CATEGORIA: y=268-298 (centro y=283)
  // DNI: y=313-343 (centro y=328)
  // NOMBRES: y=357-387 (centro y=372)
  // APELLIDOS: y=401-431 (centro y=416)
  // FECHA NAC: x=255-415, y=445-475 (centro y=460) | EDAD: x=650-810, mismo y
  // DIRECCION: y=488-518 (centro y=503)
  // CORREO: y=532-562 (centro y=547)
  // TELEFONO: x=255-415, y=576-606 (centro y=591) | N COLEGIATURA: x=650-810, mismo y
  // FOTO marco interior: x=840-1005, y=310-497
  // QR caja interior: x=838-1004, y=692-854

  const fichaHTML = `
  <div style="
    width:${W}px;height:${H}px;
    position:relative;
    font-family:Arial,Helvetica,sans-serif;
    background-image:url('/logos/ficha_plantilla.png');
    background-size:${W}px ${H}px;
    background-repeat:no-repeat;
  ">
    <div style="position:absolute;left:${px(278)}px;top:${px(206)}px;color:#1a1a1a;font-weight:700;font-size:${px(18)}px;line-height:1;white-space:nowrap;">${jugador.equipo_nombre}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(248)}px;color:#1a1a1a;font-weight:700;font-size:${px(18)}px;line-height:1;white-space:nowrap;">${jugador.equipo_categoria}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(291)}px;color:#1a1a1a;font-weight:700;font-size:${px(18)}px;line-height:1;white-space:nowrap;">${jugador.dni}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(334)}px;color:#1a1a1a;font-weight:700;font-size:${px(18)}px;line-height:1;white-space:nowrap;">${jugador.nombres}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(377)}px;color:#1a1a1a;font-weight:700;font-size:${px(18)}px;line-height:1;white-space:nowrap;">${jugador.apellidos}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(421)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${jugador.fecha_nacimiento ? jugador.fecha_nacimiento.split('-').reverse().join('/') : ''}</div>
    <div style="position:absolute;left:${px(670)}px;top:${px(421)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${calcularEdad(jugador.fecha_nacimiento)}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(464)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${jugador.direccion}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(507)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${jugador.correo}</div>
    <div style="position:absolute;left:${px(278)}px;top:${px(550)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${jugador.telefono}</div>
    <div style="position:absolute;left:${px(670)}px;top:${px(550)}px;color:#1a1a1a;font-weight:700;font-size:${px(17)}px;line-height:1;white-space:nowrap;">${jugador.nro_colegiatura}</div>

    <!-- Foto del jugador: marco interior x=840-1005, y=310-497 -->
    <div style="position:absolute;left:${px(840)}px;top:${px(310)}px;width:${px(165)}px;height:${px(187)}px;overflow:hidden;background:#f0f0f0;">
      ${fotoJugador
        ? `<img src="${fotoJugador}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
        : ''
      }
    </div>

    <!-- QR: caja interior x=838-1004, y=692-854 -->
    <div style="position:absolute;left:${px(838)}px;top:${px(692)}px;width:${px(166)}px;height:${px(162)}px;background:#fff;">
      ${qrBase64 ? `<img src="${qrBase64}" style="width:100%;height:100%;display:block;" />` : ''}
    </div>
  </div>`

  const canvasFicha = await renderHtmlToCanvas(fichaHTML, W, H)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210, pageH = 297
  const imgRatio = H / W
  let drawW = pageW
  let drawH = pageW * imgRatio
  if (drawH > pageH) { drawH = pageH; drawW = pageH / imgRatio }
  const offsetX = (pageW - drawW) / 2
  const offsetY = 8

  pdf.addImage(canvasFicha.toDataURL('image/jpeg', 1.0), 'JPEG', offsetX, offsetY, drawW, drawH)
  pdf.save(`ficha_${jugador.nombres}_${jugador.apellidos}.pdf`)
}