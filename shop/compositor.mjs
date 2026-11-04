const sheets = new Map();

function loadSheet(url) {
  if (!sheets.has(url)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { sheets.delete(url); reject(new Error('Could not load the artwork. Please try again.')); };
      image.src = url;
    });
    sheets.set(url, promise);
  }
  return sheets.get(url);
}

function writeText(context, value, rect, colour) {
  if (!value.trim()) return;
  const [x, y, width, height] = rect;
  let lines;
  for (let size = Math.min(44, Math.floor(height * .85)); size >= 4; size--) {
    context.font = 'bold ' + size + 'px system-ui, sans-serif';
    lines = [];
    for (const paragraph of value.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line && context.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
        for (const character of word) {
          if (context.measureText(line + character).width > width) { lines.push(line); line = ''; }
          line += character;
        }
        line += ' ';
      }
      lines.push(line.trimEnd());
    }
    if (lines.length * size * 1.23 > height) continue;
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = colour;
    lines.forEach((line, i) => context.fillText(line.trimEnd(), x + width / 2, y + height / 2 + (i - (lines.length - 1) / 2) * size * 1.23));
    return;
  }
}

export async function composePNG(item, draft) {
  const [sheet, mask] = await Promise.all([loadSheet(item.sheet), item.maskSheet && loadSheet(item.maskSheet)]);
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = draft.extra.trim() ? 768 : 640;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  if (draft.shape === 'Oval') ctx.ellipse(320,320,311,311,0,0,2*Math.PI);
  else ctx.roundRect(9,9,622,622,draft.shape === 'Square' ? 0 : 38);
  if (draft.background) { ctx.fillStyle = draft.background; ctx.fill(); }
  if (draft.border) { ctx.strokeStyle = draft.border; ctx.lineWidth = 5; ctx.stroke(); }
  const [, , sw, sh] = item.rect;
  const scale = Math.min(574 / sw, 574 / sh);
  const width = sw * scale, height = sh * scale, x = (640-width)/2, y = (640-height)/2;
  if (draft.photo && mask) {
    const [l,t,r,b] = item.opening;
    const pw = (r-l)*width, ph = (b-t)*height;
    const fit = Math.max(pw / draft.photo.width, ph / draft.photo.height) * draft.zoom;
    const photo = document.createElement('canvas'); photo.width = photo.height = 640;
    const layer = photo.getContext('2d');
    layer.drawImage(draft.photo, x+l*width+(pw-draft.photo.width*fit)*draft.panX, y+t*height+(ph-draft.photo.height*fit)*draft.panY, draft.photo.width*fit, draft.photo.height*fit);
    layer.globalCompositeOperation='destination-in';
    layer.drawImage(mask, ...item.rect, x,y,width,height);
    ctx.drawImage(photo,0,0);
  }
  ctx.drawImage(sheet, ...item.rect, x,y,width,height);
  if (item.textBox) {
    const [l,t,r,b]=item.textBox;
    writeText(ctx,draft.words,[x+l*width,y+t*height,(r-l)*width,(b-t)*height],item.ink);
  }
  if (draft.extra.trim()) {
    ctx.fillStyle='#fff4da'; ctx.beginPath(); ctx.roundRect(10,643,620,116,18); ctx.fill();
    writeText(ctx,draft.extra,[26,652,588,96],'#273d31');
  }
  return canvas;
}
