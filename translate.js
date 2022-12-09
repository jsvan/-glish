let LANG = null;
let FOREIGN = null;
let ENGLISH = null;
let WIKI_TABLES = null;
const SRIDX = 0;
const WORDIDX = 1;
const POSIDX = 2;
const LEVELIDX = 3;
let AGGRESSION = 0;
let HTML_BLOCKS = null;
let TEXT_SECTIONS = null;
let BLOCKS_TO_SEND = null;
let FOREIGN_HTML = null;
let ACTIVATE = true;
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
		translate_page(HTML_BLOCKS, TEXT_SECTIONS, response.payload);
		console.log("setting inner HTML")
		document.body.innerHTML = FOREIGN_HTML.join(" ");
	})
}



function get_wiki_table(word) {
	if (WIKI_TABLES === null) {
		return "<iframe width=\"550px\" height=\"350px\" srcdoc='None'></iframe>";
	} else {
		return WIKI_TABLES.get(word);
	}
}

const verb_html_replacement = function (verb, original) {
	return "<mark style='background-color:orange'><span class=\"a\" title='"+ original +"'>" + verb +
		"</span><span class=\"b\">" + get_wiki_table(verb) + "</span></mark>";
};

const word_html_replacement = function (word, original) {
	return "<mark><span class=\"a\" title='"+ original +"'>"+ word + "</span></mark>";
};





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
