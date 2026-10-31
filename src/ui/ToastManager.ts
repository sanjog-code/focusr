// ToastManager – lightweight toast queue for Focusr
// Guarantees max 2 visible toasts, 8‑second deduplication, smooth fade.

interface ToastItem {
  msg: string;
  type: string; // e.g. 'info', 'success', 'error'
  timeout: number;
  id: number;
}

class ToastManager {
  private static container: HTMLElement | null = null;
  private static queue: ToastItem[] = [];
  private static visible: ToastItem[] = [];
  private static dedupMap: Map<string, number> = new Map(); // hash -> timestamp
  private static nextId = 1;

  private static getContainer() {
    if (!this.container) {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.style.position = 'fixed';
      el.style.bottom = '20px';
      el.style.right = '20px';
      el.style.zIndex = '9999';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.gap = '8px';
      document.body.appendChild(el);
      this.container = el;
    }
    return this.container;
  }

  private static createElement(item: ToastItem) {
    const div = document.createElement('div');
    div.className = `toast toast-${item.type}`;
    div.textContent = item.msg;
    div.style.opacity = '0';
    div.style.transition = 'opacity 0.3s ease';
    div.style.padding = '10px 16px';
    div.style.borderRadius = '4px';
    div.style.background = 'rgba(30,30,30,0.9)';
    div.style.color = '#fff';
    div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    return div;
  }

  private static render() {
    const container = this.getContainer();
    // clear container
    container.innerHTML = '';
    // render visible toasts
    this.visible.forEach(item => {
      const el = this.createElement(item);
      container.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });
    });
  }

  private static pruneDedup() {
    const now = Date.now();
    for (const [hash, ts] of this.dedupMap.entries()) {
      if (now - ts > 8000) this.dedupMap.delete(hash);
    }
  }

  static show(msg: string, type: string = 'info', timeout: number = 3000) {
    // dedup based on msg+type hash
    const hash = `${type}:${msg}`;
    this.pruneDedup();
    const last = this.dedupMap.get(hash);
    if (last && Date.now() - last < 8000) return; // ignore duplicate within 8s
    this.dedupMap.set(hash, Date.now());

    const toast: ToastItem = { msg, type, timeout, id: this.nextId++ };
    // enqueue
    this.queue.push(toast);
    this.processQueue();
  }

  private static processQueue() {
    while (this.visible.length < 2 && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.visible.push(item);
      // schedule removal
      setTimeout(() => this.remove(item.id), item.timeout);
    }
    this.render();
  }

  private static remove(id: number) {
    this.visible = this.visible.filter(t => t.id !== id);
    // after removal, try to pull from queue
    this.processQueue();
  }
}

// expose globally for legacy code
if (typeof window !== 'undefined') {
  (window as any).showToast = ToastManager.show.bind(ToastManager);
}

export default ToastManager;
