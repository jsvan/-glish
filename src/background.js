/**
 *
 * The background maintains the state of the application.
 *
 * translate.js is the content script which sends requests to background for display information,
 * mainly, translate.js sends an array of english text, which background will appropriately translate and send back.
 *
 * If a setting is toggled within popup.html/js, popup.js sends that information to background, where background will save it,
 * and alert translate.js if their state is no longer valid.
 *
 * All roads lead through Rome.
 *
 * Unrelated:
 * If chrome extension page Error page is blank, insert this into console:
 * URL=class extends URL { constructor(href, ...rest) { super(href || 'dummy://', ...rest) } }
 */

const DEBUG = true;
let AGGRESSION = null;
let SCALED_AGGRESSION = 0;
let SKIP_PROPER = null;
let CHANCE = null;
let SCALED_CHANCE = null
let BOREDOM = null;
let SCALED_BOREDOM = null;
let LANG_DATA = null;
let ENGLISH = null;
let ACTIVATED = null;
let LANG = null;
let FOREIGN = null;
let NOGOZONES = null;
let NONOWORDS = null;
let WORKING_URL = null;
let BOLD = null;
let ITALIC = null;
const AGGRO_STORAGE_TAG = "AGGRO_STORAGE_TAG";
const CHANCE_STORAGE_TAG = "CHANCE_STORAGE_TAG";
const BOREDOM_STORAGE_TAG = "BOREDOM_STORAGE_TAG";
const ACTIVE_STORAGE_TAG = 'ACTIVE_STORAGE_TAG';
const LANG_STORAGE_TAG = 'LANG_STORAGE_TAG';
const BOLD_STORAGE = "BOLD_STORAGE";
const ITALIC_STORAGE = "ITALIC_STORAGE";
const NONOWORDS_STORAGE = "NONOWORDS_STORAGE";
const NOGOZONES_STORAGE = "NOGOZONES_STORAGE";
const SKIP_PROPER_STORAGE = "SKIP_PROPER_STORAGE"
const SEEN = new Set();



