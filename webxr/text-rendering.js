const input = document.querySelector("#fixture-text");
const renderButton = document.querySelector("#render-text");
const output = document.querySelector("#text-output");

renderButton.addEventListener("click", () => {
  output.textContent = input.value;
});
