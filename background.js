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
const SRIDX = 0;
const WORDIDX = 1;
const POSIDX = 2;
const LEVELIDX = 3;
let LANG = null;
let FOREIGN = null;
let WIKI_TABLES = null;
const AGGRO_STORAGE_TAG = "AGGRO_STORAGE_TAG";
const ACTIVE_STORAGE_TAG = 'ACTIVE_STORAGE_TAG';
const LANG_STORAGE_TAG = 'LANG_STORAGE_TAG';

console.log("START GET ALL KEYS")
chrome.storage.sync.get(null, function(items) {
	console.log(items)
	console.log(Object.keys(items));
	console.log(Object.values(items));
});
getEnglish()
	.then((result) =>
	getAggression()
		.then((results) => getLangData()
			.then(() => {}
		)
	)
)

chrome.runtime.onInstalled.addListener(function () {
	ACTIVATED = true;
	chrome.storage.sync.set({ACTIVE_STORAGE_TAG:ACTIVATED}, () => {});
	AGGRESSION = 5;
	chrome.storage.sync.set({AGGRO_STORAGE_TAG:AGGRESSION}, () => {});
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
							console.log("preparing translation: Got Lang data")

							const chunks_to_translate = request.payload;
							const translated_chunks = [];
							for (let i = 0; i < chunks_to_translate.length; i++) {
								translated_chunks.push(replaceNodeVocab(chunks_to_translate[i]));
							}
							console.log("BACKGROUND sending translated response")
							console.log(translated_chunks)
							sendResponse({payload: translated_chunks});
							return 1;
						})

					)
				)
			}
			return 1;
		})
		return true;

	} else if (request.message === "get_agr") {

		getAggression().then(() =>{

			console.log("Sending aggression, value of " + AGGRESSION)
		}).then(() => {
			sendResponse({
				payload: AGGRESSION
			});
		})
		return true;

	} else if (request.message === "get_act") {
		getActivated().then((val) => {
			console.log("BACKGROUND sending POPUP activation: "+ val)
			sendResponse({
				message: "hellow",
				payload: val
			});
		})
		return true;

	} else if (request.message === "get_lng") {
		if (LANG_DATA !== null) {
			console.log("sending langname")
			sendResponse({
				payload: LANG_DATA[0]
			});
		} else {
			getLangData().then(() => {
				console.log("Sending complete data")
				return 1;
			}).then(() => {
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
function getAggression(){
	if (AGGRESSION === null) {
		return chrome.storage.sync.get([AGGRO_STORAGE_TAG]).then((result) => {
			AGGRESSION = result.AGGRO_STORAGE_TAG;
			SCALED_AGGRESSION = aggressionToIdx(AGGRESSION);
			return AGGRESSION;
		});
	} else {
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
	let fileloc = chrome.runtime.getURL("./languagepacks/" + lang + ".txt");

	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((vlist) => vlist.map(x => x[1]))
		.then((vlist) => {
			LANG_DATA.push(vlist);
			return vlist
		})
		.then((vlist) => {
			FOREIGN = vlist;
			return vlist;
		})
		.then(() => loadWikiTables());
}

function loadWikiTables(){
	console.log("Loading wiki tables")
	let lang = LANG_DATA[0];
	console.log("Loading wiki tables from " + lang)
	let fileloc = chrome.runtime.getURL("./languagepacks/wiki_verb_tables/" + lang + ".json");
	return fetch(fileloc)
		.then((response) => response.json())
		.then((json) => {
			console.log("Got tables!");
			return json;})
		.then((json) => {
			LANG_DATA.push(json);
			return json;
		})
		.then((json) => WIKI_TABLES = new Map(Object.entries(json)));

}

/*
Split filetext by line, and each line by tabs.
Returns list of lists.

Tested: this works properly
 */
function prepareVocab(filetxt){
	let ret =  filetxt.split("\n");
	ret = ret.map((x) => x.split("\t"));
	return ret;
}


function loadEnglish(){
	const fileloc = chrome.runtime.getURL("./languagepacks/english3000.tsv");
	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((filelines) => {
			ENGLISH = new Map();
			let line;
			for (let i = 0; i < filelines.length; i++){
				line = filelines[i];
				ENGLISH.set(line[WORDIDX], line);
			}
			printmap(ENGLISH)
			console.log("English set");
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
	return "<em><strong><span class=\"a\" title='"+ original +"'>" + verb +
		"</span><span class=\"b\">" + get_wiki_table(verb) + "</span></strong></em>";
};

const word_html_replacement = function (word, original) {
	return "<em><span class=\"a\" title='"+ original +"'>"+ word + "</span></em>";
};

/*
replaceNodeVocab(nodetext)
takes in a single block of text (string), cleans it, looks for vocab words, replaces vocab words.
Returns string.
Calls:
* in_working()
* formatTranslateWord()

 */
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
		if (cleanword.length > 0 && in_working(cleanword)) {
			replacementword = formatTranslateWord(cleanword);
		}
		newwords.push(replacementword);
	}
	return newwords.join(" ")

}

function in_working(word) {
	return ENGLISH.has(word) && ENGLISH.get(word)[SRIDX] < SCALED_AGGRESSION;
}

function formatTranslateWord(englishword){
	const englishinfo = ENGLISH.get(englishword);
	let foreignword = FOREIGN[englishinfo[SRIDX]];
	if (WIKI_TABLES.has(foreignword)) {
		foreignword = verb_html_replacement(foreignword, englishword);
	} else {
		foreignword = word_html_replacement(foreignword, englishword);
	}
	return foreignword;
}

function aggressionToIdx(aggro){
	return ((ENGLISH.size * (Number(aggro)/100)) + 1);
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