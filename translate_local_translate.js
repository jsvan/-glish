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
		run();
	}, false);


chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	console.log("received message, ["+request.message+"] " + request)
	if (request.message === "set_act") {
		console.log("Received message set_act with payload ["+request.payload+"]. (no brackets)")
		console.log(request.payload + " : "+ typeof request.payload)
		ACTIVATE = request.payload;
		console.log(ACTIVATE + " and " + !ACTIVATE);

		if (! ACTIVATE){
			//set back to original html
			document.body.innerHTML = HTML_BLOCKS.join(' ')
		} else {
			//set to created html, or whatever i need to create
			console.log(FOREIGN_HTML)
			console.log(!FOREIGN_HTML)
			if (FOREIGN_HTML) {
				document.body.innerHTML = FOREIGN_HTML.join(' ')
			} else {
				run();
			}
		}

	} else if (request.message === "set_agr"){
		console.log("Got message set_agr, now ["+request.payload+"]")
		AGGRESSION = aggressionToIdx(Number(request.payload));
		translate_page(HTML_BLOCKS, TEXT_SECTIONS);
		document.body.innerHTML = FOREIGN_HTML.join(" ");

	} else if (request.message === "set_lng"){
		console.log("Got message set_lng, now ["+request.payload[0]+']')
		LANG = request.payload[0];
		FOREIGN = request.payload[1];
		WIKI_TABLES = new Map(Object.entries(request.payload[2]));
		translate_page(HTML_BLOCKS, TEXT_SECTIONS);
		document.body.innerHTML = FOREIGN_HTML.join(" ");

	} else if (request.message ==="frc_run") {
		run();
	}
})

function run() {
	console.log("Prelim data catching")
	loadActivate( function() {
		loadEnglish(
			function() { loadForeign(
				function() { loadAggression(
					function() {
						[HTML_BLOCKS, TEXT_SECTIONS] = combHTML();
						translate_page(HTML_BLOCKS, TEXT_SECTIONS);
						document.body.innerHTML = FOREIGN_HTML.join(" ")
					}
				)}
			)}
		)
	})
}

function loadActivate(callback = {}) {
	console.log("Loaded activate")
	chrome.runtime.sendMessage({message: "get_act"}, function(response){
		console.log("["+response.payload + "] should be true/false (ignore brackets).")
		ACTIVATE = response.payload;
		if (ACTIVATE) { //TODO
			callback();
		}
	});
}

function loadEnglish(callback = {}){
	console.log("Loaded english")
	if (ENGLISH === null) {
		chrome.runtime.sendMessage({message: "get_eng"}, function(response){
			ENGLISH = mapify_eng(response.payload);
			callback();
		});
	} else {
		callback();
	}
}

const mapify_eng = ((payload) => {
	let neweng = new Map();
	let line;
	for (let i = 0; i < payload.length; i++){
		line = payload[i];
		neweng.set(line[WORDIDX], line)
	}
	return neweng;
});

function loadForeign(callback = {}){
	console.log( "Loading foreign")
	chrome.runtime.sendMessage({message: "get_fgn"}, function(response){
		LANG = response.payload[0];
		FOREIGN = response.payload[1];
		WIKI_TABLES = new Map(Object.entries(response.payload[2]));
		callback();
	});
}

function loadAggression(callback = {}){
	chrome.runtime.sendMessage({message: "get_agr"}, function(response){
		AGGRESSION = aggressionToIdx(response.payload);
		callback();
	});
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

function translate_page(htmlblocks, text_sections) {
	FOREIGN_HTML = [];
	for (let i = 0; i < htmlblocks.length; i++){
		FOREIGN_HTML.push(htmlblocks[i]);
	}
	for (let i = 0; i < text_sections.length; i++) {
		let textidx = text_sections[i];
		FOREIGN_HTML[textidx] = replaceNodeVocab(FOREIGN_HTML[textidx]);
	}
}

function replaceNodeVocab(nodetext){
	//console.log("Replacing "+nodetext);
	let node = nodetext.trim()
	if (!node){
		return nodetext
	}
	const words = node.split(' ');
	const newwords = [];
	let word = null;
	for (let i=0; i< words.length; i++){
		word = words[i].toString();
		if (word.length > 40) {
			continue
		}
		let replacementword = word;
		let cleanword = word.replace(/[^a-z]/gi, '').toLowerCase();
		if (cleanword.length > 0) {
			// console.log("Working english has word, " + in_working(cleanword));
			if (in_working(cleanword)) {
				replacementword = formatTranslateWord(cleanword);
				// console.log("Replaced with " + replacementword);
			}
		}
		newwords.push(replacementword);
	}
	let newhtml = newwords.join(' ');
	// console.log("New made is: " + newhtml);
	return newhtml

}

function in_working(word) {
	return ENGLISH.has(word) && ENGLISH.get(word)[SRIDX] < AGGRESSION
}

function formatTranslateWord(englishword){
	var englishinfo = ENGLISH.get(englishword);
	//var englishpos = englishinfo[POSIDX];
	//console.log("Getting forign word from idx "+englishinfo[SRIDX]+" : "+ typeof englishinfo[SRIDX]);
	// console.log(englishword + " is ", FOREIGN[englishinfo[SRIDX]]);
	var foreignword = FOREIGN[englishinfo[SRIDX]];
	if (WIKI_TABLES.has(foreignword)) {
		// console.log("VERB!")
		foreignword = verb_html_replacement(foreignword, englishword);
		// console.log("Verb")
	} else {
		foreignword = word_html_replacement(foreignword, englishword);
	}
	return foreignword;
}

function aggressionToIdx(aggro){
	return ((ENGLISH.size * (Number(aggro)/100)) + 1);
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
	let textsections = [];

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
			textsections.push(size);
		}

		results.push( body.substring(previ, posti + 1) );
		size++;
		posti++;
		previ = posti;

	}
	return [results, textsections];
}
