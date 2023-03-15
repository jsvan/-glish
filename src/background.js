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
let GOGOWORDS = null;
let GOGOWORDS_TEXTBLOCK = null;
let WORKING_URL = null;
let BOLD = null;
let DISTHINT = null;
let ONLYRUN = null;
let GAME = null;
let XLETTER = null;
let ITALIC = null;
let RIGHTTOLEFT = null;
const ONLYRUN_STORAGE_TAG = "ONLYRUN_STORAGE_TAG";
const AGGRO_STORAGE_TAG = "AGGRO_STORAGE_TAG";
const CHANCE_STORAGE_TAG = "CHANCE_STORAGE_TAG";
const BOREDOM_STORAGE_TAG = "BOREDOM_STORAGE_TAG";
const ACTIVE_STORAGE_TAG = 'ACTIVE_STORAGE_TAG';
const LANG_STORAGE_TAG = 'LANG_STORAGE_TAG';
const BOLD_STORAGE = "BOLD_STORAGE";
const ITALIC_STORAGE = "ITALIC_STORAGE";
const NONOWORDS_STORAGE = "NONOWORDS_STORAGE";
const GOGOWORDS_STORAGE = "GOGOWORDS_STORAGE";
const NOGOZONES_STORAGE = "NOGOZONES_STORAGE";
const GAME_STORAGE = "GAME_STORAGE";
const XLT_STORAGE = "XLT_STORAGE";
const HNT_STORAGE = "HNT_STORAGE";
const SKIP_PROPER_STORAGE = "SKIP_PROPER_STORAGE";
const RIGHT_TO_LEFT_STORAGE = "RIGHT_TO_LEFT_STORAGE";
const SEEN = new Set();


chrome.runtime.onInstalled.addListener(function (rsn) {
	chrome.storage.sync.set({ACTIVE_STORAGE_TAG:true}, () => {});
	chrome.storage.sync.set({AGGRO_STORAGE_TAG:24},   () => {});
	chrome.storage.sync.set({CHANCE_STORAGE_TAG:20}, () => {});
	chrome.storage.sync.set({BOREDOM_STORAGE_TAG:6}, () => {});
	chrome.storage.sync.set({LANG_STORAGE_TAG:null}, () => {});
	chrome.storage.sync.set({NOGOZONES_STORAGE:[]}, () => {});
	chrome.storage.sync.set({NONOWORDS_STORAGE:[]}, () => {});
	chrome.storage.sync.set({GOGOWORDS_STORAGE:[]}, () => {});
	chrome.storage.sync.set({BOLD_STORAGE:true}, 	() => {});
	chrome.storage.sync.set({ITALIC_STORAGE:true}, () => {});
	chrome.storage.sync.set({GAME_STORAGE:false}, () => {});
	chrome.storage.sync.set({XLT_STORAGE:false}, () => {});
	chrome.storage.sync.set({HNT_STORAGE:true}, () => {});
	chrome.storage.sync.set({SKIP_PROPER_STORAGE:false}, ()=>{});
	chrome.storage.sync.set({RIGHT_TO_LEFT_STORAGE:false}, ()=>{});
	chrome.storage.sync.set({ONLYRUN_STORAGE_TAG:false}, ()=>{});


	if (chrome.runtime.OnInstalledReason.INSTALL === rsn.reason) {
		chrome.tabs.create({'url':"src/popup.html", 'active':true}, ()=>{})
	}
});

chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	print("Background received message, "+request + ", "+ request.message)
	switch(request.message) {
		case "hardrun":
			sendmessage({message: "hardrun"});
			return 1;
		case "translate":
			print("Preparing translation:")


			getEverything().then(() => {
				getAuthorized().then((authorized) => {
					print("Authorized? " + authorized)
					const chunks_to_translate = request.payload;
					let translated_chunks;

					if (!authorized) {
						translated_chunks = chunks_to_translate;
					} else {
						print("preparing translation: Got Lang data")
						if (!FOREIGN) {
							return 0;
						}
						translated_chunks = [];
						print("chunks")
						let idint = 0;
						let newstring = null;
						for (let i = 0; i < chunks_to_translate.length; i++) {
							[newstring, idint] = replaceNodeVocab(chunks_to_translate[i], idint);
							translated_chunks.push(newstring);
						}
						print("BACKGROUND sending translated response")
						//print(translated_chunks)
						print("Lang Data is: " + LANG_DATA[0])

					}
					sendResponse({
						payload: translated_chunks,
						language: capitalize(LANG_DATA[0]),
						glishbold: BOLD,
						glishitalic: ITALIC
					}, () => {
					});
					return 1;
				})
			})
			return true;

		case "valid_website":
			getAuthorized().then((go)=>{
				print("Authorized? " + go)
				const access = go ? "go" : "stop";
				sendResponse({
					payload: access,
					url:WORKING_URL
				}, () => {});
			})
			return true;

		case "get_agr":
			print("getting agr")
			getAggression().then(() => {
				sendResponse({
					payload: AGGRESSION
				}, () => {
				});
			})
			return true;

		case "get_chn":
			print("Getting chn")
			getChance().then(() => {
				sendResponse({
					payload: CHANCE
				}, () => {
				});
			})
			return true;

		case "get_onlyrun":
			getOnlyRun().then(() => {
				sendResponse({
					payload: ONLYRUN
				}, () => {
				});
			})
			return true;

		case "get_brd":
			print("Getting brd")
			getBoredom().then(() => {
				sendResponse({
					payload: BOREDOM
				}, () => {
				});
			})
			return true;

		case "get_act":
			print("Getting act")
			getActivated().then((val) =>
				sendResponse({
					message: "hellow",
					payload: val
				}, () => {
				})
			)
			return true;
		case "get_sty":
			print("Getting sty")
			getBold().then(() =>
				getItalic().then(() =>
					sendResponse({
						glishbold: BOLD,
						glishitalic: ITALIC
					}, () => {
					})
				)
			)
			return true;
		case "get_prp":
			print("Getting prp")
			getProper().then(() =>
				sendResponse({
					skipproper: SKIP_PROPER
				}, () => {
				})
			)
			return true;
		case "get_txs":
			Promise.all([getNogozones(), getNonowords(), getGogowords()]).then(() => {
					print("GOGOWORDS TEXT IS ")
					print(GOGOWORDS_TEXTBLOCK)
					sendResponse({
						nonowords: Array.from(NONOWORDS),
						gogowords: GOGOWORDS_TEXTBLOCK,
						nogozones: NOGOZONES
					}, () => {
					})
					return 1;
				}
			)
			return true;

		case "get_xlt":
			getXLetter().then(() => sendResponse({payload:XLETTER}), () => {})
			return true;
		case "get_gme":
			getGame().then(() => sendResponse({payload:GAME}), () => {})
			return true;
		case "get_r2l":
			getRightToLeft().then(() => sendResponse({payload:RIGHTTOLEFT}), () => {})
			return true;
		case "get_hnt":
			getDistHint().then(() => sendResponse({payload:DISTHINT}), () => {})
			return true;
		case "get_lng":
			getLangData().then(() => {
				print("Sending lang")
				sendResponse({
					payload: LANG
				}, () => {
				});
				return 1;
			})

			return true;
		case "set_act":
			ACTIVATED = !ACTIVATED;
			chrome.storage.sync.set({ACTIVE_STORAGE_TAG: ACTIVATED}, () => {

				if (ACTIVATED) {
					sendmessage({message: "activate"})
				} else {
					sendmessage({message: "deactivate"})
				}
				sendResponse({payload: "200"});
			})
			return true;
		case "set_onlyrun":
			ONLYRUN = !ONLYRUN;
			print("ONLYRUN : " + ONLYRUN)
			chrome.storage.sync.set({ONLYRUN_STORAGE_TAG: ONLYRUN}, () => {
				getAuthorized().then((go) => {
					print("Authorized? " + go)
					sendmessage({message: go? "activate": "deactivate"},	()=>{console.log("Sending callback"); sendmessage({message: "changed"});})
					sendResponse({payload: ONLYRUN});
					return true;
				})

			})
			return true;

		case "set_lng":
			LANG_DATA = [];
			LANG_DATA.push(request.payload);
			LANG = request.payload;
			chrome.storage.sync.set({LANG_STORAGE_TAG: LANG}, () => {
				loadForeign().then(() => {
					sendmessage({message: "changed"});
				});
			});
			sendResponse({payload: "200"});
			return true;

		case "set_agr":
			AGGRESSION = request.payload;
			print("Received from set_agr: ")
			print(request)
			print(request.payload)
			SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
			chrome.storage.sync.set({AGGRO_STORAGE_TAG: AGGRESSION}, () => {
				sendmessage({message: "changed"});
			});
			sendResponse({payload: AGGRESSION});
			return true;

		case "set_chn":
			CHANCE = request.payload;
			SCALED_CHANCE = CHANCE / 100.0;
			print("Received from set_chn: ")
			print(request)
			print(request.payload)
			chrome.storage.sync.set({CHANCE_STORAGE_TAG: CHANCE}, () => {
				sendmessage({message: "changed"});
			});
			sendResponse({payload: "200"});
			return true;

		case "set_brd":
			BOREDOM = request.payload;
			SCALED_BOREDOM = aggressionToIdx(BOREDOM);
			print("Received from set_brd: ")
			print(request)
			print(request.payload)
			chrome.storage.sync.set({BOREDOM_STORAGE_TAG: BOREDOM}, () => {
				sendmessage({message: "changed"});
			});
			sendResponse({payload: BOREDOM});
			return true;
		case  "set_bld":
			getItalic().then(() =>
				getBold().then(() => {
					BOLD = !BOLD
					chrome.storage.sync.set({BOLD_STORAGE: BOLD}, () => {
						sendmessage({message: "style", glishbold: BOLD, glishitalic: ITALIC})
						sendResponse({payload: "200"});
					})
					return true;
				})
			)
			return true;
		case  "set_itl":
			getBold().then(() =>
				getItalic().then(() => {
					ITALIC = !ITALIC;
					chrome.storage.sync.set({ITALIC_STORAGE: ITALIC}, () => {
						sendmessage({message: "style", glishbold: BOLD, glishitalic: ITALIC})
						sendResponse({payload: "200"});
					})
					return true;
				})
			)
			return true;
		case "set_gme":
			getGame().then(() => {
				GAME = !GAME;
				chrome.storage.sync.set({GAME_STORAGE: GAME}, () => {
					sendmessage({message: "game", game: GAME});
					sendResponse({payload: "200"});
				})
				return true;
			})
			return true;
		case "set_xlt":
			getXLetter().then(() => {
				XLETTER = !XLETTER;
				chrome.storage.sync.set({XLT_STORAGE: XLETTER}, () => {
					sendmessage({message: "xlt", xlt: XLETTER});
					sendResponse({payload: "200"});
				})
				return true;
			})
			return true;
		case "set_r2l":
			getRightToLeft().then(() => {
				RIGHTTOLEFT = !RIGHTTOLEFT;
				chrome.storage.sync.set({RIGHT_TO_LEFT_STORAGE: RIGHTTOLEFT}, () => {
					sendmessage({message: "r2l", r2l: RIGHTTOLEFT});
					sendResponse({payload: "200"});
				})
				return true;
			})
			return true;
		case "set_prp":
			getProper().then(() => {
				SKIP_PROPER = !SKIP_PROPER;
				chrome.storage.sync.set({SKIP_PROPER_STORAGE: SKIP_PROPER}, () => {
					sendmessage({message: "changed"});
					sendResponse({payload: "200"});
				})
				return true;
			})
			return true;
		case "set_hnt":
			getDistHint().then(() => {
				DISTHINT = !DISTHINT;
				chrome.storage.sync.set({HNT_STORAGE: DISTHINT}, () => {
					sendmessage({message: "hnt", hnt:DISTHINT});
					sendResponse({payload: "200"});
				})
				return true;
			})
			return true;
		case  "set_nonowords":
			let nonowords_list = request.payload;
			NONOWORDS = new Set(nonowords_list);
			chrome.storage.sync.set({NONOWORDS_STORAGE: nonowords_list}, () => {
				sendmessage({message: "changed"});
				sendResponse({payload: "200"});
			})
			return true;
		case  "set_nogozones":
			NOGOZONES = request.payload;

				chrome.storage.sync.set({NOGOZONES_STORAGE: NOGOZONES}, () => {
					getAuthorized().then((go) => {
						print("Authorized? " + go)
						sendmessage({message: go? "activate": "deactivate"})
						sendResponse({payload: "200"});
						return true;
					})
				})




			return true;
		case  "set_gogowords":
			let gogowords_list = request.payload;
			GOGOWORDS = processGogowords(gogowords_list);
			chrome.storage.sync.set({GOGOWORDS_STORAGE: gogowords_list}, () => {
				sendmessage({message: "changed"});
				sendResponse({payload: "200"});
			})
			return true;
	}

});


