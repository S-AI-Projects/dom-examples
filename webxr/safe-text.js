const input = document.querySelector("#text-input");
const output = document.querySelector("#text-output");
const renderBtn = document.querySelector("#render-text");

renderBtn.addEventListener("click", () => {
  // Use textContent to ensure any input is treated strictly as plain text
  output.textContent = input.value;
});
