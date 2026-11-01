export class Toast {
  static element = null;
  static timer = 0;

  static init(element) {
    Toast.element = element;
  }

  static show(message) {
    if (!Toast.element) return;
    Toast.element.textContent = message;
    Toast.element.classList.add("on");
    if (Toast.element.matches(":popover-open")) Toast.element.hidePopover();
    Toast.element.showPopover();
    window.clearTimeout(Toast.timer);
    Toast.timer = window.setTimeout(() => {
      Toast.element?.classList.remove("on");
      if (Toast.element?.matches(":popover-open")) Toast.element.hidePopover();
    }, 3200);
  }
}