function sendmessage(messagedict, callback=()=>{}) {
	return chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		return chrome.tabs.sendMessage(tabs[0].id, messagedict, function (response){ callback(response)	});
	});
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

		let [bestwords, wordlist] = x;

		//if the language writes "backwards", then these built strings are swapped...
		if (bestwords.length > wordlist.length){
			[bestwords, wordlist] = [wordlist, bestwords]
		}
		//wordlist is a string, with $ separated words. So if $ is not in it, it is just one word.
		if (bestwords === '--' && !wordlist.includes('$')) {
			bestwords = wordlist;
		}

		return [bestwords, x[1]]
	})
	return ret;
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
	return GOGOWORDS.has(word) || (ENGLISH.has(word) &&
		SCALED_BOREDOM < ENGLISH.get(word) &&
		ENGLISH.get(word) < SCALED_AGGRESSION);
}

function random_word_choice(fwordlst) {
	fwordlst = fwordlst.split('$');
	let r = Math.floor(Math.random() * fwordlst.length)
	if (!fwordlst[r]){
		return ''
	}
	// if randomly chosen word also starts with '-' (ie, it sucks) find another word
	if (fwordlst[r].startsWith('-') || fwordlst[r].startsWith('…')) {
		for (r = 0; r < fwordlst.length - 1; r++){
			if (! (fwordlst[r].startsWith('-') || fwordlst[r].startsWith('…'))) {
				break;
			}
		}

	}
	return fwordlst[r];// + "<sub style=\"font-weight:normal\">(?)</sub>"
}

