const video = document.querySelector("video");

const assetURL = "frag_bunny.mp4";
// Need to be specific for Blink regarding codecs
const mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

function loadVideo() {
  const status = document.querySelector("#status");
  if (typeof MediaSource === "undefined" || !MediaSource.isTypeSupported(mimeCodec)) {
    status.textContent = "This browser cannot play this example's video format.";
    return;
  }

  status.textContent = "Loading video…";
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  mediaSource.addEventListener("sourceopen", () => sourceOpen(mediaSource), { once: true });
}

async function sourceOpen(mediaSource) {
  const status = document.querySelector("#status");
  try {
    const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    const response = await fetch(assetURL);
    if (!response.ok) throw new Error(`Video request failed with status ${response.status}`);
    const buffer = await response.arrayBuffer();
    sourceBuffer.addEventListener("updateend", () => {
      mediaSource.endOfStream();
      status.textContent = "Video loaded from the local fixture.";
      video.play().catch(() => {});
    }, { once: true });
    sourceBuffer.appendBuffer(buffer);
  } catch {
    status.textContent = "Unable to load the video. Check the local asset and try again.";
    if (mediaSource.readyState === "open") mediaSource.endOfStream("network");
    video.removeAttribute("src");
    video.load();
  }
}

const load = document.querySelector("#load");
load.addEventListener("click", loadVideo);
