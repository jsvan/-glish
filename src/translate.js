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

on load:
	message background for lang, aggression, langpack, tables, and english
	save og HTML to var, and a separate editedHTML var for visualization/editing

Listener:
	for lang changed
		set lang, langpack and tables new
		recalculate html page
	for aggression changed
		set aggression
		recalculate html page
	for activate change:
		1) Off:
			1a) replace html with og
			1b) turn off further html changes (set var off)
		2) On:
			2a) build new html
			2b) set var on
 */

window.addEventListener('load',
	function () {
		grab_and_go();
	}, false);


chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	print("received message, ["+request.message+"] " + request)
	if (request.message === "changed") {
		if (OG_TEXT_NODES) {
			just_go()
		} else {
			grab_and_go();
		}
		//page no longer valid, send page back to get translated.
		sendResponse();

	} else if (request.message === "deactivate") {
		ACTIVATE = false;
		print("Deactivating")
		if (OG_TEXT_NODES){
			weave_nodes(OG_TEXT)
		}
		sendResponse();

	} else if (request.message === "activate") {
		print("Activating")
		ACTIVATE = true;
		if (OG_TEXT_NODES) {
			print("Foreign HTML already exists, setting...")
			just_go();
		} else {
			print("No foreign HTML, grabbing and going...")
			grab_and_go();
		}
		sendResponse();
	}
})

function grab_and_go() {
	print("grabbing and going");
	if (!ACTIVATE){
		print("not activated")
		return;
	}
	WEB_PAGE_NODES = getTextNodes(document.body);
	print("WEB NODES")
	print(WEB_PAGE_NODES)
	OG_TEXT_NODES = WEB_PAGE_NODES.map((x) => x.outerHTML)
	OG_TEXT = WEB_PAGE_NODES.map((x) => x.textContent)
	just_go();
}


function just_go() {
	print("GOT THIS MANY TEXT SECTIONS: " + OG_TEXT_NODES.length)
	if (COUNT_TEXT_SECTIONS < 8){
		return
	}
	chrome.runtime.sendMessage({message:"translate", payload:OG_TEXT}, function(response){
		print("Received lang data:")
		if (!response) {
			return;
		}
		LANGUAGE = response.language;
		const translated_info = response.payload;
		weave_nodes(translated_info);
		// translate_page(HTML_BLOCKS, TEXT_SECTIONS, response.payload);
		print("setting inner HTML")
		document.body.style.overflow = 'auto'
	})
}


function weave_nodes(node_list){
	print("weaving nodes")
	print(node_list)
	print("webpagenodes")
	print(WEB_PAGE_NODES)
	let newnode = null;
	for (let i = 0; i < node_list.length; i++){

		// fix to not break my donation page. Only change text items that have been edited. Or change back to normal those that have been
		if (WEB_PAGE_NODES[i].innerHTML && !node_list[i].includes("<span class=\"a\"") && !WEB_PAGE_NODES[i].innerHTML.includes("<span class=\"a\"")) {
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
	if (PREV_WIKI_IFRAME){
		if (PREV_WIKI_IFRAME.parentNode.previousSibling.classList.contains('act')){
			PREV_WIKI_IFRAME.parentNode.previousSibling.classList.remove('act')
		}
	}
	if ((UP - DOWN) < TIMEOUT) {
		rotateWord(e);
	}
});

function rotateWord(e){
	const t = e.target;
	if (!t || !t.classList.contains('a')) {
		return;
	}
	const otherwords = t.dataset.nvoc.split(' ');
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
		t.firstChild.textContent = capitalize(otherwords[i]);
	} else {
		t.firstChild.textContent = otherwords[i];
	}
}

function iframe(e) {
	const t = e.target;
	if (!t || !t.attributes || !t.attributes.class || t.attributes.class.value !== "a") {
		return;
	}
	const parent_node = document.getElementById(t.attributes.id.value + "W");
	let foreign_word = t.firstChild.textContent;

	if (PREV_WIKI_IFRAME && PREV_WIKI_IFRAME.parentNode === parent_node && foreign_word === PREV_IFRAME_WORD) {
		t.classList.add("act");
		print("The parents are the same. Building nothing");
	} else {
		if (PREV_WIKI_IFRAME)  {
			try {
				//PREV_WIKI_IFRAME.classList.remove("act");
				PREV_WIKI_IFRAME.parentNode.removeChild(PREV_WIKI_IFRAME);
			} catch (e) {
				print(e);
			}
		}
		PREV_IFRAME_WORD = foreign_word;
		t.classList.add("act");
		if (t.dataset.cpt === 'y') {
			foreign_word = foreign_word.toLowerCase();
		}
		const baby_iframe = document.createElement("iframe");
		baby_iframe.setAttribute("src", "https://en.wiktionary.org/wiki/" + foreign_word + "#" + LANGUAGE);
		parent_node.appendChild(baby_iframe);
		print("Appended iframe " + baby_iframe)
		PREV_WIKI_IFRAME = baby_iframe;
	}
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

/*
for (let i = 0; i < t.length; i++) {
    t[i].textContent = t[i].parentNode.textContent.replace("Russia ", "the Russia ")
}
 */