function formatTranslateWord(englishword, idint, upper){
	let fwordlst;
	if (GOGOWORDS.has(englishword)){
		fwordlst = GOGOWORDS.get(englishword);
	} else {
		const englishidx = ENGLISH.get(englishword);
		fwordlst = FOREIGN[englishidx];
	}

	if (!fwordlst[1]){
		return capitalize(englishword, upper);
	}
	let foreignword = fwordlst[0].startsWith("-") ? random_word_choice(fwordlst[1]) : random_word_choice(fwordlst[0]);
	if (!foreignword){
		return capitalize(englishword, upper);
	}
	let foreignlist = fwordlst[1];
	foreignword = capitalize(foreignword, upper);
	//add to foreignlist +"$"+englishword ?
	foreignword = word_html_replacement(foreignword, englishword, idint, {"eng":"n", "nvoc":foreignlist, "nvi":0, "cpt":(upper ? 'y': 'n')});
	return foreignword;
}

const word_html_replacement = function (translated, original, idnum, datadict={}) {
	const mydata = Array.from(Object.entries(datadict), ([name, value]) => {
		return ("data-" + name + "=\"" + value + "\"");
	}).join(' ');
	return "<span class=\"glishword\" "+mydata+" id='Nos"+idnum+"Voc' title='"+ original +"'>" + translated + "</span>";
};



