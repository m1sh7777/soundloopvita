// loop-basics.js
// SIMPLIFIED demo of the Sound Loop idea. This is NOT the full project code.
// The real app also trims silence, keeps loops on a 120 BPM beat,
// snaps pitch to a scale, and limits how many orbs exist.

// One AudioContext for the whole page. Think of it as the audio "room".
const ctx = new AudioContext();

let recorder = null;   // the MediaRecorder that records the mic
let stream = null;     // the mic stream (we need it so we can turn the mic off)
let chunks = [];       // little pieces of recorded audio
let loopCount = 0;

const recBtn = document.querySelector("#rec");
const panSlider = document.querySelector("#pan");
const pitchSlider = document.querySelector("#pitch");
const statusText = document.querySelector("#status");

async function startRecording() {
  // Ask for the mic. Only works on localhost or https.
  // On phones this has to happen right inside the tap, or it can get blocked.
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true },
  });

  chunks = [];
  recorder = new MediaRecorder(stream);

  // The recorder hands us the audio in chunks, we just collect them.
  recorder.ondataavailable = (e) => chunks.push(e.data);

  // When recording stops, turn the chunks into something we can play.
  recorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop()); // turn the mic off

    const blob = new Blob(chunks);
    const bytes = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(bytes); // now it's playable audio

    makeLoop(buffer, Number(panSlider.value), Number(pitchSlider.value));
  };

  recorder.start();
}

function stopRecording() {
  if (recorder && recorder.state === "recording") recorder.stop();
}

function makeLoop(buffer, pan, pitch) {
  // The source plays the recording.
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;                 // repeat forever
  source.playbackRate.value = pitch;  // 1 = normal, 2 = double speed and an octave up

  // The panner decides left or right. -1 is full left, 1 is full right.
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  // The chain: source -> panner -> speakers
  source.connect(panner);
  panner.connect(ctx.destination);
  source.start();

  loopCount++;
  statusText.textContent = "Loops: " + loopCount;
}

// Hold to record, let go to stop.
recBtn.addEventListener("pointerdown", async () => {
  await ctx.resume(); // browsers keep audio paused until you touch the page
  try {
    await startRecording();
  } catch (err) {
    // Shows the real reason, like NotAllowedError when the mic is blocked
    statusText.textContent = "Mic error: " + err.name;
  }
});
recBtn.addEventListener("pointerup", stopRecording);
recBtn.addEventListener("pointerleave", stopRecording);
