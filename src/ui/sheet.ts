// Panel: trên desktop là cột bên trái; trên điện thoại là tấm trượt từ đáy (bottom sheet) với 3 nấc.
// Tỉnh có dạng dài Bắc–Nam nên nấc "peek" giữ gần trọn màn hình cho bản đồ.
export type Snap = 'peek' | 'half' | 'full';

const MOBILE = window.matchMedia('(max-width: 720px)');
export const isMobile = () => MOBILE.matches;

const PEEK_PX = 132;

function snapHeight(s: Snap): number {
  const vh = window.innerHeight;
  if (s === 'peek') return PEEK_PX;
  if (s === 'half') return Math.round(vh * 0.5);
  return vh - 56;
}

export function createSheet(panel: HTMLElement, handleArea: HTMLElement, onSnap: (s: Snap) => void) {
  let snap: Snap = 'peek';
  let height = snapHeight(snap);

  const apply = (h: number, animate: boolean) => {
    height = h;
    panel.style.transition = animate ? 'transform 260ms cubic-bezier(.2,.8,.2,1)' : 'none';
    panel.style.transform = `translateY(${snapHeight('full') - h}px)`;
    document.documentElement.style.setProperty('--sheet-h', `${h}px`);
  };

  function setSnap(s: Snap, animate = true) {
    snap = s;
    if (!isMobile()) {
      panel.style.transform = '';
      document.documentElement.style.removeProperty('--sheet-h');
      return;
    }
    apply(snapHeight(s), animate);
    panel.dataset.snap = s;
    onSnap(s);
  }

  // Kéo bằng tay trên vùng tay nắm/đầu panel.
  let startY = 0;
  let startH = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let dragging = false;

  handleArea.addEventListener('pointerdown', (e) => {
    if (!isMobile() || (e.target as HTMLElement).closest('input, button, a')) return;
    dragging = true;
    startY = lastY = e.clientY;
    startH = height;
    lastT = performance.now();
    velocity = 0;
    handleArea.setPointerCapture(e.pointerId);
  });
  handleArea.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    velocity = (lastY - e.clientY) / Math.max(1, now - lastT);
    lastY = e.clientY;
    lastT = now;
    const h = Math.min(snapHeight('full'), Math.max(PEEK_PX - 40, startH + (startY - e.clientY)));
    apply(h, false);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    const order: Snap[] = ['peek', 'half', 'full'];
    // Vuốt nhanh: sang nấc kế tiếp theo hướng vuốt; kéo chậm: về nấc gần nhất.
    let target: Snap;
    if (Math.abs(velocity) > 0.5) {
      const i = order.indexOf(snap);
      const cur = order.reduce((a, b) => (Math.abs(snapHeight(b) - height) < Math.abs(snapHeight(a) - height) ? b : a));
      const base = Math.abs(snapHeight(cur) - height) < 24 ? order.indexOf(cur) : i;
      target = order[Math.min(2, Math.max(0, base + (velocity > 0 ? 1 : -1)))];
    } else {
      target = order.reduce((a, b) => (Math.abs(snapHeight(b) - height) < Math.abs(snapHeight(a) - height) ? b : a));
    }
    setSnap(target);
  };
  handleArea.addEventListener('pointerup', end);
  handleArea.addEventListener('pointercancel', end);
  // Chạm vào tay nắm (không kéo) thì chuyển nấc.
  handleArea.querySelector('.sheet-handle')?.addEventListener('click', () => {
    setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'half');
  });

  MOBILE.addEventListener('change', () => setSnap(snap, false));
  window.addEventListener('resize', () => setSnap(snap, false));
  setSnap(snap, false);

  return {
    setSnap,
    get snap() {
      return snap;
    },
    /** Chiều cao sẽ che bản đồ ở nấc `s` (mặc định nấc hiện tại); 0 trên desktop. */
    coveredHeight(s: Snap = snap) {
      return isMobile() ? snapHeight(s) : 0;
    },
  };
}

export type Sheet = ReturnType<typeof createSheet>;
