"use strict";

const fixtureInput = document.querySelector("#fixtureInput");
const renderButton = document.querySelector("#renderButton");
const textOutput = document.querySelector("#textOutput");

if (!fixtureInput || !renderButton || !textOutput) {
  throw new Error("Safe text-rendering controls could not be found.");
}

function renderFixtureAsText() {
  // textContent treats the input as text, never as HTML.
  textOutput.textContent = fixtureInput.value;
}

renderButton.addEventListener("click", renderFixtureAsText);

// Display the initial fixture safely when the page loads.
renderFixtureAsText();
