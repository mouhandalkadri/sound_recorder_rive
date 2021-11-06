const rive = window.rive;
const rxjs = window.rxjs;

const MAX_UNIT8ARRAY = Math.pow(2, 8);
const MIN_LENGTH = 20;
const MAX_LENGTH = 150;
const isRecordingDiv = document.getElementById("is_recording");
const height$ = new rxjs.BehaviorSubject(10);

var distHeight = 10;
var recorder;
var ctx;
var analyser;
var processNode;
var mediaSourceStream;

document.addEventListener("DOMContentLoaded", () => {
    playAnimation();

    rxjs.interval(0, rxjs.animationFrameScheduler).pipe(
        rxjs.filter(() => recorder && recorder.state === "recording")
    ).subscribe(() => {
        const diff = distHeight - height$.getValue() + 1;
        height$.next(height$.getValue() + (diff * .4));
    })
})

function playAnimation() {
    const riveAnimation = new rive.Rive({
        src: "./assets/water-bar.riv",
        autoplay: true,
        canvas: document.getElementById("animation"),
        stateMachines: "State Machine",
        onload: () => {
            const inputs = riveAnimation.stateMachineInputs("State Machine");
            const level = inputs.find(input => input.name === "Level");
            height$.subscribe(value => {
                level.value = value;
            });
        }
    });

}

function setUpRecorder() {
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    processNode = ctx.createScriptProcessor(2048, 1, 1);

    if (!navigator.mediaDevices) {
        alert("Recorder is not supported");
    }
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            recorder = new MediaRecorder(stream);
            mediaSourceStream = ctx.createMediaStreamSource(stream);
            processNode.onaudioprocess = prcoessAudio;

            mediaSourceStream.connect(analyser);
            analyser.connect(processNode);
            processNode.connect(ctx.destination);

        })


}

function changeUI(isRecording = false) {
    if (isRecording)
        isRecordingDiv.classList.add("recording")
    else
        isRecordingDiv.classList.remove("recording")
}

function startRecord() {
    if (!recorder) {
        setUpRecorder().then(() => recorder.start());
    }
    else {
        recorder.start();
    }

    changeUI(true);
}

function stopRecord() {
    recorder.stop();
    changeUI(false);
}

function prcoessAudio() {
    const array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    const avg = calcAvg(array);
    distHeight = mapBetween(avg, 0, MAX_UNIT8ARRAY, MIN_LENGTH, MAX_LENGTH);
}

function calcAvg(array) {
    const sum = array.reduce((a, b) => a + b, 0);
    return sum / array.length;
}

function mapBetween(value, min, max, destMin, destMax) {
    return (value - min) / (max - min) * (destMax - destMin) + destMin;
}

