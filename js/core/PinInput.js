export function bindPinInputs(root) {
  root.querySelectorAll(".pin-code-input").forEach((input) => {
    const wrapper = input.closest(".pin-input-wrap");
    if (!wrapper) return;

    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", input.getAttribute("aria-label") || "PIN");
    wrapper.querySelectorAll(".pin-digit").forEach((digit) => digit.remove());
    const digits = Array.from({ length: input.maxLength }, () => {
      const digit = document.createElement("span");
      digit.className = "pin-digit";
      digit.setAttribute("aria-hidden", "true");
      wrapper.append(digit);
      return digit;
    });

    const renderDigits = () => {
      for (const [index, digit] of digits.entries())
        digit.textContent = input.value[index] ? "•" : "";
    };
    const normalize = () => {
      const digits = input.value.replace(/\D/g, "").slice(0, input.maxLength);
      if (input.value !== digits) input.value = digits;
      renderDigits();
    };

    renderDigits();
    input.addEventListener("input", normalize);
    input.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text");
      if (text === undefined) return;
      event.preventDefault();
      input.value = text.replace(/\D/g, "").slice(0, input.maxLength);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}