chrome.runtime.onInstalled.addListener(function (rsn) {
	ACTIVATED = true;
	chrome.storage.sync.set({ACTIVE_STORAGE_TAG:ACTIVATED}, () => {});
	chrome.storage.sync.set({AGGRO_STORAGE_TAG:24},   () => {});
	chrome.storage.sync.set({CHANCE_STORAGE_TAG:20}, () => {});
	chrome.storage.sync.set({BOREDOM_STORAGE_TAG:6}, () => {});
	chrome.storage.sync.set({LANG_STORAGE_TAG:null}, () => {});
	chrome.storage.sync.set({BOLD_STORAGE:true}, () => {});
	chrome.storage.sync.set({ITALIC_STORAGE:true}, () => {});
	chrome.storage.sync.set({NOGOZONES_STORAGE:[]}, () => {});
	chrome.storage.sync.set({NONOWORDS_STORAGE:[]}, () => {});
	chrome.storage.sync.set({SKIP_PROPER_STORAGE:false}, ()=>{})

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
				getEverything().then(()=>
					{
						print("preparing translation: Got Lang data")
						if (!FOREIGN) {
							return 0;
						}
						const chunks_to_translate = request.payload;
						print("chunks")
						print(chunks_to_translate)
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
						sendResponse({
							payload: translated_chunks,
							language: capitalize(LANG_DATA[0]),
							glishbold: BOLD,
							glishitalic: ITALIC
						}, ()=>{});
						return 1;
					}
				)
			}
			return 0;
		})
		return true;

	} else if (request.message === "valid_website") {
		chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs)=> {
			print("Callback!")
			WORKING_URL = tabs[0].url;
			getNogozones().then(() => {
				print(WORKING_URL + ", Nogozones: " + typeof NOGOZONES)
				print(NOGOZONES)
				const access = NOGOZONES.some(suburl=>WORKING_URL.includes(suburl)) ? "stop" : "go";
				sendResponse({
						payload: access},
					()=>{});
			})

		});

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
	}
	else if (request.message === "get_sty") {
		print("Getting sty")
		getBold().then(() =>
			getItalic().then(() =>
				sendResponse({
					glishbold: BOLD,
					glishitalic: ITALIC
				}, ()=>{})
			)
		)
		return true;
	}
	else if (request.message === "get_prp") {
		print("Getting prp")
		getProper().then(() =>
			sendResponse({
				skipproper:SKIP_PROPER
			}, ()=>{})
		)
		return true;
	}
	else if (request.message === "get_txs") {
		getNogozones().then(() =>
			getNonowords().then(() =>
				sendResponse({
					nonowords: Array.from(NONOWORDS),
					nogozones: NOGOZONES
				}, ()=>{})
			)
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

	}  else if (request.message === "set_lng") {
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
	}
	else if (request.message === "set_bld") {
		getItalic().then(() =>
			getBold().then(()=> {
				BOLD = !BOLD
				chrome.storage.sync.set({BOLD_STORAGE:BOLD}, ()=>{
					sendmessage({message:"style", glishbold:BOLD, glishitalic: ITALIC})
					sendResponse({payload:"200"});
				} )
				return true;
			})
		)

		return true;
	}
	else if (request.message === "set_itl") {
		getBold().then(() =>
			getItalic().then(()=> {
				ITALIC = !ITALIC;
				chrome.storage.sync.set({ITALIC_STORAGE: ITALIC}, () => {
					sendmessage({message: "style", glishbold: BOLD, glishitalic: ITALIC})
					sendResponse({payload: "200"});
				})
				return true;
			})
		)
		return true;
	}
	else if (request.message === "set_prp") {
		getProper().then(() => {
			SKIP_PROPER = !SKIP_PROPER;
			chrome.storage.sync.set({SKIP_PROPER_STORAGE: SKIP_PROPER}, () => {
				sendmessage({message: "changed"});
				sendResponse({payload: "200"});
			})
			return true;
		})
		return true;
	}
	else if (request.message === "set_nonowords") {
		let nonowords_list = request.payload;
		NONOWORDS = new Set(nonowords_list);
		chrome.storage.sync.set({NONOWORDS_STORAGE: nonowords_list}, ()=>{
			sendmessage({message:"changed"});
			sendResponse({payload:"200"});
		} )
		return true;
	}
	else if (request.message === "set_nogozones") {
		NOGOZONES = request.payload;
		chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs)=> {
			WORKING_URL = tabs[0].url;
			print("Has working url of "+WORKING_URL)
			chrome.storage.sync.set({NOGOZONES_STORAGE: NOGOZONES}, ()=>{
				if (WORKING_URL !== null) {
					if (NOGOZONES.some(suburl => WORKING_URL.includes(suburl))) {
						sendmessage({message: "deactivate"})
					} else {
						sendmessage({message: "activate"})
					}
				}
				sendResponse({payload:"200"});
			} )
		});
		return true;
	}
});


function sendmessage(messagedict) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, messagedict, function (response){	});
	});
}

