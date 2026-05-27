// 全局模态框拖拽功能
// 通过 MutationObserver 监听 .ant-modal-root 出现，自动为标题栏添加拖拽支持
// 在 main.tsx 中 import 一次即可生效所有弹窗

(function () {
  const DRAGGED_ATTR = 'data-draggable-initialized';

  function makeDraggable(modalRoot: HTMLElement) {
    if (modalRoot.getAttribute(DRAGGED_ATTR)) return;
    modalRoot.setAttribute(DRAGGED_ATTR, 'true');

    const header = modalRoot.querySelector<HTMLElement>('.ant-modal-header');
    if (!header) return;

    header.style.cursor = 'move';

    const content = modalRoot.querySelector<HTMLElement>('.ant-modal-content');
    if (!content) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      const rect = content.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      content.style.position = 'fixed';
      content.style.margin = '0';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      content.style.left = `${e.clientX - offsetX}px`;
      content.style.top = `${e.clientY - offsetY}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    header.addEventListener('mousedown', onMouseDown);
    // 全局 mouse 事件，不绑在 header 上，避免拖太快移出 header 丢失事件
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 当 modal 被卸载时清理
    const observer = new MutationObserver(() => {
      if (!document.contains(modalRoot)) {
        header.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 监听新弹窗出现
  const rootObserver = new MutationObserver(() => {
    document.querySelectorAll<HTMLElement>('.ant-modal-root').forEach(makeDraggable);
  });
  rootObserver.observe(document.body, { childList: true, subtree: true });

  // 初始扫描（如果已经有弹窗了）
  document.querySelectorAll<HTMLElement>('.ant-modal-root').forEach(makeDraggable);
})();

export {};
