/**
 * if session storage isn't set,
 * 	then load vocab and set into session memory and save to workinglang and workingtables
 * if options are changed in popup menu
 * 	reload session storage stuff
 *
 *
 *
 * in translate.js, poll wiki sites and grab all <div class="NavFrame">'s, to display in a popup div. Save them in session storage. Preprocess? Maybe yes!
 * https://stackoverflow.com/questions/6508393/web-scraping-in-a-google-chrome-extension-javascript-chrome-apis
 * write python script
 */
/**
 *
 * This has been rewritten to rebuild an HTML page as a string, instead of parsing the DOM tree. I originally implemented my best attempt
 * at the DOM tree, but the performance was very bad. I think I can do an O(N) rundown of the HTML string, grabbing, translating, and
 * placing the mapped text into a new document, which I can set the webpage to point to a single time.
 *
 * Also instead of pinging wiktionary a billion times for iframe info on verbs, there are only 208 verbs * 13 languages, and a single table from wikpedia
 * is 4.5KB. 2704 * 4.5 = 12,168 KB or 12 MB. I think this is an acceptable size because they look very nice.
 */
const DEBUG = true;
let AGGRESSION = null;
let SCALED_AGGRESSION = 0;
let CHANCE = null;
let SCALED_CHANCE = null
let BOREDOM = null;
let SCALED_BOREDOM = null;
let LANG_DATA = null;
let ENGLISH = null;
let ACTIVATED = null;
let LANG = null;
let FOREIGN = null;
const AGGRO_STORAGE_TAG = "AGGRO_STORAGE_TAG";
const CHANCE_STORAGE_TAG = "CHANCE_STORAGE_TAG";
const BOREDOM_STORAGE_TAG = "BOREDOM_STORAGE_TAG";
const ACTIVE_STORAGE_TAG = 'ACTIVE_STORAGE_TAG';
const LANG_STORAGE_TAG = 'LANG_STORAGE_TAG';
const SEEN = new Set();


chrome.runtime.onInstalled.addListener(function (rsn) {
	ACTIVATED = true;
	chrome.storage.sync.set({ACTIVE_STORAGE_TAG:ACTIVATED}, () => {});
	chrome.storage.sync.set({AGGRO_STORAGE_TAG:5},   () => {});
	chrome.storage.sync.set({CHANCE_STORAGE_TAG:20}, () => {});
	chrome.storage.sync.set({BOREDOM_STORAGE_TAG:2}, () => {});
	chrome.storage.sync.set({LANG_STORAGE_TAG:null}, () => {});
	if (chrome.runtime.OnInstalledReason.INSTALL === rsn.reason) {
		chrome.tabs.create({'url':"src/popup.html", 'active':true}, ()=>{})
	}
})

chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	print("Background received message, "+request + ", "+ request.message)
	if (request.message === "translate") {
		print("Preparing translation:")
		getActivated().then(()=>{
			if (ACTIVATED) {
				getChance().then(() =>
					getBoredom().then(() =>
						getEnglish().then(() =>
							getLangData().then(() =>
								getAggression().then(()=> {
									print("Aggression is: " + AGGRESSION)
									print("preparing translation: Got Lang data")
									if (!FOREIGN) {
										return 0;
									}
									const chunks_to_translate = request.payload;
									const translated_chunks = [];
									let idint = 0;
									let newstring = null;
									for (let i = 0; i < chunks_to_translate.length; i++) {
										[newstring, idint] = replaceNodeVocab(chunks_to_translate[i], idint);
										translated_chunks.push(newstring);
									}
									print("BACKGROUND sending translated response")
									//print(translated_chunks)
									print("Lang Data is: "+LANG_DATA[0])
									sendResponse({payload: translated_chunks, language: capitalize(LANG_DATA[0])}, ()=>{});
									return 1;
								})
							)
						)
					)
				)
			}
			return 0;
		})
		return true;

	} else if (request.message === "get_agr") {
		print("getting agr")
		getAggression().then(() => {
			sendResponse({
				payload: AGGRESSION
			}, ()=>{});
		})
		return true;

	} else if (request.message === "get_chn") {
		print("Getting chn")
		getChance().then(() => {
			sendResponse({
				payload: CHANCE
			}, ()=>{});
		})
		return true;

	} else if (request.message === "get_brd") {
		print("Getting brd")
		getBoredom().then(() => {
			sendResponse({
				payload: BOREDOM
			}, ()=>{});
		})
		return true;

	} else if (request.message === "get_act") {
		print("Getting act")
		getActivated().then((val) =>
			sendResponse({
				message: "hellow",
				payload: val
			}, ()=>{})
		)
		return true;

	} else if (request.message === "get_lng") {
		if (LANG_DATA !== null) {
			print("sending langname")
			sendResponse({
				payload: LANG_DATA[0]
			}, ()=>{});
		} else {
			getLangData().then(() => {
				let pyld = null;
				if (LANG_DATA !== null) {
					pyld = LANG_DATA[0];
				}
				print("Sending lang (else)")
				sendResponse({
					payload: pyld
				}, ()=>{});
				return 1;
			})
			return true;
		}

	} else if (request.message === "set_act") {
		ACTIVATED = !ACTIVATED;
		chrome.storage.sync.set({ACTIVE_STORAGE_TAG:ACTIVATED}, ()=>{
			if (ACTIVATED){
				sendmessage({message:"activate"})
			} else {
				sendmessage({message:"deactivate"})
			}
			sendResponse({payload:"200"});
		} )
		return true;

	} else if (request.message === "set_lng") {
		LANG_DATA = [];
		LANG_DATA.push(request.payload);
		LANG = request.payload;
		chrome.storage.sync.set({LANG_STORAGE_TAG:LANG}, ()=>{
			loadForeign().then(() => {
				sendmessage({message:"changed"});
			});
		});
		sendResponse({payload:"200"});
		return true;

	} else if (request.message === "set_agr") {
		AGGRESSION = request.payload;
		print("Received from set_agr: ")
		print(request)
		print(request.payload)
		SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
		chrome.storage.sync.set({AGGRO_STORAGE_TAG:AGGRESSION}, ()=>{
			sendmessage({message:"changed"});
		});
		sendResponse({payload:AGGRESSION});
		return true;

	} else if (request.message === "set_chn") {
		CHANCE = request.payload;
		SCALED_CHANCE = CHANCE / 100.0;
		print("Received from set_chn: ")
		print(request)
		print(request.payload)
		chrome.storage.sync.set({CHANCE_STORAGE_TAG:CHANCE}, ()=>{
			sendmessage({message:"changed"});
		});
		sendResponse({payload:"200"});
		return true;

	} else if (request.message === "set_brd") {
		BOREDOM = request.payload;
		SCALED_BOREDOM = aggressionToIdx(BOREDOM);
		print("Received from set_brd: ")
		print(request)
		print(request.payload)
		chrome.storage.sync.set({BOREDOM_STORAGE_TAG:BOREDOM}, ()=>{
			sendmessage({message:"changed"});
		});
		sendResponse({payload:BOREDOM});
		return true;

	} else if (request.message === "frc_run") {
		print("Sending force run")
		sendmessage({message:"changed"})
		return true;

	}

});


