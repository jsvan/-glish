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




/*
TODO:
write:

	listener:
	 1) for data change from POPUP for aggression, lang, activated
	 	1a) save locally and to disk
	 		1ai) aggression
	 		1aii) activated
	 		1aiii) lang
	 	1b) pull lang verbs from disk to local variable, save in dict(lang:verbs)
	 	1c) send data changes to content script (2)

	 2) for data request from content page
	 	2a) return [lang, tables, langpack] in one message dict
	 	2b) return english
	 	2c) return activate
	 	2d) return aggression

	on download:
	 1) set default params aggression, lang, and activate

	on load:
	 1) read aggression, [lang, tables, langpack], english, activate,
	 	--> if not None, send to content script

need methods:
	1) get lang OR from disk
	2) get aggro OR from disk
	3) get tables[lang] OR from disk
	4) get activate OR from disk
	5) get english OR from disk
	6) langpack OR from disk
 */
let AGGRESSION  = null;
let SCALED_AGGRESSION = 0;
let LANG_DATA = null;
let ENGLISH = null;
let ACTIVATED = null;
let LANG = null;
let FOREIGN = null;
const AGGRO_STORAGE_TAG = "AGGRO_STORAGE_TAG";
const ACTIVE_STORAGE_TAG = 'ACTIVE_STORAGE_TAG';
const LANG_STORAGE_TAG = 'LANG_STORAGE_TAG';
const SEEN = new Set();


chrome.runtime.onInstalled.addListener(function () {
	ACTIVATED = true;
	chrome.storage.sync.set({ACTIVE_STORAGE_TAG:ACTIVATED}, () => {});
	chrome.storage.sync.set({AGGRO_STORAGE_TAG:5}, () => {});
	chrome.storage.sync.set({LANG_STORAGE_TAG:null}, () => {});

})

chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	console.log("Background received message, "+request + ", "+ request.message)
	if (request.message === "translate") {
		console.log("Preparing translation:")
		getActivated().then(()=>{
			if (ACTIVATED) {
				getEnglish().then(() =>
					getLangData().then(() =>
						getAggression().then(()=> {
							console.log("Aggression is: " + AGGRESSION)
							console.log("preparing translation: Got Lang data")
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
							console.log("BACKGROUND sending translated response")
							//console.log(translated_chunks)
							console.log("Lang Data is: "+LANG_DATA[0])
							sendResponse({payload: translated_chunks, language: capitalize(LANG_DATA[0])});
							return 1;
						})
					)
				)
			}
			return 0;
		})
		return true;

	} else if (request.message === "get_agr") {

		getAggression().then(() => {
			sendResponse({
				payload: AGGRESSION
			});
		})
		return true;

	} else if (request.message === "get_act") {
		getActivated().then((val) =>
			sendResponse({
				message: "hellow",
				payload: val
			})
		)
		return true;

	} else if (request.message === "get_lng") {
		if (LANG_DATA !== null) {
			console.log("sending langname")
			sendResponse({
				payload: LANG_DATA[0]
			});
		} else {
			getLangData().then(() => {
				let pyld = null;
				if (LANG_DATA !== null) {
					pyld = LANG_DATA[0];
				}
				sendResponse({
					payload: pyld
				});
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
		} )


	} else if (request.message === "set_lng") {
		LANG_DATA = [];
		LANG_DATA.push(request.payload);
		LANG = request.payload;
		chrome.storage.sync.set({LANG_STORAGE_TAG:LANG}, ()=>{
			loadForeign().then(() => {
				sendmessage({message:"changed"});
			});
		});


	} else if (request.message === "set_agr") {
		AGGRESSION = request.payload;
		console.log("Received from set_agr: ")
		console.log(request)
		console.log(request.payload)
		SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
		chrome.storage.sync.set({AGGRO_STORAGE_TAG:AGGRESSION}, ()=>{
			sendmessage({message:"changed"});
		});
	} else if (request.message === "frc_run") {
		sendmessage({message:"changed"})
	}

});


