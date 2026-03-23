// 1. Sabse pehle HTML elements ko sahi ID se fetch karein
const video = document.getElementById("webcamVideo");
const canvas = document.getElementById("detectionCanvas");
const ctx = canvas.getContext("2d");
const predictionsBox = document.getElementById("predictionOutput");
const loadingText = document.getElementById("modelLoading");

let model;

// 2. Webcam start karne ka function
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
    } catch (err) {
        console.error("Webcam access denied: ", err);
        predictionsBox.innerHTML = "<p style='color:red;'>Error: Camera access denied.</p>";
    }
}

// 3. AI model (COCO-SSD) load karein
async function loadDetectionModel() {
    model = await cocoSsd.load();
    // Model load hone ke baad loading text chhupa dein
    loadingText.style.display = "none";
}

// 4. Canvas par boxes draw karne ka function
function drawBoxes(objects) {
    // Purana drawing saaf karein
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(obj => {
        const [x, y, width, height] = obj.bbox;

        // Box ka style
        ctx.strokeStyle = "#00FF00"; // Green color
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Label ka style
        const label = obj.class + " " + (obj.score * 100).toFixed(1) + "%";
        ctx.fillStyle = "#00FF00";
        ctx.font = "18px Arial";
        ctx.fillText(label, x, y > 20 ? y - 5 : 15);
    });
}

// 5. Detected objects ki list UI mein dikhana
function updatePredictionList(objects) {
    predictionsBox.innerHTML = "";

    if (objects.length === 0) {
        predictionsBox.innerHTML = "<p class='waiting-text'>No objects detected</p>";
        return;
    }

    objects.forEach((obj, index) => {
        const div = document.createElement("div");
        div.className = "prediction-item";
        div.style.padding = "5px";
        div.style.borderBottom = "1px solid #ddd";
        div.innerText = `${index + 1}. ${obj.class} (${(obj.score * 100).toFixed(2)}%)`;
        predictionsBox.appendChild(div);
    });
}

// 6. Real-time detection loop
async function detectObjects() {
    if (model) {
        const predictions = await model.detect(video);

        // Canvas ka size video ke barabar karein
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        drawBoxes(predictions);
        updatePredictionList(predictions);
    }
    // Agle frame ke liye call karein
    requestAnimationFrame(detectObjects);
}

// 7. Application start karein jab page load ho jaye
async function startApp() {
    await startWebcam();
    await loadDetectionModel();
    detectObjects();
}

window.addEventListener("load", startApp);
