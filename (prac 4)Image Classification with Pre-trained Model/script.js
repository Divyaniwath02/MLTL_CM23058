let model;

// Load MobileNet model
async function startModel() {

    const status = document.getElementById("status");
    status.innerText = "Loading MobileNet Model...";

    model = await mobilenet.load();

    status.innerText = "Model Loaded Successfully!";
    document.getElementById("classify-btn").disabled = false;
}

startModel();

const upload = document.getElementById("image-upload");
const preview = document.getElementById("image-display");

// Show uploaded image
upload.addEventListener("change", function(e){

    const file = e.target.files[0];

    if(file){

        const reader = new FileReader();

        reader.onload = function(event){
            preview.src = event.target.result;
            preview.style.display = "block";
        }

        reader.readAsDataURL(file);
    }

});

// Classification function
async function classifyImage(){

    if(!preview.src){
        alert("Please upload an image first");
        return;
    }

    const results = await model.classify(preview);

    const list = document.getElementById("predictions-list");
    list.innerHTML = "";

    results.forEach(function(item){

        const li = document.createElement("li");

        li.innerText = item.className + " : " + (item.probability * 100).toFixed(2) + "%";

        list.appendChild(li);

    });

}