function sendmessage(messagedict) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, messagedict, function (response){		});
	});
}

/*
Gets from mem or chrome storage Aggression and Scaled aggression.
Returns [Aggression, Scaled Aggression]
 */
function getAggression() {
	if (AGGRESSION === null) {
		console.log("Getting Aggression chef from storage")
		return chrome.storage.sync.get([AGGRO_STORAGE_TAG]).then((result) => {
			AGGRESSION = result.AGGRO_STORAGE_TAG;
			if (!AGGRESSION) {
				AGGRESSION = 5;
			}
			SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
			console.log("got scaled aggro " + SCALED_AGGRESSION )
			return AGGRESSION;
		});
	} else {
		console.log("Aggressions exists: "+AGGRESSION)
		return Promise.resolve(null);
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
	console.log("In loadforeign, getting "+lang);
	let fileloc = chrome.runtime.getURL("./updated_language_packs/" + capitalize(lang) + ".txt");
	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((vlist) => {
			LANG_DATA.push(vlist);
			console.log(vlist);
			return vlist
		})
		.then((vlist) => {
			FOREIGN = vlist;
			console.log(FOREIGN)
			console.log("This is foreign")
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
			return []
		}
		if (x[0] === '--') {
			return x[1].split(' ');
		}
		return [x[0]]
	})
	return ret;
}

function loadEnglish(){
	const fileloc = chrome.runtime.getURL("./updated_language_packs/eng_todo.txt");
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
			console.log("English set");
		});
}

const word_html_replacement = function (translated, original, idnum) {
	const toret = "<em><strong>" + "<span class=\"a\" id='Nos"+idnum+"Voc' title='"+ original +"'>" + translated + "</span>" +
				"<span class=\"b\" id='Nos"+idnum+"VocW'>" + "</span></strong></em>";
	return toret;
};

/*
replaceNodeVocab(nodetext)
takes in a single block of text (string), cleans it, looks for vocab words, replaces vocab words.
Returns string.
Calls:
* in_working()
* formatTranslateWord()
* Changing this to only translate a word once per node
 */
function replaceNodeVocab(nodetext, idint){
	SEEN.clear();
	let node = nodetext.trim()
	if (!node){
		return [nodetext, idint]
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
		const upper = word.charAt(0) === word.charAt(0).toUpperCase();
		let cleanword = word.toLowerCase(); //.replace(/[^a-z]/gi, '');
		if (cleanword.length > 0 && in_working(cleanword) && !SEEN.has(cleanword)) {
			replacementword = formatTranslateWord(cleanword, idint, upper);
			SEEN.add(cleanword);
			idint += 1;
		}
		newwords.push(replacementword);
	}
	return [newwords.join(" "), idint]
}

function in_working(word) {
	return ENGLISH.has(word) && ENGLISH.get(word) < SCALED_AGGRESSION;
}

function subpar_word(fwordlst) {
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
	if (!fwordlst){
		return englishword
	}
	let foreignword = fwordlst.length < 2 ? fwordlst[0] : subpar_word(fwordlst, englishword);
	if (!foreignword || foreignword === '--') {
		return englishword
	}
	if (upper){
		foreignword = capitalize(foreignword);
	}
	foreignword = word_html_replacement(foreignword, englishword, idint);
	return foreignword;
}

function aggressionToIdx(aggro){
	const percent = Number(aggro)/100;
	const ret = ((ENGLISH.size * (percent*percent)));
	console.log("From aggro "+ aggro+" to scalar percent^2 "+ percent*percent+", making a count of "+ ret+"/"+ENGLISH.size)
	return ret
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

function printmap(m) {
	console.log("PRINTING MAP");
	console.log("Size of map is "+ m.size);
	for (k in m.keys()) {
		console.log('\t|' + k + '|' + m[k] + '|');
	}
}

function capitalize(word){
	if (!word){
		return
	}
	return word.charAt(0).toUpperCase() + word.slice(1);
}