function sendmessage(messagedict) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, messagedict, function (response){	});
	});
}

/*
Gets from mem or chrome storage Aggression and Scaled aggression.
Returns [Aggression, Scaled Aggression]
 */
function getAggression() {
	if (AGGRESSION === null) {
		print("Getting Aggression chef from storage")
		return chrome.storage.sync.get([AGGRO_STORAGE_TAG]).then((result) => {
			AGGRESSION = result.AGGRO_STORAGE_TAG;
			if (!AGGRESSION) {
				AGGRESSION = 5;
			}
			SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
			print("got scaled aggro " + SCALED_AGGRESSION )
			return AGGRESSION;
		});
	} else {
		print("Aggressions exists: "+AGGRESSION)
		return Promise.resolve(AGGRESSION);
	}

}

function getChance() {
	if (CHANCE === null) {
		print("Getting chance from storage")
		return chrome.storage.sync.get([CHANCE_STORAGE_TAG]).then((result) => {
			CHANCE = result.CHANCE_STORAGE_TAG;
			if (!CHANCE) {
				CHANCE = 20;
			}
			SCALED_CHANCE = CHANCE / 100.0;
			return CHANCE;
		})
	} else {
		print("CHANCE exists already returning "+ CHANCE);
		return Promise.resolve(CHANCE);
	}
}

function getBoredom() {
	if (BOREDOM === null) {
		print("Getting boredom from storage")
		return chrome.storage.sync.get([BOREDOM_STORAGE_TAG]).then((result) => {
			BOREDOM = result.BOREDOM_STORAGE_TAG;
			if (!BOREDOM) {
				BOREDOM = 0;
			}
			SCALED_BOREDOM = aggressionToIdx(BOREDOM);
			return BOREDOM;
		})
	} else {
		print("BOREDOM exists already returning "+ BOREDOM);
		return Promise.resolve(BOREDOM);
	}
}

/*
Gets from mem or chrome storage a promise of an array with language data
[LANG, VOCAB, TABLES], respectively.
 */
function getLangData() {
	if (LANG_DATA === null) {
		return loadLangData();
	} else{
		return Promise.resolve(LANG_DATA);
	}
}

/*
Gets English map from memory or chrome storage, as promise, should be of form {word:info}.
 */
function getEnglish() {
	if (ENGLISH === null) {
		return loadEnglish();
	} else {
		return Promise.resolve(ENGLISH);
	}
}

//function setvocabvar(LANG_DATA, vlist){
//	LANG_DATA.set('vocab', vlist);
//}
function loadLangData() {
	LANG_DATA = [];

	return chrome.storage.sync.get([LANG_STORAGE_TAG])
		.then((lang) => {
			if (lang.LANG_STORAGE_TAG === "none") {
				return Promise.resolve("Nothing set, language not defined. Null error basically. ");
			} else {
				LANG_DATA.push(lang.LANG_STORAGE_TAG);
				return loadForeign();
			}
		});

}


