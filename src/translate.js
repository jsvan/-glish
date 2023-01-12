let OG_TEXT_NODES = null;
let WEB_PAGE_NODES = null;
let COUNT_TEXT_SECTIONS = 0;
let OG_TEXT = null;
let ACTIVATE = true;
let LANGUAGE = null;
let PREV_WIKI_IFRAME = null;
let DOWN = null;
let UP = null;
let PREV_IFRAME_WORD = null;
const TIMEOUT = 250;
const DEBUG = false;

/*
This page is improperly named. All translation happens in Background.js. On load or a setting change, translate.js sends
the textnodes to background.js. Background.js translates the nodes and returns the updated version. Translate.js then
weaves that text back into the main page.
 */

window.addEventListener('load',
	function () {
		prepareglishcss();
		grab_and_go();
		attachDialog();
	}, false);


chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	print("received message, ["+request.message+"] " + request)
	//page no longer valid, send page back to get translated.
	if (request.message === "changed") {
		if (OG_TEXT_NODES) {
			just_go()
		} else {
			grab_and_go();
		}
		sendResponse();

	} else if (request.message === "deactivate") {
		if (ACTIVATE) {
			ACTIVATE = false;
			print("Deactivating")
			if (OG_TEXT_NODES){
				weave_nodes(OG_TEXT)
			}
		}
		sendResponse();

	} else if (request.message === "activate") {
		if (!ACTIVATE) {
			print("Activating")

			ACTIVATE = true;
			if (OG_TEXT_NODES) {
				print("Foreign HTML already exists, setting...")
				just_go();
			} else {
				print("No foreign HTML, grabbing and going...")
				grab_and_go();
			}
		}
		sendResponse();

	} else if (request.message === "style") {
		editglishcss(request.glishbold, request.glishitalic)
	}
})

function editglishcss(bold, italic) {
	const b = bold ? "bold" : "none";
	const i = italic ? "italic" : "none";
	document.getElementById("glishcss").innerHTML = ".glishword {font-weight:" + b + "; font-style:" + i + ";}";
}

function prepareglishcss(){
	let sheet = document.createElement("style");
	sheet.innerHTML = ".glishword {}";
	sheet.id = "glishcss";
	document.getElementsByTagName("head")[0].appendChild(sheet);
}

function attachDialog(){
	const dialog = document.createElement("dialog");
	const msg = document.createElement('div');
	const dummyiframe = document.createElement("iframe");
	dialog.classList.add("glishdialog");
	msg.classList.add("glishmsg")
	dialog.id = "glishdlg";
	msg.id = "glishclickoff"
	msg.innerHTML = "Click off window to close.<br>";
	dialog.appendChild(msg);
	dialog.appendChild(dummyiframe);
	document.body.appendChild(dialog);
	PREV_WIKI_IFRAME = dummyiframe;
}
function refreshIframe(url) {
	const iframe = document.createElement("iframe");
	iframe.id = "glishiframe";
	iframe.src = url;
	iframe.style.border = '0';
	iframe.style.borderColor = "whitesmoke"
	document.getElementById('glishdlg').replaceChild(iframe, PREV_WIKI_IFRAME)
	PREV_WIKI_IFRAME = iframe;
}

function grab_and_go() {
	print("grabbing and going");
	if (!ACTIVATE){
		print("not activated")
		return;
	}
	chrome.runtime.sendMessage({message:"valid_website"}, function(response){
		if (!response || response.payload === "stop") {
			print("Not allowed!!!")
			ACTIVATE = false;
			return;
		}
		print("Allowed!!!")
		WEB_PAGE_NODES = getTextNodes(document.body);
		OG_TEXT_NODES = WEB_PAGE_NODES.map((x) => x.outerHTML)
		OG_TEXT = WEB_PAGE_NODES.map((x) => x.textContent)
		just_go();
	})

}


function just_go() {
	print("GOT THIS MANY TEXT SECTIONS: " + OG_TEXT_NODES.length)
	if (COUNT_TEXT_SECTIONS < 8 || !ACTIVATE){
		print("Ending because activated is : "+ACTIVATE+", or COUNT is "+COUNT_TEXT_SECTIONS)
		return;
	}
	chrome.runtime.sendMessage({message:"translate", payload:OG_TEXT}, function(response){
		print("Received lang data:")
		if (!response) {
			return;
		}
		LANGUAGE = response.language;

		editglishcss(response.glishbold, response.glishitalic);
		const translated_info = response.payload;
		weave_nodes(translated_info);
		// translate_page(HTML_BLOCKS, TEXT_SECTIONS, response.payload);
		print("setting inner HTML")
	})
}


