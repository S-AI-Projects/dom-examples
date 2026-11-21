const input = document.querySelector("#text-input");
const output = document.querySelector("#text-output");

document.querySelector("#render-text").addEventListener("click", () => {
  output.textContent = input.value;
});
