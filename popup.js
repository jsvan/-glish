/*

needs a button to deactivate



listener needed:
    on load: set local values to ACTIVATE, LANG, AGGRESSION

send messages to background:
    1) activate/deactivate
    2) lang
    3) aggression
 */




















document.getElementById("Title").addEventListener("click", forcerun);
document.getElementById("Aggression").addEventListener("mouseup", rangeCount);
document.getElementById("Activated").addEventListener('change', activate);
document.getElementById("LanguageSelect").addEventListener("change", set_fgn)

window.addEventListener('load',
    function() {
        load_page();
    }, false);

function forcerun(){
    console.log("sending force run command")
    chrome.runtime.sendMessage({message:"frc_run"}, function(response){});
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
        console.log("set activation click");
    });
}

function rangeCount(){
    let rangeslider = document.getElementById("Aggression");
    let output = document.getElementById("AggroCount");
    output.innerHTML = rangeslider.value;

    // Save value to session storage:
    chrome.runtime.sendMessage({message: "set_agr", payload: rangeslider.value});
}

function load_page() {
    // Populate language options
    const url = chrome.runtime.getURL("./languagepacks/available_languages.txt");
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
        document.getElementById("AggroCount").innerHTML = newagr;
        document.getElementById("Aggression").value = newagr;
        console.log("Aggression is now: " + newagr);
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













//TODO: Delete below
    /*
    if (getHighlight()) {
        document.getElementById("highlight").innerHTML = "On";
        document.getElementById("highlighttext").innerHTML = "<mark>text highlighting</mark>";
    }
    else {
        document.getElementById("highlight").innerHTML = "Off";
        document.getElementById("highlighttext").innerHTML = "text highlighting";
    }

    var wealth = getLS("WEALTH");
    var nationalism = getLS("NATIONALISM");
    var country = getLS("COUNTRY");
    var identity = getLS("GROUP_IDENTITY");

    if (wealth) {
        document.getElementsByName("wealth")[wealth - 1].checked = "checked";
    }

    if (nationalism) {
        document.getElementsByName("nationalism")[nationalism - 1].checked = "checked";
    }

    if (country) {
        document.getElementById("country").value = country;
    }

    if (identity) {
        document.getElementsByName("group_identity")[identity - 1].checked = "checked";
    }

    if (wealth && nationalism && country && identity) {
        document.getElementById("survey").style.display = "none";
        document.getElementById("collapsed").style.display = "block";
    }
}

// Stores a user's answers to the popup questions in LS
function submitSurvey() {
    var wealthrad = document.getElementsByName("wealth");
    for (var i = 0, length = wealthrad.length; i < length; i++) {
        if (wealthrad[i].checked) {
            wealth = wealthrad[i].value.toString();
            setLS("WEALTH", wealth); 
            break;
        }
    }

    var natrad = document.getElementsByName("nationalism");
    for (var i = 0, length = natrad.length; i < length; i++) {
        if (natrad[i].checked) {
            nationalism = natrad[i].value.toString();
            setLS("NATIONALISM", nationalism); 
            break;
        }
    }

    var country = document.getElementById("country").value;
    setLS("COUNTRY", country); 

    //var group_identity = document.getElementById("group_identity").value;
    //setLS("GROUP_IDENTITY", group_identity);

    var idnrad = document.getElementsByName("group_identity");
    for (var i = 0, length = idnrad.length; i < length; i++) {
        if (idnrad[i].checked) {
            group_identity = idnrad[i].value.toString();
            setLS("GROUP_IDENTITY", group_identity);
            break;
        }
    }

    document.getElementById("survey").style.display = "none";
    document.getElementById("collapsed").style.display = "block";
}

// switches text highlighting on or off
function toggleHighlight() {
    if (getHighlight()) {  // OFF state
        document.getElementById("highlight").innerHTML = "Off";
        document.getElementById("highlighttext").innerHTML = "text highlighting";
        setLS("highlight", "0")
    } else {  // ON state
        document.getElementById("highlight").innerHTML = "On";
        document.getElementById("highlighttext").innerHTML = "<mark>text highlighting</mark>";
        setLS("highlight", "1")
    }
}

function expandSurvey() {
    document.getElementById("survey").style.display = "block";
    document.getElementById("collapsed").style.display = "none";
}

function openPrivacyPage() {
    chrome.tabs.create({'url':"https://jsvan.github.io/Common_Sents_Privacy_Policy.html", 'active':true});
};

function openPrintPage() {
    chrome.tabs.create({'url':chrome.runtime.getURL("printpage.html"), 'active':true});
};

function openInstructionsPage() {
    chrome.tabs.create({'url':"https://jsvan.github.io/Common_Sents_Usage_Instructions.html", 'active':true});
};

function setLS(key, val) {
    localStorage["senti_" + key] = val;
}

function getLS(key) {
    return localStorage["senti_" + key];
}

function rmLS(key) {
    localStorage.removeItem("senti_" + key);
}

function getHighlight() {
    return parseInt(getLS("highlight"));
}
*/