function weave_nodes(node_list){
	print("weaving nodes")
	print(node_list)
	print("webpagenodes")
	print(WEB_PAGE_NODES)
	let newnode = null;
	for (let i = 0; i < node_list.length; i++){

		// Only change text items that have been edited. Or change back to normal those that have been
		if (!node_list[i].includes("<span class=\"glishword\"") && ! (WEB_PAGE_NODES[i].innerHTML && WEB_PAGE_NODES[i].innerHTML.includes("<span class=\"glishword\"")) ){
			continue
		}
		try {
			newnode = document.createElement("span");
			newnode.innerHTML = node_list[i];
			WEB_PAGE_NODES[i].parentNode.replaceChild(newnode, WEB_PAGE_NODES[i]);
			WEB_PAGE_NODES[i] = newnode;
		} catch (e) {
			print(e);
			print('"'+ node_list[i] +'"');
		}

	}
}

document.body.addEventListener("mousedown", function(e) {
	DOWN = new Date();
	setTimeout(()=>{
		// click & hold
		if (UP <= DOWN) {
			iframe(e);
		}
	}, 200)
});

document.body.addEventListener("mouseup", function(e) {
	UP = new Date();
	// click
	if ((UP - DOWN) < TIMEOUT) {
		rotateWord(e);

		//check to see if iframe window should be closed:
		if (!document.getElementById("glishdlg")) {
			attachDialog();
		}
		if (document.getElementById('glishdlg').open ){
			const rectA = document.getElementById("glishdlg").getBoundingClientRect();
			const rectB = document.getElementById("glishclickoff").getBoundingClientRect();
			function clickedInDialog (rect) {
				return 	rect.top <= e.clientY &&
					e.clientY <= rect.top + rect.height &&
					rect.left <= e.clientX &&
					e.clientX <= rect.left + rect.width;
			}
			if (!clickedInDialog(rectA) || clickedInDialog(rectB))
				document.getElementById("glishdlg").close();
		}

	}
});

function rotateWord(e){
	const t = e.target;
	if (!t || !t.classList.contains('glishword')) {
		return;
	}
	const otherwords = t.dataset.nvoc.split('$');
	if (otherwords.length === 1) {
		//flash word red
		const og_color = t.style.color;
		t.style.color = "red";
		setTimeout(()=> t.style.color = og_color, 200)
		return;
	}
	let i = Number(t.dataset.nvi)  % otherwords.length;

	//instead of fixing how i hand over words, im just gonna double tick if the new word is the same as the old.
	if (t.firstChild.textContent.toLowerCase() === otherwords[i].toLowerCase()) {
		print("SAME WORD DOUBLE TICKING... +1")
		i = (i + 1) % otherwords.length;
	}
	t.dataset.nvi = "" + (i + 1);
	if (t.dataset.cpt === 'y'){
		t.firstChild.textContent = capitalize(otherwords[i]);	print("WEB NODES")
	print(WEB_PAGE_NODES)
	} else {
		t.firstChild.textContent = otherwords[i];
	}
}

function iframe(e) {
	const t = e.target;
	if (!t || !t.attributes || !t.attributes.class || t.attributes.class.value !== "glishword") {
		return;
	}
	let foreign_word = t.firstChild.textContent;
	if (t.dataset.cpt === 'y') {
		foreign_word = foreign_word.toLowerCase();
	}

	if (!PREV_IFRAME_WORD || foreign_word !== PREV_IFRAME_WORD) {
		refreshIframe("https://en.wiktionary.org/wiki/" + foreign_word + "#" + LANGUAGE);
	}
	document.getElementById('glishdlg').showModal();
	PREV_IFRAME_WORD = foreign_word;
}

function capitalize(word){
	if (word) {
		return word.charAt(0).toUpperCase() + word.slice(1);
	}
}

function getTextNodes(parent = document.body){
    let all = [];

    for (parent = parent.firstChild; parent; parent = parent.nextSibling) {
        if (['SCRIPT','STYLE', 'A', 'CODE', 'BUTTON'].indexOf(parent.tagName) >= 0) {
			continue;
		}
        if (parent.nodeType === Node.TEXT_NODE && parent.data.trim()) {
			all.push(parent);
			if (parent.textContent.length > 50) {
				COUNT_TEXT_SECTIONS += 1;
			}
		} else {
			all = all.concat(getTextNodes(parent));
		}
    }
    return all;
}

function print(s) {
	if (DEBUG) {
		console.log(s);
	}
}