function getEverything() {
	return getProper().then(() =>
		getNonowords().then(() =>
			getChance().then(() =>
				getBoredom().then(() =>
					getEnglish().then(() =>
						getLangData().then(() =>
							getAggression().then(()=>
								getBold().then(()=>
									getItalic()
								)
							)
						)
					)
				)
			)
		)
	);
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

function getNonowords() {
	if (NONOWORDS === null) {
		return chrome.storage.sync.get([NONOWORDS_STORAGE]).then((result) => {
			NONOWORDS = new Set(result.NONOWORDS_STORAGE);
			return NONOWORDS;
		})
	} else{
		return Promise.resolve(NONOWORDS);
	}
}

function getNogozones() {
	if (NOGOZONES === null) {
		return chrome.storage.sync.get([NOGOZONES_STORAGE]).then((result) => {
			NOGOZONES = result.NOGOZONES_STORAGE;
			if (!NOGOZONES) {
				NOGOZONES = [];
			}
			return NOGOZONES;
		})
	} else{
		return Promise.resolve(NOGOZONES);
	}
}


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
			print(FOREIGN)
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
		[bestword, wordlist] = x;
		//wordlist is a string, with $ separated words. So if $ is not in it, it is just one word.
		if (bestword === '--' && !wordlist.includes('$')) {
			bestword = wordlist;
		}

		return [bestword, x[1]]
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
				ENGLISH.set(line.toLowerCase(), i);
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
	SEEN.clear();
	if (!node.trim()){
		return [node, idint]
	}
	const words = node.split(' ');
	const newwords = [];
	let word = null;
	let prevwassentence = true, this_finishes_sentence = false;
	for (let i=0; i < words.length; i++){
		word = words[i].toString();
		let replacementword = word;

		if (word.length < 40 && Math.random() < SCALED_CHANCE) {
			const upper = word.charAt(0) === word.charAt(0).toUpperCase();
			let cleanword = word.toLowerCase();
			let finalchar = cleanword.charAt(cleanword.length - 1);

			if ([',', ':'].indexOf(finalchar) >= 0) {
				cleanword = cleanword.substring(0, cleanword.length - 1);
				this_finishes_sentence = false;
			} else if (['.', '!', '?'].indexOf(finalchar) >= 0) {
				cleanword = cleanword.substring(0, cleanword.length - 1);
				this_finishes_sentence = true;
			} else {
				this_finishes_sentence = false;
				finalchar = '';
			}
			// shit heuristic to skip Proper Nouns. Look for Capitalized things in the middle of a sentence and skip.
			// or if word is too long
			// or if word is entirely uppercased
			if (	(upper && !prevwassentence && SKIP_PROPER) ||
					(word.length > 1 && word === word.toUpperCase()) ) {

						// do nothing, because the logic is already messy enough without NOTing it.

 			} else {
				if (cleanword.length > 0 && !NONOWORDS.has(cleanword) && in_working(cleanword) && !SEEN.has(cleanword)) {
					replacementword = formatTranslateWord(cleanword, idint, upper);
					SEEN.add(cleanword);
					if (finalchar) {
						replacementword = replacementword + finalchar;
					}
					idint += 1;
				}
			}
			prevwassentence = this_finishes_sentence;
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
	fwordlst = fwordlst.split('$')
	let r = Math.floor(Math.random() * fwordlst.length)
	if (!fwordlst[r]){
		return ''
	}
	// if randomly chosen word also starts with '-' (ie, it sucks,
	if (fwordlst[r].startsWith('-')) {
		for (r = 0; r < fwordlst.length - 1; r++){
			if (! fwordlst[r].startsWith('-')) {
				break;
			}
		}

	}
	return fwordlst[r];// + "<sub style=\"font-weight:normal\">(?)</sub>"
}

function formatTranslateWord(englishword, idint, upper){
	const englishidx = ENGLISH.get(englishword);
	const fwordlst = FOREIGN[englishidx];
	if (!fwordlst[1]){
		return englishword
	}
	let foreignword = fwordlst[0].startsWith("-") ? subpar_word(fwordlst[1], englishword) : fwordlst[0];
	if (!foreignword){
		return capitalize(englishword, upper);
	}
	let foreignlist = fwordlst[1];
	foreignword = capitalize(foreignword, upper);
	foreignword = word_html_replacement(foreignword, englishword, idint, {"nvoc":foreignlist, "nvi":1, "cpt":(upper ? 'y': 'n')});
	return foreignword;
}

const word_html_replacement = function (translated, original, idnum, datadict={}) {
	const mydata = Array.from(Object.entries(datadict), ([name, value]) => {
		return ("data-" + name + "=\"" + value + "\"");
	}).join(' ');

	const toret = "<span class=\"glishword\" "+mydata+" id='Nos"+idnum+"Voc' title='"+ original +"'>" + translated + "</span>";
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
function getProper() {
	if (SKIP_PROPER === null) {
		return chrome.storage.sync.get([SKIP_PROPER_STORAGE]).then((response) => {
			SKIP_PROPER = response.SKIP_PROPER_STORAGE;
			return SKIP_PROPER;
		});
	}
	return Promise.resolve(SKIP_PROPER)
}
function getBold(){
	if (BOLD === null) {
		return chrome.storage.sync.get([BOLD_STORAGE]).then((response) => {
			BOLD = response.BOLD_STORAGE;
			return BOLD;
		});
	}
	return Promise.resolve(BOLD);
}
function getItalic(){
	if (ITALIC === null) {
		return chrome.storage.sync.get([ITALIC_STORAGE]).then((response) => {
			ITALIC = response.ITALIC_STORAGE;
			return ITALIC;
		});
	}
	return Promise.resolve(ITALIC);
}


function capitalize(word, upper=true){
	if (!word || !upper){
		return word;
	}
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function print(s) {
	if (DEBUG) {
		console.log(s);
	}
}