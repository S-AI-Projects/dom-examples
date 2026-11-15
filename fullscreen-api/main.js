window.addEventListener("load", startup, false);

function startup() {
  const video = document.getElementById("video");
  const status = document.getElementById("fullscreen-status");

  const fullscreenSupported =
    document.fullscreenEnabled &&
    typeof video.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function";

  if (!fullscreenSupported) {
    status.textContent =
      "Fullscreen mode is not supported by this browser.";
    return;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.repeat) {
      toggleFullScreen(video, status);
    }
  });
}

async function toggleFullScreen(video, status) {
  try {
    if (!document.fullscreenElement) {
      await video.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }

    status.textContent = "";
  } catch (error) {
    status.textContent = "Unable to change fullscreen mode.";
  }
}