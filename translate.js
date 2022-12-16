let HTML_BLOCKS = null;
let TEXT_SECTIONS = null;
let BLOCKS_TO_SEND = null;
let FOREIGN_HTML = null;
let ACTIVATE = true;
let LANGUAGE = null;
let PREV_WIKI_IFRAME = null;
console.log("Loaded translate.js")

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
		grab_and_go(); //page no longer valid, send page back to get translated.
		return false;

	} else if (request.message === "deactivate") {
		ACTIVATE = false;
		if (HTML_BLOCKS){
			document.body.innerHTML = HTML_BLOCKS.join(" ");
		}

	} else if (request.message === "activate") {
		console.log("Activating")
		ACTIVATE = true;
		if (FOREIGN_HTML) {
			console.log("Foreign HTML already exists, setting...")
			document.body.innerHTML = FOREIGN_HTML.join(" ");
		} else {
			console.log("No foreign HTML, grabbing and going...")
			grab_and_go();
		}
	}
})

function grab_and_go() {
	if (!ACTIVATE){
		return;
	}
	console.log("grabbing and going");
	if (BLOCKS_TO_SEND === null) {
		[HTML_BLOCKS, TEXT_SECTIONS, BLOCKS_TO_SEND] = combHTML();
	}
	just_go();
}


function just_go() {
	chrome.runtime.sendMessage({message:"translate", payload:BLOCKS_TO_SEND}, function(response){
		console.log("Received lang data:")
		console.log(response)
		console.log(response.payload)
		LANGUAGE = response.language;
		translate_page(HTML_BLOCKS, TEXT_SECTIONS, response.payload);
		console.log("setting inner HTML")
		document.body.innerHTML = FOREIGN_HTML.join(" ");
	})
}





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

document.body.addEventListener("mousedown", function(e) {
	const t = e.target;
	console.log(t);
	if (!t || !t.attributes || !t.attributes.class || t.attributes.class.value !== "a") {
		return;
	}
	const parent_node = document.getElementById(t.attributes.id.value+"W");

	if (PREV_WIKI_IFRAME && PREV_WIKI_IFRAME.parentNode === parent_node) {
		console.log("The parents are the same. Building nothing")
	} else {
		if (PREV_WIKI_IFRAME){
			try{
				PREV_WIKI_IFRAME.parentNode.removeChild(PREV_WIKI_IFRAME);
			} catch (e){
				console.log(e);
			}

		}
		const foreign_word = t.firstChild.textContent.toLowerCase();
		const baby_iframe = document.createElement("iframe");
		baby_iframe.setAttribute("src", "https://en.wiktionary.org/wiki/"+foreign_word+"#"+LANGUAGE);
		parent_node.appendChild(baby_iframe);
		console.log("Appended iframe "+baby_iframe)
		PREV_WIKI_IFRAME = baby_iframe;
	}

},false);



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
function combHTML(){
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
			inScript = (scriptsubstr.includes("<script") || scriptsubstr.includes("<style") || scriptsubstr.includes("<a "));
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
			blocks_to_send.push(string_var);
			pushtext = false;
		}

		size++;
		posti++;
		previ = posti;

	}
	return [results, textsections, blocks_to_send];
}


/*
TODO: Add listeners for every word on page.
 	On word click:
 	 	add to the iframe a src attribute with the wikipedia site
 	 	Don't need to remove any iframes, bc once viewed and loaded, it wont continually reping wiki.org or anything.
 */