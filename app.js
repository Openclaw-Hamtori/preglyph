const inscriptionEls = document.querySelectorAll('.inscription');

const sanitizeText = (text) =>
  (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 .,;:'"!?\-]/g, '')
    .toUpperCase();

const buildMatrix = (text, size = 12) => {
  const cleaned = sanitizeText(text).slice(0, size * size);
  const padded = cleaned.padEnd(size * size, ' ');

  return padded.split('').map((char) => {
    const cell = document.createElement('span');
    cell.className = char === ' ' ? 'cell empty' : 'cell';
    cell.textContent = char === ' ' ? '·' : char;
    return cell;
  });
};

inscriptionEls.forEach((el) => {
  const text = el.dataset.text || '';
  const cells = buildMatrix(text);
  cells.forEach((cell) => el.appendChild(cell));
});

const canvas = document.getElementById('slab-canvas');

if (canvas) {
  const context = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let offset = 0;

  const draw = () => {
    if (!context) return;
    context.clearRect(0, 0, width, height);

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(231, 221, 205, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const cols = 12;
    const rows = 12;
    const cellW = width / cols;
    const cellH = height / rows;

    context.strokeStyle = 'rgba(226, 214, 194, 0.08)';
    context.lineWidth = 1;

    for (let i = 1; i < cols; i += 1) {
      const x = Math.round(i * cellW) + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let i = 1; i < rows; i += 1) {
      const y = Math.round(i * cellH) + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.strokeStyle = 'rgba(214, 178, 122, 0.12)';
    context.lineWidth = 1.25;

    for (let i = 0; i < rows; i += 1) {
      const y = i * cellH + cellH * 0.5;
      const wave = Math.sin((i * 0.75) + offset) * cellW * 0.18;
      context.beginPath();
      context.moveTo(cellW * 1.2 + wave, y);
      context.lineTo(width - cellW * 1.2 - wave, y);
      context.stroke();
    }

    context.fillStyle = 'rgba(236, 225, 207, 0.15)';
    for (let i = 0; i < cols; i += 1) {
      const x = i * cellW + cellW * 0.5 + Math.sin(offset + i * 0.8) * 4;
      for (let j = 0; j < rows; j += 3) {
        const y = j * cellH + cellH * 0.5 + Math.cos(offset + j * 0.6) * 4;
        context.beginPath();
        context.arc(x, y, 1.2, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const bounds = parent.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width * DPR));
    height = Math.max(1, Math.floor(bounds.height * DPR));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(DPR, DPR);
    width = bounds.width;
    height = bounds.height;
    draw();
  };

  const animate = () => {
    offset += 0.01;
    draw();
    requestAnimationFrame(animate);
  };

  resize();
  animate();
  window.addEventListener('resize', resize);
}
