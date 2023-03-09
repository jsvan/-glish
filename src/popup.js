const DEBUG = false;
let AGR = 0, BRD = 0;

document.getElementById("Aggression").addEventListener("mouseup", sendAggression);
document.getElementById("Boredom").addEventListener("mouseup", sendBoredom);
document.getElementById("Chance").addEventListener("mouseup", sendChance);

document.getElementById("About").addEventListener("mouseup", function(){hideshow("About")});
document.getElementById("Instructions").addEventListener("mouseup", function(){hideshow("Instructions")});
document.getElementById("Game").addEventListener("mouseup", function(){hideshow("Game")});
document.getElementById("Rules").addEventListener("mouseup", function(){hideshow("Rules")});
document.getElementById("Settings").addEventListener("mouseup", function(){hideshow("Settings")});
document.getElementById("Support").addEventListener("mouseup", function(){hideshow("Support")});

document.getElementById("Aggression").addEventListener("input", changeAggression);
document.getElementById("Boredom").addEventListener("input", changeBoredom);
document.getElementById("Chance").addEventListener("input", function(){changeRange("Chance")});
document.getElementById("Gogowords").addEventListener("input", () => textareaChanged("Gogowords"))
document.getElementById("Nogozones").addEventListener("input", () => textareaChanged("Nogozones"))
document.getElementById("Nonowords").addEventListener("input", () => textareaChanged("Nonowords"))

document.getElementById("Activated").addEventListener('change', activate);
document.getElementById("Bold").addEventListener('change', bold);
document.getElementById("ExactLetter").addEventListener('change', exactletter);
document.getElementById("EnableGame").addEventListener('change', togglegame);
document.getElementById("Italic").addEventListener('change', italic);
document.getElementById("LanguageSelect").addEventListener("change", set_fgn);
document.getElementById("RightToLeft").addEventListener('change', righttoleft);
document.getElementById("Skipproper").addEventListener('change', skipproper);

document.getElementById("Advanced").addEventListener("click", ()=>quickskill(90,76,80))
document.getElementById("Beginner").addEventListener("click", ()=>quickskill(16,0,15))
document.getElementById("Intermediate").addEventListener("click", ()=>quickskill(50,16,25))
document.getElementById("Gogowords_save").addEventListener("click", ()=> saveTextarea("Gogowords"))
document.getElementById("Nogozones_save").addEventListener("click", ()=> saveTextarea("Nogozones"))
document.getElementById("Nonowords_save").addEventListener("click", ()=> saveTextarea("Nonowords"))


window.addEventListener('load',
    function() {
        load_page();
    }, false);

function textareaChanged(id) {
    outlinecolor(id, "red")
    const btn = document.getElementById(id + "_save");
    btn.innerText = "Save";
    btn.backgroundColor = "";
    btn.style.borderWidth = '2px';
    btn.style.color = "";
    btn.style.borderColor = "";
}

function buttonSaveState(id) {
    const btn = document.getElementById(id);
    btn.innerText = "Saved"
    btn.style.color = '#707070'
    btn.style.borderWidth = '1px';
    btn.style.backgroundColor = 'whitesmoke'
    outlinecolor(id, "lightgray")
}

function saveTextarea(id){
    const textarea = document.getElementById(id);
    buttonSaveState(id + "_save")
    outlinecolor(id, "")
    const text = textarea.value;
    let items = text.split('\n').map(ii => ii.trim());
    items = items.filter(ii => ii);
    if (id === "Nonowords"){
        items = items.map((x) => x.toLowerCase());
    }
    chrome.runtime.sendMessage({message: "set_" + id.toLowerCase(), payload: items}, function(response) {
        print("Got response for set_lng, ["+response+"]")
    });
    textarea.value = items.join('\n');
    setTimeout(()=>outlinecolor(id, "#00ba5d"), 75)
    setTimeout(()=>outlinecolor(id, ""), 800)
}

function outlinecolor(id, color){
    document.getElementById(id).style.borderColor = color;
}

function quickskill(aggro, bored, chanc) {
    document.getElementById("Aggression").value = aggro;
    document.getElementById("Boredom").value = bored;
    document.getElementById("Chance").value = chanc;
    sendAggression();
    sendBoredom();
    sendChance();
}

function hideshow(id) {
    const link = document.getElementById(id);
    const menustyle = document.getElementById(id+"_Menu").style;
    if (menustyle.display === 'none'){
        menustyle.display = 'block';
        link.innerText = "Hide " + link.innerText;
    } else {
        menustyle.display = 'none';
        link.innerText = link.innerText.substring(5);
    }
}

function set_fgn() {
    const selectmenu = document.getElementById("LanguageSelect");
    selectmenu.style.borderWidth = "0px";
    let langname = lowerize(selectmenu.value);
    print("Sending forieng langauge, ["+langname+"]");
    chrome.runtime.sendMessage({message: "set_lng", payload: langname}, function(response) {
        print("Got response for set_lng, ["+response+"]")
    });
}

function activate() {
    //document.getElementById('Activated').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_act"}, function(response){
        print("sent activate");
    });
}


function togglegame() {
    //document.getElementById('ExactLetter').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_gme"}, function(response){
        print("sent gametogg");
    });
}

function righttoleft() {
    chrome.runtime.sendMessage({message: "set_r2l"}, function(response){
        print("sent righttoleft");
    });
}

function exactletter() {
    //document.getElementById('Activated').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_xlt"}, function(response){
        print("sent exactletter");
    });
}

function bold() {
    //document.getElementById('Bold').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_bld"}, function(response){
        print("sent bold");
    });
}
function italic() {
    //document.getElementById('Italic').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_itl"}, function(response){
        print("sent italic");
    });
}
function skipproper() {
    //document.getElementById('Skipproper').toggleAttribute("checked", true);
    chrome.runtime.sendMessage({message: "set_prp"}, function(response){
        print("sent proper");
    });
}

