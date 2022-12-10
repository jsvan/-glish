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
let AGGRESSION  = 95;
let LANG_DATA = null;
let ENGLISH = null;
let CURRENT_SENDER = null;
let ACTIVATED = true;


chrome.runtime.onStartup.addListener(() => {
		console.log("on startup");
		set("aggression", AGGRESSION);
		set("lang", "german");
		set("activated", true);
	});

chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	console.log("received message " + request.message);
	CURRENT_SENDER = sender;
	if (request.message === "get_eng") {
		getEnglish().then(() => {
			console.log("sending english data")
			sendResponse({
				payload: ENGLISH,
				debug: "Sent some glish, ",
				size: ENGLISH.length
			});
		})
		return true;

	} else if (request.message === "get_fgn") {
		getLangData().then(() => {
			console.log("Sending complete data")
		}).then(() => {
			sendResponse({
				payload: LANG_DATA,
				size: LANG_DATA.size,
				debug: "Sent some fgn"
			});
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
		sendResponse({
			payload: getActivated(),
		});
	} else if (request.message === "get_lng") {
		if (LANG_DATA !== null) {
			console.log("sending langname")
			sendResponse({
				payload: LANG_DATA[0]
			});
		} else {
			getLangData().then(() => {
				console.log("Sending complete data")
			}).then(() => {
				let pyld = null;
				if (LANG_DATA !== null) {
					pyld = LANG_DATA[0];
				}
				sendResponse({
					payload: pyld
				});
			})
			return true;
		}

	} else if (request.message === "set_act") {
		ACTIVATED = !ACTIVATED;
		console.log("setting activated")
		set('activated', ACTIVATED);
		sendmessage({message:"set_act", payload:ACTIVATED})

	} else if (request.message === "set_lng") {
		LANG_DATA = [];
		LANG_DATA.push(request.payload);
		console.log("LANG+DATA should be reset with new lang in root: ["+LANG_DATA+"]")
		loadForeign().then(() => {
			console.log("sending new lang data")
			sendmessage({message: "set_lng", payload: LANG_DATA})
		});

	} else if (request.message === "set_agr") {
		AGGRESSION = request.payload;
		set('aggression', request.payload)
		console.log("setting aggression, sending agg to translate.js")
		sendmessage({message: "set_agr", payload: AGGRESSION});

	} else if (request.message === "frc_run") {
		sendmessage({message:"frc_run"});
	}

});

function set(key, value) {
	return chrome.storage.sync.set({key:value}, () => {
		console.log(key + " set to " + value);
	});
}

function sendmessage(messagedict) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, messagedict);
	});
}

function getAggression(){
	console.log("In getAggression()")
	if (AGGRESSION === null) {
		console.log("Aggression is null, getting from disk")
		return chrome.storage.sync.get({'aggression':AGGRESSION}, (aggro) => {
			console.log("Found on disk, aggression is now "+ aggro.aggression+ ": "+ aggro)
			AGGRESSION = aggro.aggression;
		});
	} else {
		console.log("Aggression already exists, returning cached " + AGGRESSION)
		return Promise.resolve(AGGRESSION);
	}

}

function getLangData() {
	// return {'foriegn': getstorage('foreign'), 'tables': getstorage('tables'), 'lang': getstorage('lang')}

	if (LANG_DATA === null) {
		console.log("Loading lang data, awaiting...")
		const toret = loadLangData();
		console.log("LoadLangData() has type: " + typeof toret + "|" + toret);
		return toret;

	} else{
		return Promise.resolve(LANG_DATA);
	}

}

function getEnglish() {
	if (ENGLISH === null) {
		console.log('background loading eng from file')
		return loadEnglish();

	} else {
		console.log('background sending eng from cache')
		return Promise.resolve(ENGLISH);
	}
}

//function setvocabvar(LANG_DATA, vlist){
//	LANG_DATA.set('vocab', vlist);
//}
function loadLangData() {
	LANG_DATA = [];

	return chrome.storage.sync.get({'lang': "german"})
		.then((lang) => {
			if (lang.lang === "none") {
				console.log("None lang found, not getting other info")
				return Promise.resolve("Nothing set, language not defined. Null error basically. ");
			} else {
				console.log("Setting lang " + lang.lang);
				LANG_DATA.push(lang.lang);
				//console.log("LANG_DATA set to " + LANG_DATA.get('lang') + ", should be " + lang.lang);
				return loadForeign().then(() => {
					console.log("Prepared lang data vocab: Proof in the keys:")
					console.log(LANG_DATA[0])
					console.log(LANG_DATA.length)
					console.log("Vocab length: " + LANG_DATA[1].length)
					//LANG_DATA = JSON.stringify(LANG_DATA);
				});

			}
		});

}

function loadForeign(){
	let lang = LANG_DATA[0];
	console.log("In loadforeign, getting "+lang);
	let fileloc = chrome.runtime.getURL("./languagepacks/" + lang + ".txt");

	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((vlist) => vlist.map(x => x[1]))
		//.then((vlist) => setvocabvar(LANG_DATA, vlist))
		.then((vlist) => LANG_DATA.push(vlist))
		.then(() => loadWikiTables());
}

function loadWikiTables(){
	console.log("Loading wiki tables")
	let lang = LANG_DATA[0];
	console.log("Loading wiki tables from " + lang)
	let fileloc = chrome.runtime.getURL("./languagepacks/wiki_verb_tables/" + lang + ".json");
	return fetch(fileloc)
		.then((response) => response.json())
		.then((json) => {console.log("Got tables!");  return json;})
		//.then((json) => LANG_DATA.set("tables", new Map(Object.entries(json))))
		.then((json) => LANG_DATA.push(json))

}

function prepareVocab(filetxt){
	//console.log("preparing vocab from txt:");
	//console.log(typeof filetxt);
	filetxt = filetxt.split("\n");
	filetxt = filetxt.map((x) => x.split("\t"));
	//console.log("Mapped prepareVocab, example:" + filetxt[0]);
	//console.log(filetxt[10]);

	return filetxt;
}

function loadEnglish(){
	const fileloc = chrome.runtime.getURL("./languagepacks/english3000.tsv");
	return fetch(fileloc)
		.then((response) => response.text())
		.then((text) => prepareVocab(text))
		.then((filetext) => {
			ENGLISH = filetext;
			console.log("English set");
		});
}

function getActivated() {
	return ACTIVATED;
}

function printmap(m) {
	console.log("PRINTING MAP");
	for (k in m.keys) {
		console.log('\t|' + k + '|' + m[k] + '|');
	}
}