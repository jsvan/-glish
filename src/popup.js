document.getElementById("Title").addEventListener("click", forcerun);
document.getElementById("Aggression").addEventListener("mouseup", sendAggression);
document.getElementById("Aggression").addEventListener("input", function(){changeRange("Aggression")});
document.getElementById("Chance").addEventListener("mouseup", sendChance);
document.getElementById("Chance").addEventListener("input", function(){changeRange("Chance")});
document.getElementById("Boredom").addEventListener("mouseup", sendBoredom);
document.getElementById("Boredom").addEventListener("input", function(){changeRange("Boredom", "Aggression")});
document.getElementById("Activated").addEventListener('change', activate);
document.getElementById("LanguageSelect").addEventListener("change", set_fgn)
document.getElementById("Support").addEventListener("mouseup", function(){hideshow("Support")});
document.getElementById("About").addEventListener("mouseup", function(){hideshow("About")});
document.getElementById("Instructions").addEventListener("mouseup", function(){hideshow("Instructions")});


window.addEventListener('load',
    function() {
        load_page();
    }, false);


function hideshow(id) {
    const link = document.getElementById(id);
    const menustyle = document.getElementById(id+"_Menu").style;
    if (menustyle.display === 'none'){
        menustyle.display = 'block';
        link.innerText = "Hide " + link.innerText
    } else {
        menustyle.display = 'none';
        link.innerText = link.innerText.substring(5);
    }
}

function forcerun(){
    console.log("sending force run command")
    chrome.runtime.sendMessage({message:"frc_run"}, function(response){
        console.log("sent force");
    });
}

function set_fgn() {
    let langname = lowerize(document.getElementById("LanguageSelect").value);
    console.log("Sending forieng langauge, ["+langname+"]");
    chrome.runtime.sendMessage({message: "set_lng", payload: langname}, function(response) {
        console.log("Got response for set_lng, ["+response+"]")
    });
}

function activate() {
    document.getElementById('Activated').toggleAttribute("checked", true); //setAttribute("checked")
    chrome.runtime.sendMessage({message: "set_act"}, function(response){
        console.log("sent activate");
    });
}

function sendAggression(){
    changeRange("Aggression");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_agr", payload: document.getElementById("Aggression").value}, function(response){
        console.log("sent aggression");
    });
}
function sendChance(){
    changeRange("Chance");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_chn", payload: document.getElementById("Chance").value}, function(response){
        console.log("sent chance");
    });
}
function sendBoredom(){
    changeRange("Boredom");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_brd", payload: document.getElementById("Boredom").value}, function(response){
        console.log("sent boredom");
    });
}
function changeRange(id){
    document.getElementById(id+"Count").innerHTML = document.getElementById(id).value + "%";
}

function changeBoredomRange() {
    const aggroval = document.getElementById("Aggression").value;
    const rangebar = document.getElementById("Boredom");
    rangebar.max = ""+aggroval;
    if (rangebar.value > aggroval){
        rangebar.value = aggroval;
        changeRange("Boredom");
    }
}

function load_page() {
    // Populate language options
    const url = chrome.runtime.getURL("./updated_language_packs/available_languages.txt");
    fetch(url)
        .then((response) => response.text())
        .then((text) => langs2menu(text))
        .then(() => setChosenLang());

    chrome.runtime.sendMessage({message: "get_act"}, function(response){
        console.log("GETACT:..")
        console.log(response);
        console.log(typeof response.payload);
        console.log(response.payload);
        let activated_val = response.payload;
        if (activated_val) {
            document.getElementById('Activated').toggleAttribute("checked", true);
        }
    });
    chrome.runtime.sendMessage({message: "get_agr"}, function(response){
        const newagr = response.payload;
        document.getElementById("Aggression").value = newagr;
        changeRange("Aggression");
        console.log("Aggression is now: " + newagr);
    });
    chrome.runtime.sendMessage({message: "get_chn"}, function(response){
        const newchn = response.payload;
        document.getElementById("Chance").value = newchn;
        changeRange("Chance");
        console.log("Chance is now: " + newchn);
    });
    chrome.runtime.sendMessage({message: "get_brd"}, function(response){
        const newbrd = response.payload;
        document.getElementById("Boredom").value = newbrd;
        changeRange("Boredom");
        console.log("Boredom is now: " + newbrd);
    });
}

function setChosenLang() {
    chrome.runtime.sendMessage({message: "get_lng"}, function(response){
        const langname = response.payload;
        console.log(langname);
        if (langname) {
            console.log("Because there is a langname ("+langname+"), we are setting it to selected...")
            document.getElementById("defaultopt").removeAttribute("selected")
            document.getElementById(langname).setAttribute("selected", "selected")
        }
        console.log("Selected language is now: " + langname + ".");

    });
}

function langs2menu(text) {
    console.log(text);
    console.log(typeof text);
    text = text.split('\n');
    console.log(text);
    console.log(typeof text);

    const langname2option = function (langname)
        { let x = document.createElement("option" );
        x.textContent = capitalize(langname);
        x.setAttribute("id", langname);
        return x;
        };

    for (let i = 0; i < text.length; i++) {
        let line = text[i];
        let lang = line.toString().split("\t")[0];
        document.getElementById("LanguageSelect").appendChild(langname2option(lang));
    }

}

function capitalize(word){
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function lowerize(word){
    return word.charAt(0).toLowerCase() + word.slice(1);
}