function loadForeign(){
	let lang = LANG_DATA[0];
	if (!lang) {
		return Promise.resolve(null);
	}
	print("In loadforeign, getting "+lang);
	let fileloc = chrome.runtime.getURL("../updated_language_packs/" + capitalize(lang) + ".txt");
	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((vlist) => {
			LANG_DATA.push(vlist);
			return vlist
		})
		.then((vlist) => {
			FOREIGN = vlist;
			print("This is foreign")
			return vlist;
		})
}


/*
Split filetext by line, and each line by tabs.
Returns list of lists.
 */
function prepareVocab(filetxt){
	let ret =  filetxt.split("\n");
	ret = ret.map((x) => x.split("#"));
	ret = ret.map((x) => {
		if (x.length < 2) {
			return [null, null]
		}
		return [x[0], x[1]]
	})
	return ret;
}

function loadEnglish(){
	const fileloc = chrome.runtime.getURL("../updated_language_packs/eng_todo.txt");
	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => text.split("\n"))
		.then((filelines) => {
			ENGLISH = new Map();
			let line;
			for (let i = 0; i < filelines.length; i++){
				line = filelines[i];
				// if line.length < 2, that means it's an 'ERROR' or an '--'
				if (!line) {
					continue
				}
				ENGLISH.set(line, i);
			}
			print("English set");
		});
}

/*
replaceNodeVocab(nodetext)
takes in a single block of text (string), cleans it, looks for vocab words, replaces vocab words.
Returns string.
Calls:
* in_working()
* formatTranslateWord()
* Changing this to only translate a word once per node
 */
function replaceNodeVocab(node, idint){
	//if (node.contains("<a "))
	SEEN.clear();
	if (!node.trim()){
		return [node, idint]
	}
	const words = node.split(' ');
	const newwords = [];
	let word = null;
	for (let i=0; i< words.length; i++){
		word = words[i].toString();
		if (word.length > 40) { // || (word.length > 1 && word === word.toUpperCase())
			continue
		}
		let replacementword = word;
		if (Math.random() < SCALED_CHANCE) {
			const upper = word.charAt(0) === word.charAt(0).toUpperCase();
			let cleanword = word.toLowerCase(); //.replace(/[^a-z]/gi, '');
			if (cleanword.length > 0 && in_working(cleanword) && !SEEN.has(cleanword)) {
				replacementword = formatTranslateWord(cleanword, idint, upper);
				SEEN.add(cleanword);
				idint += 1;
			}
		}
		newwords.push(replacementword);
	}
	return [newwords.join(" "), idint]
}

function in_working(word) {
	return ENGLISH.has(word) &&
		SCALED_BOREDOM < ENGLISH.get(word) &&
		ENGLISH.get(word) < SCALED_AGGRESSION;
}

function subpar_word(fwordlst) {
	fwordlst = fwordlst.split(' ')
	fwordlst.push('')
	const r = Math.floor(Math.random() * fwordlst.length)
	if (!fwordlst[r]){
		return ''
	}
	return fwordlst[r] + "<sub style=\"font-weight:normal\">(?)</sub>"
}

function formatTranslateWord(englishword, idint, upper){
	const englishidx = ENGLISH.get(englishword);
	const fwordlst = FOREIGN[englishidx];
	if (!fwordlst[1]){
		return englishword
	}
	let foreignword = fwordlst[0] === "--" ? subpar_word(fwordlst[1], englishword) : fwordlst[0];
	let foreignlist = fwordlst[1];
	if (upper){
		foreignword = capitalize(foreignword);
	}
	foreignword = word_html_replacement(foreignword, englishword, idint, {"nvoc":foreignlist, "nvi":1, "cpt":(upper ? 'y': 'n')});
	return foreignword;
}

const word_html_replacement = function (translated, original, idnum, datadict={}) {
	const mydata = Array.from(Object.entries(datadict), ([name, value]) => {
		return ("data-" + name + "=\"" + value + "\"");
	}).join(' ');

	const toret = "<em><strong>" + "<span class=\"a\" "+mydata+" id='Nos"+idnum+"Voc' title='"+ original +"'>" + translated + "</span>" +
		"<span class=\"b\" id='Nos"+idnum+"VocW'>" + "</span></strong></em>";
	return toret;
};

function aggressionToIdx(aggro){
	const percent = Number(aggro) / 100;
	// hardcoding ENGLISH.size in as 4372 to avoid bug where english isnt loaded.
	// warp the scaling to include fewer common words, but more less common words.
	return ((4372 * (percent * percent)));
}

function getActivated() {
	if (ACTIVATED === null) {
		return chrome.storage.sync.get([ACTIVE_STORAGE_TAG]).then((response) => {
			ACTIVATED = response.ACTIVE_STORAGE_TAG;
			return ACTIVATED;
		});
	}
	return Promise.resolve(ACTIVATED);
}


function capitalize(word){
	if (!word){
		return
	}
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function print(s) {
	if (DEBUG) {
		console.log(s);
	}
}