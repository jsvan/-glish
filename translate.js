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
const TIMEOUT = 200;

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
	console.log("received message, ["+request.message+"] " + request)
	if (request.message === "changed") {
		if (OG_TEXT_NODES) {
			just_go()
		} else {
			grab_and_go();
		}
		//page no longer valid, send page back to get translated.
		return false;

	} else if (request.message === "deactivate") {
		ACTIVATE = false;
		console.log("Deactivating")
		console.log(OG_TEXT_NODES)
		if (OG_TEXT_NODES){
			weave_nodes(OG_TEXT)
		}

	} else if (request.message === "activate") {
		console.log("Activating")
		ACTIVATE = true;
		if (OG_TEXT_NODES) {
			console.log("Foreign HTML already exists, setting...")
			just_go();
		} else {
			console.log("No foreign HTML, grabbing and going...")
			grab_and_go();
		}
	}
})

function grab_and_go() {
	console.log("grabbing and going");
	if (!ACTIVATE){
		console.log("not activated")
		return;
	}
	WEB_PAGE_NODES = getTextNodes(document.body);
	OG_TEXT_NODES = WEB_PAGE_NODES.slice()
	OG_TEXT = OG_TEXT_NODES.map((x) => x.textContent)
	just_go();
}


function just_go() {
	console.log("GOT THIS MANY TEXT SECTIONS: " + OG_TEXT_NODES.length)
	if (COUNT_TEXT_SECTIONS < 5){
		return
	}

	chrome.runtime.sendMessage({message:"translate", payload:OG_TEXT}, function(response){
		console.log("Received lang data:")
		LANGUAGE = response.language;
		const translated_info = response.payload;
		weave_nodes(translated_info);
		// translate_page(HTML_BLOCKS, TEXT_SECTIONS, response.payload);
		console.log("setting inner HTML")
		document.body.style.overflow = 'auto'
	})
}


function weave_nodes(node_list){
	console.log("weaving nodes")
	for (let i = 0; i < node_list.length; i++){
		WEB_PAGE_NODES[i].innerHTML = node_list[i];
	}
}

/*
function translate_page(html_blocks, text_sections, translated_blocks) {
	FOREIGN_HTML = [];
	for (let i = 0; i < html_blocks.length; i++){
		FOREIGN_HTML.push(html_blocks[i]);
	}
	for (let i = 0; i < text_sections.length; i++) {
		let textidx = text_sections[i];
		FOREIGN_HTML[textidx] = translated_blocks[i];
	}

	console.log("Translated page, filled FOREIGN_HTML")
}
 */

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
	}
});

function rotateWord(e){
	const t = e.target;
	if (!t || !t.attributes || !t.attributes.class || t.attributes.class.value !== "a") {
		return;
	}
	const otherwords = t.dataset.nvoc.split(' ');
	const i = Number(t.dataset.nvi)  % otherwords.length;
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
	const parent_node = document.getElementById(t.attributes.id.value+"W");
	let foreign_word = t.firstChild.textContent;
	if (PREV_WIKI_IFRAME && PREV_WIKI_IFRAME.parentNode === parent_node && foreign_word === PREV_IFRAME_WORD) {
		console.log("The parents are the same. Building nothing")
	} else {
		if (PREV_WIKI_IFRAME){
			try{
				PREV_WIKI_IFRAME.parentNode.removeChild(PREV_WIKI_IFRAME);
			} catch (e){
				console.log(e);
			}

		}
		PREV_IFRAME_WORD = foreign_word;
		console.log("CPT:")
		console.log(typeof t.CPT);
		console.log(t.CPT);

		if (t.CPT) {
			foreign_word = foreign_word.toLowerCase();
		}
		const baby_iframe = document.createElement("iframe");
		baby_iframe.setAttribute("src", "https://en.wiktionary.org/wiki/"+foreign_word+"#"+LANGUAGE);
		parent_node.appendChild(baby_iframe);
		console.log("Appended iframe "+baby_iframe)
		PREV_WIKI_IFRAME = baby_iframe;
	}

}

/*
 This function is a massive handwritten regex
 It takes document.body as input
 Returns a list of tuples
	 where each contains
		[0] a segment of HTML and
		[1] a label whether it's words or html/script info
 Changing the text idxs is associated with changing the text
 Setting document.body.innerHTML to MYLIST.map(x => x[0]).join(" ") will reproduce the fixed page.

e.g. document.body.innerHTML = combHTML(document.body).map(x => x[0]).join(" ")

 */
/*
function combHTML(){
	COUNT_TEXT_SECTIONS = 0;
	const body = document.body.innerHTML.toString();
	const results = [];
	let previ = 0;
	let posti = 0;
	let size = 0;
	let inScript = false;
	let scriptsubstr = null;
	const textsections = [];
	const blocks_to_send = [];
	let pushtext = false;
	let string_var = null;

	while (posti<body.length){
		if (body[posti] ==="<") {
			scriptsubstr = body.substring(posti, posti + 10);
			inScript = (scriptsubstr.includes("<script") || scriptsubstr.includes("<style") || scriptsubstr.includes("<a ") || scriptsubstr.includes("<code"));
			while (posti < body.length && body[posti] !== ">") { posti++; }

			if (inScript) {
				// go again until through end tag
				while (posti < body.length - 1 && !(body[posti] === "<" && body[posti + 1] === "/")){ posti++; }
				while (posti < body.length && body[posti] !== ">") { posti++; }
				inScript = false;
			}

		} else {
			while (posti + 1 < body.length && body[posti+1] !== "<"){ posti++; }
			pushtext = true;
			textsections.push(size);
		}

		string_var = body.substring(previ, posti + 1);
		results.push( string_var );
		if (pushtext) {
			if (string_var.length > 50) {
				COUNT_TEXT_SECTIONS += 1;
			}
			blocks_to_send.push(string_var);
			pushtext = false;
		}

		size++;
		posti++;
		previ = posti;

	}
	return [results, textsections, blocks_to_send];
}
*/

function capitalize(word){
	if (!word){
		return
	}
	return word.charAt(0).toUpperCase() + word.slice(1);
}


function getTextNodes(parent = document.body){
    let all = [];
    for (parent = parent.firstChild; parent; parent = parent.nextSibling) {
        if (['SCRIPT','STYLE'].indexOf(parent.tagName) >= 0) continue;
        if (parent.nodeType === Node.TEXT_NODE && parent.data.trim()) {
			all.push(parent.parentNode);
			if (parent.textContent.length > 50) {
				COUNT_TEXT_SECTIONS += 1;
			}
		}
        else {
			all = all.concat(getTextNodes(parent));
		}
    }
    return all;
}
/*
for (let i = 0; i < t.length; i++) {
    t[i].textContent = t[i].parentNode.textContent.replace("Russia ", "the Russia ")
}
 */