function sendAggression(){
    changeRange("Aggression");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_agr", payload: document.getElementById("Aggression").value}, function(response){
        print("sent aggression");
        AGR = response.payload;
        set_vocab_size();
    });
}
function sendChance(){
    changeRange("Chance");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_chn", payload: document.getElementById("Chance").value}, function(response){
        print("sent chance");
    });
}
function sendBoredom(){
    changeRange("Boredom");
    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_brd", payload: document.getElementById("Boredom").value}, function(response){
        print("sent boredom");
        BRD = response.payload;
        set_vocab_size();
    });
}
function changeBoredom() {
    const id = "Boredom";
    BRD = document.getElementById(id).value;
    changeRange(id);
    set_vocab_size();
}

function changeAggression() {
    const id = "Aggression";
    AGR = document.getElementById(id).value;
    changeRange(id);
    set_vocab_size();
}


function changeRange(id){
    document.getElementById(id+"Count").innerHTML = document.getElementById(id).value + "%";
}


function load_page() {
    // Populate language options
    const url = chrome.runtime.getURL("./updated_language_packs/available_languages.txt");
    fetch(url)
        .then((response) => response.text())
        .then((text) => langs2menu(text))
        .then(() => setChosenLang());

    chrome.runtime.sendMessage({message: "get_act"}, function(response){
        print("GETACT:..")
        print(response);
        print(typeof response.payload);
        print(response.payload);
        let activated_val = response.payload;
        if (activated_val) {
            document.getElementById('Activated').toggleAttribute("checked", true);
        }
    });

    chrome.runtime.sendMessage({message: "get_sty"}, function(response){
        if (response.glishbold) {
            document.getElementById('Bold').toggleAttribute("checked", true);
        }
        if (response.glishitalic) {
            document.getElementById('Italic').toggleAttribute("checked", true);
        }
    });
    chrome.runtime.sendMessage({message: "get_gme"}, function(response){
        if (response.payload) {
            document.getElementById('EnableGame').toggleAttribute("checked", true);
        }
    });
    chrome.runtime.sendMessage({message: "get_xlt"}, function(response){
        if (response.payload) {
            document.getElementById('ExactLetter').toggleAttribute("checked", true);
        }
    });
    chrome.runtime.sendMessage({message: "get_r2l"}, function(response){
        if (response.payload) {
            document.getElementById('RightToLeft').toggleAttribute("checked", true);
        }
    });

    chrome.runtime.sendMessage({message: "get_agr"}, function(response){
        const newagr = response.payload;
        AGR = newagr;
        document.getElementById("Aggression").value = newagr;
        changeRange("Aggression");
        print("Aggression is now: " + newagr);
        chrome.runtime.sendMessage({message: "get_brd"}, function(response){
            const newbrd = response.payload;
            document.getElementById("Boredom").value = newbrd;
            changeRange("Boredom");
            print("Boredom is now: " + newbrd);
            BRD = newbrd;
            set_vocab_size();
        });
    });

    chrome.runtime.sendMessage({message: "get_chn"}, function(response){
        const newchn = response.payload;
        document.getElementById("Chance").value = newchn;
        changeRange("Chance")
        print("Chance is now: " + newchn);
    });

    chrome.runtime.sendMessage({message: "get_txs"}, function(response){
        document.getElementById("Nonowords").value = response.nonowords.join('\n');
        document.getElementById("Gogowords").value = response.gogowords.join('\n');
        document.getElementById("Nogozones").value = response.nogozones.join('\n');
    });
    chrome.runtime.sendMessage({message: "get_prp"}, function(response){
        if (!response.skipproper){
            document.getElementById('Skipproper').toggleAttribute("checked", true);
        }
    });


    buttonSaveState("Nonowords_save");
    buttonSaveState("Nogozones_save");

}

function setChosenLang() {
    chrome.runtime.sendMessage({message: "get_lng"}, function(response){
        const langname = response.payload;
        print(langname);
        if (langname) {
            print("Because there is a langname ("+langname+"), we are setting it to selected...")
            document.getElementById("defaultopt").removeAttribute("selected")
            document.getElementById("LanguageSelect").style.borderWidth = "0px";
            document.getElementById(langname).setAttribute("selected", "selected")
        }
        print("Selected language is now: " + langname + ".");

    });
}

function langs2menu(text) {
    text = text.split('\n');
    const langname2option = function (langname) {
        let x = document.createElement("option" );
        x.textContent = capitalize(langname);
        x.setAttribute("id", langname);
        return x;
        };

    for (let i = 0; i < text.length; i++) {
        let line = text[i];
        let lang = line.toString().split("\t")[0];
        if (lang)
            document.getElementById("LanguageSelect").appendChild(langname2option(lang));
    }

}

function capitalize(word){
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function lowerize(word){
    return word.charAt(0).toLowerCase() + word.slice(1);
}

function print(s) {
    if (DEBUG) {
        console.log(s);
    }
}

function set_vocab_size(){
    const v_size = Math.floor(Math.max(0, aggressionToIdx(AGR) - aggressionToIdx(BRD)));
    if (v_size === 0) {
        document.getElementById("warning").innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;Warning: Won't translate any <br>words. Make sure you are using <br>more of the dictionary than you are <br>ignoring.<br><br>"
    } else {
        document.getElementById("warning").innerHTML = "";
    }
    document.getElementById("size2").innerText = "" + v_size;
}

function aggressionToIdx(aggro){
    const percent = Number(aggro) / 100;
    return ((4372 * (percent * percent)));
}