function aggressionToIdx(aggro){
	const percent = Number(aggro) / 100;
	// hardcoding ENGLISH.size in as 4372 to avoid bug where english isnt loaded.
	// warp the scaling to include fewer common words, but more less common words.
	return ((4372 * (percent * percent)));
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

function getEverything() {
	// TODID: CHANGE ONE JSV
	return getEnglish().then(()=>
		getLangData().then(() =>
			Promise.all([
				getProper(),
				getNonowords(),
				getGogowords(),
				getChance(),
				getBoredom(),
				getAggression(),
				getBold(),
				getItalic(),
				getXLetter(),
				getGame(),
				getRightToLeft(),
				getDistHint(),
				getOnlyRun(),
				getActivated()
			])
		)
	);

	/*
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
	 */
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


function getGogowords() {
	if (GOGOWORDS === null) {
		return chrome.storage.sync.get([GOGOWORDS_STORAGE]).then((result) => {
			GOGOWORDS_TEXTBLOCK = result.GOGOWORDS_STORAGE;
			GOGOWORDS = processGogowords(GOGOWORDS_TEXTBLOCK);
			getLangData().then(()=>	{});
			return GOGOWORDS;
		})
	} else{
		getLangData().then(()=>	{});
		return Promise.resolve(GOGOWORDS);
	}
}
function processGogowords(textblock) {
	GOGOWORDS_TEXTBLOCK = textblock;
	if (!textblock || textblock.length < 1){
		return new Map();
	}
	let lines = textblock.map((line)=>{
		let [engword, foreign] = line.split(':').map((chunk)=>{return chunk.trim();})
		//split words on commas, remove whitespace,then put them back together with $
		let foreignwords = foreign.split(',').map((x) => {return x.trim()}).join('$');
		foreignwords = [foreignwords, foreignwords];
		return [engword, foreignwords]
	});
	// maps engword to list of foreignwords somehow

	return new Map(lines);
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
	LANG = LANG_DATA[0];
	if (!LANG) {
		return Promise.resolve(null);
	}
	print("In loadforeign, getting "+LANG);
	let fileloc = chrome.runtime.getURL("../updated_language_packs/" + capitalize(LANG) + ".txt");
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
Gets English map from memory or chrome storage, as promise, should be of form {word:info}.
 */
function getEnglish() {
	if (ENGLISH === null) {
		return loadEnglish();
	} else {
		return Promise.resolve(ENGLISH);
	}
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
function getXLetter(){
	if (XLETTER === null) {
		return chrome.storage.sync.get([XLT_STORAGE]).then((response) => {
			XLETTER = response.XLT_STORAGE;
			return XLETTER;
		});
	}
	return Promise.resolve(XLETTER);
}
function getRightToLeft(){
	if (RIGHTTOLEFT === null) {
		return chrome.storage.sync.get([RIGHT_TO_LEFT_STORAGE]).then((response) => {
			RIGHTTOLEFT = response.RIGHT_TO_LEFT_STORAGE;
			return RIGHTTOLEFT;
		});
	}
	return Promise.resolve(RIGHTTOLEFT);
}
function getGame(){
	if (GAME === null) {
		return chrome.storage.sync.get([GAME_STORAGE]).then((response) => {
			GAME = response.GAME_STORAGE;
			return GAME;
		});
	}
	return Promise.resolve(GAME);
}
function getDistHint() {
	if (DISTHINT === null) {
		return chrome.storage.sync.get([HNT_STORAGE]).then((response) => {
			DISTHINT = response.HNT_STORAGE;
			return DISTHINT;
		});
	}
	return Promise.resolve(DISTHINT);
}
function getOnlyRun() {
	if (ONLYRUN === null) {
		return chrome.storage.sync.get([ONLYRUN_STORAGE_TAG]).then((response) => {
			ONLYRUN = response.ONLYRUN_STORAGE_TAG;
			return ONLYRUN;
		});
	}
	return Promise.resolve(ONLYRUN);
}

function getAuthorized() {
	print("GET AUTHORIZED...")

	return chrome.tabs.query({active: true, lastFocusedWindow: true}).then((tabs) => {
		print("Got URL: ")
		print(tabs[0].url)
		WORKING_URL = tabs[0].url;

		return Promise.all([getActivated(), getNogozones(), getOnlyRun()]).then(() => {
			print("ONLYRUN in GetAuth : "+ ONLYRUN)
			print("ACTIVATED in GetAuth : "+ ACTIVATED)
			let access;
			if (!ACTIVATED || !WORKING_URL) {
				access = false;
				// if the app should only run on one of the given pages...
				print("retruning false bc not activated in getauth")
			} else if (ONLYRUN) {
				// then if a url is present in the page list, go
				access = NOGOZONES.some(suburl => WORKING_URL.includes(suburl));
				print("ONLYRUN, only run if in page, so returning "+ access)
			} else {

				access = !NOGOZONES.some(suburl => WORKING_URL.includes(suburl));
				print("NOT onlyrun, so running if NOT listed, so returning " + access)
			}
			return access;
		})

	})
}